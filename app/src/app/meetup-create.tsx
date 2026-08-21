import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaceholderInput } from '@/components/placeholder-input';
import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { createMeetup } from '@/lib/meetups';

/**
 * 모임 열기 — 누구나 모임장이 될 수 있다.
 *
 * 폼은 모임의 뼈대(무엇을·언제·어디서·몇 명·얼마)와 오픈채팅 링크만 받는다.
 * 입금 확인과 자리 배분은 카카오에서 모임장이 직접 한다 — 우리는 돈을 만지지 않는다.
 */
export default function MeetupCreateScreen() {
  const c = useTheme();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetAt, setMeetAt] = useState<Date | null>(null);
  const [place, setPlace] = useState('');
  const [capacity, setCapacity] = useState('');
  const [fee, setFee] = useState('');
  const [kakaoLink, setKakaoLink] = useState('');
  const [saving, setSaving] = useState(false);

  // iOS 바텀시트 휠용
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

  const capacityNum = Number(capacity);
  const feeNum = fee === '' ? 0 : Number(fee);

  /** 비활성 버튼은 이유를 말하지 않는다 — 항상 눌리게 두고, 빠진 것을 말로 알려준다. */
  function firstMissing(): string | null {
    if (title.trim().length === 0) return '모임 이름을 적어주세요.';
    if (meetAt == null) return '모임 날짜와 시간을 골라주세요.';
    if (place.trim().length === 0) return '모임 장소를 적어주세요.';
    if (!Number.isInteger(capacityNum) || capacityNum < 2) return '정원을 2명 이상으로 적어주세요.';
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

  async function save() {
    const missing = firstMissing();
    if (missing) {
      Alert.alert('조금만 더 채워주세요', missing);
      return;
    }
    if (meetAt == null) return;
    if (meetAt.getTime() < Date.now()) {
      Alert.alert('지난 시각이에요', '모임 일시를 다시 골라주세요.');
      return;
    }
    setSaving(true);
    try {
      await createMeetup({
        title: title.trim(),
        description: description.trim() || undefined,
        meetAt: meetAt.toISOString(),
        place: place.trim(),
        capacity: capacityNum,
        fee: feeNum,
        kakaoLink: normalizedLink()!,
      });
      track('meetup_created');
      Alert.alert('모임을 열었어요', '신청이 들어오면 알림으로 알려드릴게요.\n입금 확인과 확정은 [모임 관리]에서 해요.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('모임을 열지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubScreen title="모임 열기" c={c} onSave={save} saving={saving}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <PlaceholderInput
            value={place}
            onChangeText={setPlace}
            placeholder="예) 성수역 3번 출구 앞 카페"
            placeholderTextColor={c.textSecondary}
            maxLength={120}
            style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
          />
        </Field>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Field label="정원" c={c}>
              <PlaceholderInput
                value={capacity}
                onChangeText={(t) => setCapacity(t.replace(/[^0-9]/g, ''))}
                placeholder="예) 8"
                placeholderTextColor={c.textSecondary}
                keyboardType="number-pad"
                maxLength={3}
                style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
              />
            </Field>
          </View>
          <View style={styles.rowItem}>
            <Field label="참가비 (원)" c={c}>
              <PlaceholderInput
                value={fee}
                onChangeText={(t) => setFee(t.replace(/[^0-9]/g, ''))}
                placeholder="0이면 무료"
                placeholderTextColor={c.textSecondary}
                keyboardType="number-pad"
                maxLength={7}
                style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
              />
            </Field>
          </View>
        </View>

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

      {/* iOS 바텀시트 휠 */}
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
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, paddingHorizontal: 2 },
  hint: { fontSize: 13, marginTop: 6, paddingHorizontal: 2, lineHeight: 18 },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  centerText: { justifyContent: 'center' },
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
