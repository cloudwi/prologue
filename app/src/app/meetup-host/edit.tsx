import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SubScreen } from '@/components/sub-screen';
import { MeetupInvitation } from '@/components/meetup-invitation';
import { MeetupTimePicker } from '@/components/meetup-time-picker';
import { pickPhotos } from '@/components/photo-grid';
import { ScreenLoadError } from '@/components/screen-load-error';
import { Radius, Type } from '@/constants/theme';
import { useHostMeetups } from '@/hooks/use-host-meetups';
import { useTheme } from '@/hooks/use-theme';
import { draftInput, draftPreview, meetupDraft, type MeetupDraft } from '@/lib/meetup-draft';
import { conditionLabel, feeValue, saveMeetup, uploadMeetupCover, type SimpleMeetupInput } from '@/lib/meetups';

export default function MeetupEditor() {
  const c = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const hosts = useHostMeetups();
  const cache = useQueryClient();
  const existing = hosts.data?.meetups.find((m) => m.meetupId === id);
  const initialized = useRef(false);
  const [draft, setDraft] = useState(() => meetupDraft());
  const [more, setMore] = useState(false);
  const [preview, setPreview] = useState<SimpleMeetupInput | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveLock = useRef(false);
  useEffect(() => {
    if (existing && !initialized.current) { setDraft(meetupDraft(existing)); initialized.current = true; }
  }, [existing]);
  function change<K extends keyof MeetupDraft>(key: K, value: MeetupDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value })); setError(null);
  }
  async function addPhotos() {
    try { const photos = await pickPhotos(3 - draft.photos.length); change('photos', [...draft.photos, ...photos].slice(0, 3)); }
    catch (e) { setError(e instanceof Error ? e.message : '사진을 고르지 못했어요.'); }
  }
  function showPreview() {
    try { const input = draftInput(draft); Keyboard.dismiss(); setPreview(input); setPreviewOpen(true); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : '입력 내용을 확인해주세요.'); }
  }
  async function save() {
    if (!previewOpen || !preview || saveLock.current) return;
    saveLock.current = true; setSaving(true);
    try {
      const input = draftInput(draft);
      // 사진은 최종 제출할 때만 업로드. 앞 장 성공·뒤 장 실패 시 성공한 URL을 재사용한다.
      const photos = [...draft.photos];
      for (let i = 0; i < photos.length; i++) {
        if (!photos[i].startsWith('https://')) {
          photos[i] = await uploadMeetupCover(photos[i]);
          setDraft((d) => ({ ...d, photos: [...photos] }));
        }
      }
      const savedId = await saveMeetup({ ...input, coverUrls: photos }, id);
      void cache.invalidateQueries({ queryKey: ['meetups'] });
      setPreviewOpen(false);
      router.replace(`/meetup-host/${savedId}`);
    } catch (e) {
      setPreviewOpen(false); setError(`${e instanceof Error ? e.message : '저장하지 못했어요.'}\n입력 내용과 사진은 그대로예요. 확인 후 다시 제출해주세요.`);
    } finally { setSaving(false); saveLock.current = false; }
  }
  if (hosts.session.loading || (hosts.session.signedIn && hosts.isPending)) return <SubScreen title="모임 만들기" c={c}><ActivityIndicator /></SubScreen>;
  if (hosts.isError || hosts.session.error) return <ScreenLoadError title="모임 정보를 불러오지 못했어요" onRetry={() => { hosts.session.retry(); void hosts.refetch(); }} />;
  if (!hosts.session.signedIn) return <SubScreen title="모임 만들기" c={c}><Text style={[styles.message, { color: c.text }]}>모임을 만들려면 로그인해주세요.</Text></SubScreen>;
  if (id && !existing) return <SubScreen title="모임 만들기" c={c}><Text style={[styles.message, { color: c.text }]}>내가 여는 모임을 찾을 수 없어요.</Text></SubScreen>;
  if (existing && ['DONE', 'CANCELED'].includes(existing.status)) return <SubScreen title="모임 수정" c={c}><Text style={[styles.message, { color: c.text }]}>끝난 모임은 수정할 수 없어요.</Text></SubScreen>;

  const splitSeats = existing?.capacityMale != null;
  const splitFee = existing?.feeFemale != null && existing.feeFemale !== existing.fee;
  const field = (label: string, key: 'title' | 'place' | 'capacity' | 'description' | 'placeAddress' | 'fee' | 'kakaoLink', options: { maxLength?: number; numeric?: boolean; multiline?: boolean; disabled?: boolean; placeholder?: string } = {}) => (
    <View style={styles.field}>
      <Text style={[Type.label, { color: c.text }]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={draft[key]} onChangeText={(value) => change(key, value)}
        editable={!options.disabled && !saving} maxLength={options.maxLength} keyboardType={options.numeric ? 'number-pad' : 'default'}
        multiline={options.multiline} autoCapitalize={key === 'kakaoLink' ? 'none' : 'sentences'} autoCorrect={key !== 'kakaoLink'}
        placeholder={options.placeholder} placeholderTextColor={c.textSecondary}
        style={[styles.input, options.multiline && styles.multiline, { color: c.text, backgroundColor: c.backgroundElement, opacity: options.disabled ? 0.6 : 1 }]} />
    </View>
  );
  return <SubScreen title={id ? '모임 수정' : '모임 만들기'} c={c} onSave={showPreview} saveLabel="미리보기" saveDisabled={saving}>
    {error && <View style={[styles.error, { backgroundColor: c.backgroundSelected }]}><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[Type.body, { color: c.text }]}>{error}</Text></View>}
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[Type.body, { color: c.textSecondary }]}>언제, 어디서, 몇 명이 만날지만 정하면 돼요.</Text>
        {field('모임 이름', 'title', { maxLength: 80, placeholder: '예: 좋아하는 과자 한 봉지' })}
        <View style={styles.field}><Text style={[Type.label, { color: c.text }]}>날짜 · 한국 시간</Text><MeetupTimePicker label="모임 날짜" value={draft.date} mode="date" onChange={(value) => change('date', value)} c={c} /></View>
        <View style={styles.row}>
          <View style={styles.flex}><Text style={[Type.label, { color: c.text }]}>시작 시간</Text><MeetupTimePicker label="시작 시간" value={draft.time} mode="time" onChange={(value) => change('time', value)} c={c} /></View>
          <View style={styles.flex}><Text style={[Type.label, { color: c.text }]}>종료 · 선택</Text><MeetupTimePicker label="종료 시간" value={draft.endTime} mode="time" onChange={(value) => change('endTime', value)} c={c} />{draft.endTime !== '' && <Pressable onPress={() => change('endTime', '')}><Text style={[Type.caption, { color: c.textSecondary }]}>종료 시간 지우기</Text></Pressable>}</View>
        </View>
        {field('만날 장소', 'place', { maxLength: 120, placeholder: '예: 양재역 근처 서로서가' })}
        {field('정원', 'capacity', { numeric: true, disabled: splitSeats, maxLength: 3 })}
        {splitSeats && <Text style={[Type.caption, { color: c.textSecondary }]}>기존 남 {existing.capacityMale}명 · 여 {existing.capacityFemale}명 배분을 유지해요.</Text>}
        {conditionLabel(existing ?? { genderLimit: null, minAgeMale: null, maxAgeMale: null, minAgeFemale: null, maxAgeFemale: null, minHeightMaleCm: null, minHeightFemaleCm: null, requireJobVerified: false }) && <Text style={[Type.caption, { color: c.textSecondary }]}>기존 참가 조건 유지: {conditionLabel(existing!)}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore(!more)} style={styles.more}><Text style={[Type.label, { color: c.text }]}>{more ? '선택 정보 접기' : '사진·소개·참가비 더하기 · 선택'}</Text></Pressable>
        {more && <>
          <Text style={[Type.label, { color: c.text }]}>표지 사진 · 최대 3장</Text>
          <View style={styles.row}>{draft.photos.map((uri, i) => <View key={`${uri}-${i}`} style={styles.flex}>
            <Image source={{ uri }} style={styles.photo} contentFit="cover" />
            <Pressable accessibilityRole="button" accessibilityLabel={`사진 ${i + 1} 삭제`} hitSlop={10} onPress={() => change('photos', draft.photos.filter((_, index) => index !== i))}><Text style={[Type.caption, { color: c.textSecondary }]}>빼기</Text></Pressable>
          </View>)}</View>
          {draft.photos.length < 3 && <Pressable accessibilityRole="button" hitSlop={10} onPress={() => void addPhotos()}><Text style={[Type.button, { color: c.text }]}>사진 고르기</Text></Pressable>}
          {field('짧은 소개', 'description', { multiline: true, maxLength: 1000, placeholder: '함께 무엇을 할지 편하게 적어주세요.' })}
          {field('주소 · 선택', 'placeAddress', { maxLength: 200 })}
          {field('참가비 · 0원이면 무료', 'fee', { numeric: true, maxLength: 10, disabled: splitFee })}
          {splitFee && <Text style={[Type.caption, { color: c.textSecondary }]}>기존 요금 유지: {feeValue(existing)}</Text>}
          {field('연락 링크 · 선택', 'kakaoLink', { maxLength: 300, placeholder: 'https://open.kakao.com/o/...' })}
          <Text style={[Type.caption, { color: c.textSecondary }]}>연락 링크는 신청자에게만 보여요. 참가비는 직접 확인하고 참가자를 확정해주세요.</Text>
        </>}
        <Text style={[Type.caption, { color: c.textSecondary }]}>제출하면 운영자 확인 후 공개돼요.{id ? ' 수정한 모임도 다시 확인합니다.' : ''}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    <Modal visible={previewOpen} animationType="slide" onRequestClose={() => { if (!saving) setPreviewOpen(false); }}>
      <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]}>
        <View style={styles.previewHeader}><Pressable accessibilityRole="button" hitSlop={10} disabled={saving} onPress={() => setPreviewOpen(false)}><Text style={[Type.button, { color: c.text }]}>돌아가기</Text></Pressable><Text style={[Type.caption, { color: c.textSecondary }]}>아직 저장하지 않았어요</Text></View>
        {preview && <MeetupInvitation meetup={draftPreview(preview, existing)} c={c} preview />}
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={[styles.submit, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}>
          {saving ? <ActivityIndicator color={c.primaryText} /> : <Text style={[Type.button, { color: c.primaryText }]}>{id ? '수정 제출하기' : '이대로 제출하기'}</Text>}
        </Pressable>
      </SafeAreaView>
    </Modal>
  </SubScreen>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { padding: 20, paddingBottom: 60, gap: 20 }, field: { gap: 8 },
  input: { ...Type.body, minHeight: 52, borderRadius: Radius.md, padding: 16 }, multiline: { minHeight: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 }, more: { paddingVertical: 12 }, photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.sm },
  message: { ...Type.body, padding: 20 }, previewHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  error: { paddingHorizontal: 20, paddingVertical: 12 },
  submit: { padding: 18, alignItems: 'center', borderRadius: Radius.md, margin: 20, marginBottom: 36 },
});
