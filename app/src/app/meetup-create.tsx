import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { PhotoCropModal } from '@/components/photo-crop';
import { ImageViewerModal } from '@/components/image-viewer';
import { MeetupInvitation } from '@/components/meetup-invitation';
import { PhotoPager } from '@/components/photo-pager';
import { pickPhotos } from '@/components/photo-grid';
import { PlaceholderInput } from '@/components/placeholder-input';
import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AddressSearchModal } from '@/components/address-search-modal';
import { track } from '@/lib/analytics';
import { createMeetup, getMyMeetups, updateMeetup, type CreateMeetupInput, type Meetup } from '@/lib/meetups';
import { getMyProfile } from '@/lib/member';
import { uploadMeetupCover } from '@/lib/photo';

/**
 * 모임 열기 — 누구나 모임장이 될 수 있다.
 *
 * 숫자는 전부 휠로 고른다(타이핑보다 실수 없고, 값의 범위가 곧 가이드가 된다).
 * 참가비·나이·키 조건은 남/녀 기준이 다른 모임이 보통이라 성별별로 받는다.
 * 입금 확인과 자리 배분은 카카오에서 모임장이 직접 한다 — 우리는 돈을 만지지 않는다.
 *
 * 다 채우면 바로 저장하지 않고 초대장 미리보기를 먼저 보여준다(유저 결정 2026-08-25).
 * 신청자가 받을 초대장을 그대로 보고 나서 "이대로 열기"를 누르는 게 마지막 단계다.
 */

type WheelItem = { value: string; label: string };

/** 컴포넌트 밖에 둔다 — 렌더 중 호출로 오해받지 않게(react-hooks/purity). 이벤트에서만 부른다. */
function isPast(d: Date): boolean {
  return d.getTime() < Date.now();
}

const NONE: WheelItem = { value: '', label: '제한 없음' };

/** 커버 사진 장수 상한 · 표시 비율(목록/상세와 동일). */
const COVER_MAX = 5;
const COVER_ASPECT = 16 / 9;

/** 정원 — 소모임(2)부터 대형(50)까지. */
const CAPACITY_ITEMS: WheelItem[] = Array.from({ length: 49 }, (_, i) => {
  const n = String(i + 2);
  return { value: n, label: `${n}명` };
});

/** 참가비 — 1천 원 단위로 50만까지. */
const FEE_STEPS: number[] = Array.from({ length: 500 }, (_, i) => (i + 1) * 1000);
const FEE_ITEMS: WheelItem[] = FEE_STEPS.map((n) => ({ value: String(n), label: `${n.toLocaleString('ko-KR')}원` }));
/** 성별별 요금엔 "무료"도 있다 — 여성 무료 모임처럼. */
const FEE_ITEMS_WITH_FREE: WheelItem[] = [{ value: '0', label: '무료' }, ...FEE_ITEMS];

const AGE_ITEMS: WheelItem[] = [NONE, ...Array.from({ length: 42 }, (_, i) => {
  const n = String(i + 19);
  return { value: n, label: `${n}세` };
})];

const HEIGHT_ITEMS: WheelItem[] = [NONE, ...Array.from({ length: 61 }, (_, i) => {
  const n = String(i + 140);
  return { value: n, label: `${n}cm` };
})];

/** 숫자 고르기 공용 휠 — 트리거는 입력창처럼 보이고, 누르면 바텀시트 휠이 뜬다. */
function WheelField({
  value,
  placeholder,
  items,
  defaultValue,
  onChange,
  c,
}: {
  value: string;
  placeholder: string;
  items: WheelItem[];
  /** 미선택 상태에서 휠을 열 때 시작 위치. */
  defaultValue?: string;
  onChange: (value: string) => void;
  c: ThemeColors;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const selected = items.find((i) => i.value === value);

  function openSheet() {
    setDraft(value || defaultValue || items[0]!.value);
    setOpen(true);
  }

  return (
    <>
      <Pressable onPress={openSheet} style={[styles.input, styles.centerText, { backgroundColor: c.backgroundElement }]}>
        <Text style={{ color: selected ? c.text : c.textSecondary, fontSize: 16 }}>
          {selected ? selected.label : placeholder}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.background }]}>
          <View style={styles.sheetHead}>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={[styles.sheetBtn, { color: c.textSecondary }]}>취소</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
              hitSlop={10}
            >
              <Text style={[styles.sheetBtn, { color: c.primaryStrong }]}>완료</Text>
            </Pressable>
          </View>
          <Picker selectedValue={draft} onValueChange={setDraft} itemStyle={{ color: c.text }}>
            {items.map((item) => (
              <Picker.Item key={item.value || 'none'} label={item.label} value={item.value} />
            ))}
          </Picker>
        </View>
      </Modal>
    </>
  );
}

export default function MeetupCreateScreen() {
  const c = useTheme();
  const router = useRouter();
  // 수정 모드 — ?edit={meetupId}로 들어오면 기존 값을 채워 넣고 저장이 곧 수정이 된다.
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editId = edit ? String(edit) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetAt, setMeetAt] = useState<Date | null>(null);
  const [address, setAddress] = useState('');
  const [placeDetail, setPlaceDetail] = useState('');
  const [addressOpen, setAddressOpen] = useState(false);
  const [capacity, setCapacity] = useState('');
  const [coverUrls, setCoverUrls] = useState<string[]>([]);
  const [coverUploading, setCoverUploading] = useState(false);
  // 자르기를 기다리는 사진 줄 — 고른 순서대로 16:9 창을 거쳐 업로드된다.
  const [cropQueue, setCropQueue] = useState<string[]>([]);
  const [cropTotal, setCropTotal] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  /** 성별별로 참가비를 다르게 받는지 — 남 2만/여 무료 같은 모임이 흔하다. */
  const [feeByGender, setFeeByGender] = useState(false);
  const [fee, setFee] = useState('');
  const [feeFemaleInput, setFeeFemaleInput] = useState('');
  const [kakaoLink, setKakaoLink] = useState('');
  // 참가 조건 (선택) — 성별별 기준
  const [genderLimit, setGenderLimit] = useState<'MALE' | 'FEMALE' | null>(null);
  const [requireJobVerified, setRequireJobVerified] = useState(false);
  const [minAgeMale, setMinAgeMale] = useState('');
  const [maxAgeMale, setMaxAgeMale] = useState('');
  const [minHeightMale, setMinHeightMale] = useState('');
  const [minAgeFemale, setMinAgeFemale] = useState('');
  const [maxAgeFemale, setMaxAgeFemale] = useState('');
  const [minHeightFemale, setMinHeightFemale] = useState('');
  const [saving, setSaving] = useState(false);
  // 미리보기 — 신청자에게 보일 초대장 그대로. 여는 사람 자리에 내 닉네임을 넣기 위해 프로필을 한 번 읽는다.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hostNickname, setHostNickname] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // 수정 모드 — 내 모임에서 기존 값을 불러와 폼을 채운다.
  useEffect(() => {
    if (!editId) return;
    let active = true;
    getMyMeetups()
      .then((mine) => {
        const m = mine.find((x) => x.meetupId === editId);
        if (!active || !m) return;
        setTitle(m.title);
        setDescription(m.description ?? '');
        setMeetAt(new Date(m.meetAt));
        if (m.placeAddress) {
          setAddress(m.placeAddress);
          const detail = m.place.startsWith(m.placeAddress) ? m.place.slice(m.placeAddress.length).replace(/^ · /, '') : '';
          setPlaceDetail(detail);
        } else {
          // 주소 검색 도입 전 데이터 — 장소 전문을 주소 칸에 보여 다시 고르게 한다.
          setAddress(m.place);
        }
        setCapacity(String(m.capacity));
        const paid = m.fee > 0 || (m.feeFemale ?? 0) > 0;
        setIsPaid(paid);
        if (paid) {
          setFee(String(m.fee));
          if (m.feeFemale != null && m.feeFemale !== m.fee) {
            setFeeByGender(true);
            setFeeFemaleInput(String(m.feeFemale));
          }
        }
        setGenderLimit(m.genderLimit);
        setMinAgeMale(m.minAgeMale != null ? String(m.minAgeMale) : '');
        setMaxAgeMale(m.maxAgeMale != null ? String(m.maxAgeMale) : '');
        setMinHeightMale(m.minHeightMaleCm != null ? String(m.minHeightMaleCm) : '');
        setMinAgeFemale(m.minAgeFemale != null ? String(m.minAgeFemale) : '');
        setMaxAgeFemale(m.maxAgeFemale != null ? String(m.maxAgeFemale) : '');
        setMinHeightFemale(m.minHeightFemaleCm != null ? String(m.minHeightFemaleCm) : '');
        setRequireJobVerified(m.requireJobVerified);
        setCoverUrls(m.coverUrls);
        setKakaoLink(m.kakaoLink);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
     
  }, [editId]);

  // iOS 날짜 바텀시트 휠용
  const [pickerOpen, setPickerOpen] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState(new Date());

  const dateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const timeFmt = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' });

  /** 미선택 시 시작 위치 — 다음 주 토요일 저녁 7시 언저리. */
  function initialDate(): Date {
    if (meetAt) return meetAt;
    const d = new Date();
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    d.setHours(19, 0, 0, 0);
    return d;
  }

  function openPicker(mode: 'date' | 'time') {
    const base = initialDate();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode,
        minimumDate: mode === 'date' ? new Date() : undefined,
        onChange: (event, picked) => {
          if (event.type !== 'set' || !picked) return;
          const next = new Date(base);
          if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
          else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
          setMeetAt(next);
        },
      });
      return;
    }
    setDraft(base);
    setPickerOpen(mode);
  }

  function confirmPicker() {
    setMeetAt(new Date(draft));
    setPickerOpen(null);
  }

  /** 비활성 버튼은 이유를 말하지 않는다 — 항상 눌리게 두고, 빠진 것을 말로 알려준다. */
  function firstMissing(): string | null {
    if (title.trim().length === 0) return '모임 이름을 적어주세요.';
    if (meetAt == null) return '모임 날짜와 시간을 골라주세요.';
    if (address.trim().length === 0) return '주소 검색으로 모임 장소를 골라주세요.';
    if (capacity === '') return '정원을 골라주세요.';
    if (isPaid && !feeByGender && fee === '') return '참가비를 골라주세요.';
    if (isPaid && feeByGender && fee === '') return '남성 참가비를 골라주세요.';
    if (isPaid && feeByGender && feeFemaleInput === '') return '여성 참가비를 골라주세요.';
    if (minAgeMale !== '' && maxAgeMale !== '' && Number(minAgeMale) > Number(maxAgeMale)) return '남성 나이 범위가 뒤집혔어요.';
    if (minAgeFemale !== '' && maxAgeFemale !== '' && Number(minAgeFemale) > Number(maxAgeFemale)) return '여성 나이 범위가 뒤집혔어요.';
    if (normalizedLink() == null) {
      return kakaoLink.trim().length > 0
        ? '카카오 오픈채팅 링크가 올바르지 않아요. open.kakao.com 링크를 붙여넣어주세요.'
        : '카카오 오픈채팅 링크를 넣어주세요.';
    }
    return null;
  }

  /** https:// 없이 붙여넣는 게 보통이라 앞을 채워준다. 그래도 주소꼴이 아니면 null. */
  function normalizedLink(): string | null {
    let link = kakaoLink.trim();
    if (link.length === 0) return null;
    if (!/^https?:\/\//.test(link)) link = `https://${link}`;
    return /^https?:\/\/[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(link) ? link : null;
  }

  /** 성별 제한과 어긋나는 조건은 버린다 — 여성만 모임에 남성 조건이 실려 가지 않게. */
  const num = (v: string) => (v === '' ? null : Number(v));
  const maleAllowed = genderLimit !== 'FEMALE';
  const femaleAllowed = genderLimit !== 'MALE';

  /** 커버 사진 — 골라서 16:9로 자르면 즉시 업로드. 첫 장이 목록의 메인이 된다. */
  async function pickCover() {
    const picked = await pickPhotos(COVER_MAX - coverUrls.length);
    if (picked.length === 0) return;
    setCropTotal(picked.length);
    setCropQueue(picked);
  }

  /** 자르기 완료 한 장 — 업로드하고 다음 장으로. 선정성 검사에 걸리면 그 자리에서 알려준다. */
  async function onCropped(croppedUri: string) {
    setCropQueue((q) => q.slice(1));
    setCoverUploading(true);
    try {
      const url = await uploadMeetupCover(croppedUri);
      setCoverUrls((urls) => [...urls, url]);
    } catch (e) {
      Alert.alert('사진을 올리지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setCoverUploading(false);
    }
  }

  /** 빠진 칸·지난 시각을 알리고 false. 미리보기와 저장이 같은 검사를 쓴다. */
  function validate(): boolean {
    const missing = firstMissing();
    if (missing) {
      Alert.alert('조금만 더 채워주세요', missing);
      return false;
    }
    if (meetAt == null) return false;
    if (isPast(meetAt)) {
      Alert.alert('지난 시각이에요', '모임 일시를 다시 골라주세요.');
      return false;
    }
    return true;
  }

  function buildInput(): CreateMeetupInput {
    return {
      title: title.trim(),
      description: description.trim() || undefined,
      meetAt: meetAt!.toISOString(),
      place: placeDetail.trim() ? `${address.trim()} · ${placeDetail.trim()}` : address.trim(),
      placeUrl: null,
      placeAddress: address.trim(),
      capacity: Number(capacity),
      fee: isPaid ? Number(fee) : 0,
      feeFemale: isPaid && feeByGender && femaleAllowed ? Number(feeFemaleInput) : null,
      genderLimit,
      minAgeMale: maleAllowed ? num(minAgeMale) : null,
      maxAgeMale: maleAllowed ? num(maxAgeMale) : null,
      minAgeFemale: femaleAllowed ? num(minAgeFemale) : null,
      maxAgeFemale: femaleAllowed ? num(maxAgeFemale) : null,
      minHeightMaleCm: maleAllowed ? num(minHeightMale) : null,
      minHeightFemaleCm: femaleAllowed ? num(minHeightFemale) : null,
      requireJobVerified,
      emoji: null,
      color: null,
      coverUrls,
      kakaoLink: normalizedLink()!,
    };
  }

  /** 미리보기용 모임 — 서버가 채우는 값(확정 인원·상태·모임장)은 새 모임의 첫 순간처럼 둔다. */
  function previewMeetup(): Meetup {
    return {
      ...buildInput(),
      meetupId: editId ?? 'preview',
      description: description.trim() || null,
      status: 'OPEN',
      hostNickname,
      hostDoneCount: 0,
      confirmedCount: 0,
      myStatus: null,
      participants: [],
      hostAccountId: '',
      isMine: false,
    };
  }

  /** 마지막 단계 — 초대장을 먼저 보여주고, 거기서 "이대로 열기"를 눌러야 저장한다. */
  async function openPreview() {
    if (!validate()) return;
    if (hostNickname == null) {
      const me = await getMyProfile().catch(() => null);
      setHostNickname(me?.nickname ?? null);
    }
    setPreviewOpen(true);
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const input = buildInput();
    try {
      if (editId) {
        await updateMeetup(editId, input);
        Alert.alert('모임을 수정했어요', undefined, [{ text: '확인', onPress: () => router.back() }]);
      } else {
        await createMeetup(input);
        track('meetup_created');
        Alert.alert('모임을 열었어요', '신청이 들어오면 알림으로 알려드릴게요.\n입금 확인과 확정은 [모임 관리]에서 해요.', [
          { text: '확인', onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      Alert.alert(editId ? '수정하지 못했어요' : '모임을 열지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubScreen title={editId ? '모임 수정' : '모임 열기'} c={c} onSave={() => void openPreview()} saveLabel="미리보기" saving={saving}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 커버 사진(선택, 최대 5장) — 첫 장이 목록에 보이는 메인. 미리보기는 상세와 같은 페이저다. */}
        {coverUrls.length > 0 ? (
          <View style={[styles.coverPreview, { backgroundColor: c.backgroundElement }]}>
            <PhotoPager photos={coverUrls} aspectRatio={16 / 9} backgroundColor={c.backgroundElement} onPressImage={setViewerIndex} />
          </View>
        ) : (
          <Pressable
            onPress={pickCover}
            disabled={coverUploading}
            style={[styles.coverPreview, styles.coverEmpty, { backgroundColor: c.backgroundElement }]}
          >
            {coverUploading ? (
              <ActivityIndicator color={c.text} />
            ) : (
              <View style={styles.coverEmptyInner}>
                <Text style={[styles.coverEmptyText, { color: c.textSecondary }]}>커버 사진 올리기 (선택)</Text>
                <Text style={[styles.coverEmptyHint, { color: c.textSecondary }]}>목록에 보이는 그대로 잘라서 올려요</Text>
              </View>
            )}
          </Pressable>
        )}
        {(coverUrls.length > 0 || coverUploading) && (
          <View style={styles.coverThumbRow}>
            {coverUrls.map((url, i) => (
              <View key={url} style={styles.coverThumbWrap}>
                <Image source={{ uri: url }} style={[styles.coverThumb, i === 0 && { borderWidth: 2, borderColor: c.primary }]} contentFit="cover" />
                <Pressable
                  onPress={() => setCoverUrls((urls) => urls.filter((u) => u !== url))}
                  hitSlop={6}
                  style={[styles.coverThumbRemove, { backgroundColor: c.text }]}
                >
                  <Text style={[styles.coverThumbRemoveText, { color: c.background }]}>×</Text>
                </Pressable>
              </View>
            ))}
            {coverUploading && (
              <View style={[styles.coverThumb, styles.coverThumbLoading, { backgroundColor: c.backgroundElement }]}>
                <ActivityIndicator size="small" color={c.text} />
              </View>
            )}
            {coverUrls.length < COVER_MAX && !coverUploading && (
              <Pressable onPress={pickCover} style={[styles.coverThumb, styles.coverThumbAdd, { borderColor: c.border }]}>
                <Text style={[styles.coverThumbAddText, { color: c.textSecondary }]}>＋</Text>
              </Pressable>
            )}
            <Text style={[styles.coverMainHint, { color: c.textSecondary }]}>첫 장이 메인</Text>
          </View>
        )}

        <Field label="모임 이름" c={c}>
          <PlaceholderInput
            value={title}
            onChangeText={setTitle}
            placeholder="예) 성수동 보드게임 번개"
            placeholderTextColor={c.textSecondary}
            maxLength={80}
            style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
          />
        </Field>

        <Field label="모임 일시" c={c}>
          <View style={styles.row}>
            <Pressable
              onPress={() => openPicker('date')}
              style={[styles.input, styles.rowItem, styles.centerText, { backgroundColor: c.backgroundElement }]}
            >
              <Text style={{ color: meetAt ? c.text : c.textSecondary, fontSize: 16 }}>
                {meetAt ? dateFmt.format(meetAt) : '날짜 고르기'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openPicker('time')}
              style={[styles.input, styles.timeItem, styles.centerText, { backgroundColor: c.backgroundElement }]}
            >
              <Text style={{ color: meetAt ? c.text : c.textSecondary, fontSize: 16 }}>
                {meetAt ? timeFmt.format(meetAt) : '시간'}
              </Text>
            </Pressable>
          </View>
        </Field>

        <Field label="장소" c={c}>
          <Pressable
            onPress={() => setAddressOpen(true)}
            style={[styles.input, styles.centerText, { backgroundColor: c.backgroundElement }]}
          >
            <Text style={{ color: address ? c.text : c.textSecondary, fontSize: 16 }} numberOfLines={1}>
              {address || '주소 검색'}
            </Text>
          </Pressable>
        </Field>

        <Field label="상세 위치 (선택)" c={c} hint="주소로는 못 담는 위치 — 층·호수·가게 이름·만나는 지점을 적어주세요.">
          <PlaceholderInput
            value={placeDetail}
            onChangeText={setPlaceDetail}
            placeholder="예) 2층 카페 프롤로그, 3번 출구 앞"
            placeholderTextColor={c.textSecondary}
            maxLength={60}
            style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
          />
        </Field>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Field label="정원" c={c}>
              <WheelField
                value={capacity}
                placeholder="정원 고르기"
                items={CAPACITY_ITEMS}
                defaultValue="8"
                onChange={setCapacity}
                c={c}
              />
            </Field>
          </View>
          <View style={styles.rowItem}>
            <Field label="참가비" c={c}>
              <View style={[styles.segment, { backgroundColor: c.backgroundElement }]}>
                {([false, true] as const).map((paid) => (
                  <Pressable
                    key={String(paid)}
                    onPress={() => {
                      setIsPaid(paid);
                      if (!paid) {
                        setFee('');
                        setFeeFemaleInput('');
                        setFeeByGender(false);
                      }
                    }}
                    style={[styles.segmentItem, isPaid === paid && { backgroundColor: c.background }]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: isPaid === paid ? c.text : c.textSecondary },
                        isPaid === paid && styles.segmentTextActive,
                      ]}
                    >
                      {paid ? '유료' : '무료'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>
          </View>
        </View>

        {isPaid && (
          <>
            <Pressable onPress={() => setFeeByGender((v) => !v)} hitSlop={6} style={styles.checkRow}>
              <View
                style={[styles.checkbox, { borderColor: c.border }, feeByGender && { backgroundColor: c.primary, borderColor: c.primary }]}
              >
                {feeByGender && <Text style={[styles.checkboxMark, { color: c.primaryText }]}>✓</Text>}
              </View>
              <Text style={[styles.checkLabel, { color: c.text }]}>성별에 따라 다르게 받을게요</Text>
            </Pressable>

            {feeByGender ? (
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Field label="남성 참가비" c={c}>
                    <WheelField
                      value={fee}
                      placeholder="금액 고르기"
                      items={FEE_ITEMS_WITH_FREE}
                      defaultValue="20000"
                      onChange={setFee}
                      c={c}
                    />
                  </Field>
                </View>
                <View style={styles.rowItem}>
                  <Field label="여성 참가비" c={c}>
                    <WheelField
                      value={feeFemaleInput}
                      placeholder="금액 고르기"
                      items={FEE_ITEMS_WITH_FREE}
                      defaultValue="10000"
                      onChange={setFeeFemaleInput}
                      c={c}
                    />
                  </Field>
                </View>
              </View>
            ) : (
              <Field label="참가비 금액" c={c} hint="오픈채팅에서 모임장에게 직접 보내는 금액이에요.">
                <WheelField value={fee} placeholder="금액 고르기" items={FEE_ITEMS} defaultValue="10000" onChange={setFee} c={c} />
              </Field>
            )}

            {/* 결제 로드맵 사전 고지 — 지금은 계좌이체, 향후 앱 결제 전환(2026-08-24 결정). 미리 말해둬야 전환이 배신이 아니다. */}
            <Text style={[styles.feeNotice, { color: c.textSecondary }]}>
              지금은 참가비를 오픈채팅에서 직접 받아요. 앱에서 결제받고 자동으로 확정되는 방식을 준비하고 있어요.
            </Text>
          </>
        )}

        {/* 참가 조건 — 프로필(성별·나이·키)로 문 앞에서 걸러진다. 비워두면 제한 없음. */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>참가 조건 (선택)</Text>
        <Pressable onPress={() => setRequireJobVerified((v) => !v)} hitSlop={6} style={styles.checkRow}>
          <View
            style={[styles.checkbox, { borderColor: c.border }, requireJobVerified && { backgroundColor: c.primary, borderColor: c.primary }]}
          >
            {requireJobVerified && <Text style={[styles.checkboxMark, { color: c.primaryText }]}>✓</Text>}
          </View>
          <Text style={[styles.checkLabel, { color: c.text }]}>직장 인증한 사람만 받을게요</Text>
        </Pressable>
        <Field label="성별" c={c}>
          <View style={[styles.segment, { backgroundColor: c.backgroundElement }]}>
            {([
              [null, '모두'],
              ['MALE', '남성만'],
              ['FEMALE', '여성만'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={label}
                onPress={() => setGenderLimit(value)}
                style={[styles.segmentItem, genderLimit === value && { backgroundColor: c.background }]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: genderLimit === value ? c.text : c.textSecondary },
                    genderLimit === value && styles.segmentTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        {maleAllowed && (
          <>
            <Text style={[styles.condTitle, { color: c.textSecondary }]}>남성 조건</Text>
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Field label="나이 (최소)" c={c}>
                  <WheelField value={minAgeMale} placeholder="제한 없음" items={AGE_ITEMS} defaultValue="25" onChange={setMinAgeMale} c={c} />
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label="나이 (최대)" c={c}>
                  <WheelField value={maxAgeMale} placeholder="제한 없음" items={AGE_ITEMS} defaultValue="39" onChange={setMaxAgeMale} c={c} />
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label="최소 키" c={c}>
                  <WheelField
                    value={minHeightMale}
                    placeholder="제한 없음"
                    items={HEIGHT_ITEMS}
                    defaultValue="170"
                    onChange={setMinHeightMale}
                    c={c}
                  />
                </Field>
              </View>
            </View>
          </>
        )}

        {femaleAllowed && (
          <>
            <Text style={[styles.condTitle, { color: c.textSecondary }]}>여성 조건</Text>
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Field label="나이 (최소)" c={c}>
                  <WheelField
                    value={minAgeFemale}
                    placeholder="제한 없음"
                    items={AGE_ITEMS}
                    defaultValue="23"
                    onChange={setMinAgeFemale}
                    c={c}
                  />
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label="나이 (최대)" c={c}>
                  <WheelField
                    value={maxAgeFemale}
                    placeholder="제한 없음"
                    items={AGE_ITEMS}
                    defaultValue="37"
                    onChange={setMaxAgeFemale}
                    c={c}
                  />
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label="최소 키" c={c}>
                  <WheelField
                    value={minHeightFemale}
                    placeholder="제한 없음"
                    items={HEIGHT_ITEMS}
                    defaultValue="158"
                    onChange={setMinHeightFemale}
                    c={c}
                  />
                </Field>
              </View>
            </View>
          </>
        )}

        <Field label="카카오 오픈채팅 링크" c={c} hint="신청한 사람에게만 보여요. 입금 안내와 대화는 여기서 해요.">
          <PlaceholderInput
            value={kakaoLink}
            onChangeText={setKakaoLink}
            placeholder="https://open.kakao.com/o/..."
            placeholderTextColor={c.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            maxLength={300}
            style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
          />
        </Field>

        <Field label="소개 (선택)" c={c}>
          <PlaceholderInput
            value={description}
            onChangeText={setDescription}
            placeholder="어떤 모임인지, 누구와 함께하고 싶은지 적어주세요"
            placeholderTextColor={c.textSecondary}
            multiline
            maxLength={1000}
            style={[styles.input, styles.multiline, { backgroundColor: c.backgroundElement, color: c.text }]}
          />
        </Field>

        <Text style={[styles.note, { color: c.textSecondary }]}>
          참가비는 오픈채팅에서 모임장에게 직접 보내요. 프롤로그는 결제에 관여하지 않고,{'\n'}
          신청·확정·개최 기록이 모임장의 공개 프로필(개최 횟수)이 돼요.
        </Text>
      </ScrollView>

      {coverUrls.length > 0 && (
        <ImageViewerModal
          photos={coverUrls}
          initialIndex={viewerIndex ?? 0}
          visible={viewerIndex != null}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {/* 주소 검색 — 앱 안의 WebView(다음 우편번호). */}
      <AddressSearchModal
        visible={addressOpen}
        onPicked={({ road, building, bname }) => {
          // 동 이름을 괄호로 붙인다 — 도로명에는 동이 없어서, "양재동" 검색이 되려면 주소에 실려야 한다.
          const base = building ? `${road} ${building}` : road;
          setAddress(bname && !base.includes(bname) ? `${base} (${bname})` : base);
          setAddressOpen(false);
        }}
        onClose={() => setAddressOpen(false)}
        c={c}
      />

      {/* 커버 자르기 — 보이는 그대로(16:9)의 창에서 고른다. */}
      {cropQueue.length > 0 && (
        <PhotoCropModal
          key={cropQueue[0]}
          uri={cropQueue[0]!}
          aspect={COVER_ASPECT}
          title="목록에 보이는 그대로예요"
          progress={cropTotal > 1 ? { index: cropTotal - cropQueue.length, total: cropTotal } : undefined}
          onDone={(cropped) => void onCropped(cropped)}
          onCancel={() => setCropQueue([])}
          c={c}
        />
      )}

      {/* 초대장 미리보기 — 신청자에게 보이는 그대로. 아래 막대에서 고치러 돌아가거나 그대로 연다. */}
      <Modal visible={previewOpen} animationType="slide" onRequestClose={() => setPreviewOpen(false)}>
        <View style={[styles.previewRoot, { backgroundColor: c.background, paddingTop: insets.top }]}>
          <View style={[styles.previewHead, { borderBottomColor: c.border }]}>
            <Text style={[styles.previewTitle, { color: c.text }]}>미리보기</Text>
            <Text style={[styles.previewSub, { color: c.textSecondary }]}>신청하는 사람에게 이렇게 보여요</Text>
          </View>
          {previewOpen && (
            <MeetupInvitation
              meetup={previewMeetup()}
              c={c}
              preview
              onPressImage={(i) => setViewerIndex(i)}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
          <View style={[styles.previewBar, { backgroundColor: c.backgroundElement, borderTopColor: c.border, paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              onPress={() => setPreviewOpen(false)}
              disabled={saving}
              style={({ pressed }) => [styles.previewBtn, { backgroundColor: c.backgroundSelected, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.previewBtnText, { color: c.text }]}>고치기</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setPreviewOpen(false);
                void save();
              }}
              disabled={saving}
              style={({ pressed }) => [styles.previewBtn, styles.previewBtnPrimary, { backgroundColor: c.primary, opacity: pressed || saving ? 0.7 : 1 }]}
            >
              <Text style={[styles.previewBtnText, { color: c.primaryText }]}>{editId ? '이대로 수정하기' : '이대로 열기'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* iOS 날짜/시간 바텀시트 휠 */}
      {Platform.OS === 'ios' && (
        <Modal visible={pickerOpen != null} transparent animationType="fade" onRequestClose={() => setPickerOpen(null)}>
          <Pressable style={styles.backdrop} onPress={() => setPickerOpen(null)} />
          <View style={[styles.sheet, { backgroundColor: c.background }]}>
            <View style={styles.sheetHead}>
              <Pressable onPress={() => setPickerOpen(null)} hitSlop={10}>
                <Text style={[styles.sheetBtn, { color: c.textSecondary }]}>취소</Text>
              </Pressable>
              <Pressable onPress={confirmPicker} hitSlop={10}>
                <Text style={[styles.sheetBtn, { color: c.primaryStrong }]}>완료</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode={pickerOpen ?? 'date'}
              display="spinner"
              minimumDate={pickerOpen === 'date' ? new Date() : undefined}
              minuteInterval={5}
              onChange={(_, picked) => picked && setDraft(picked)}
              locale="ko-KR"
            />
          </View>
        </Modal>
      )}
    </SubScreen>
  );
}

function Field({ label, hint, c, children }: { label: string; hint?: string; c: ThemeColors; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      {children}
      {hint ? <Text style={[styles.hint, { color: c.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── 초대장 미리보기 ──
  previewRoot: { flex: 1 },
  previewHead: { alignItems: 'center', paddingTop: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  previewTitle: { fontSize: 16, fontWeight: '700' },
  previewSub: { fontSize: 12.5, marginTop: 3 },
  previewBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  previewBtn: { flex: 1, height: 50, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  previewBtnPrimary: { flex: 1.6 },
  previewBtnText: { fontSize: 15.5, fontWeight: '700' },

  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, paddingHorizontal: 2 },
  hint: { fontSize: 13, marginTop: 6, paddingHorizontal: 2, lineHeight: 18 },
  feeNotice: { fontSize: 13, lineHeight: 19, marginTop: 10, paddingHorizontal: 2 },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  centerText: { justifyContent: 'center' },
  coverPreview: { borderRadius: Radius.lg, marginBottom: 10, overflow: 'hidden' },
  coverEmpty: { aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center' },
  coverBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  coverBtnText: { fontSize: 13.5, fontWeight: '600' },
  coverEmptyInner: { alignItems: 'center', gap: 4 },
  coverEmptyText: { fontSize: 14.5, fontWeight: '600' },
  coverEmptyHint: { fontSize: 12.5 },
  coverThumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  coverThumbWrap: { position: 'relative' },
  coverThumb: { width: 64, height: 40, borderRadius: 8 },
  coverThumbLoading: { alignItems: 'center', justifyContent: 'center' },
  coverThumbAdd: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  coverThumbAddText: { fontSize: 18, fontWeight: '300' },
  coverThumbRemove: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  coverThumbRemoveText: { fontSize: 12, fontWeight: '700', lineHeight: 14 },
  coverMainHint: { fontSize: 12 },
  segment: { flexDirection: 'row', borderRadius: Radius.md, padding: 4, minHeight: 48 },
  segmentItem: { flex: 1, borderRadius: Radius.md - 4, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 15 },
  segmentTextActive: { fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14, paddingHorizontal: 2 },
  checkbox: { width: 21, height: 21, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkboxMark: { fontSize: 13, fontWeight: '800' },
  checkLabel: { fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 14, paddingHorizontal: 2 },
  condTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 10, paddingHorizontal: 2 },
  multiline: { minHeight: 110, textAlignVertical: 'top', paddingTop: 14 },
  row: { flexDirection: 'row', gap: 10 },
  rowItem: { flex: 1 },
  timeItem: { width: 104 },
  note: { fontSize: 13, lineHeight: 19, marginTop: 6, paddingHorizontal: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingBottom: 24 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  sheetBtn: { fontSize: 17, fontWeight: '600' },
});
