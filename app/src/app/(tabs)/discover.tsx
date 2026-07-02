import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Colors, Fonts } from '@/constants/theme';
import { answerToday, getPeer, getToday, sendHeart, type Peer, type Today } from '@/lib/daily';

export default function DiscoverScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [today, setToday] = useState<Today | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerLoading, setPeerLoading] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [hearting, setHearting] = useState(false);
  const [peerRevealed, setPeerRevealed] = useState(false);

  async function loadPeer() {
    setPeerLoading(true);
    setHearted(false);
    setPeerRevealed(false);
    try {
      setPeer(await getPeer());
    } catch {
      // 상대 답변은 보조 정보 — 실패해도 화면은 유지
    } finally {
      setPeerLoading(false);
    }
  }

  async function heart() {
    if (!peer?.peerAnswerId || hearting || hearted) return;
    setHearting(true);
    try {
      await sendHeart(peer.peerAnswerId);
      setHearted(true);
      Alert.alert('하트를 보냈어요', '이 답변이 마음에 든다는 호감 표시예요.');
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setHearting(false);
    }
  }

  function requestConversation() {
    Alert.alert('대화 신청', '대화 신청 기능은 곧 열려요. 상대가 수락하면 둘만의 문답이 시작돼요.');
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const t = await getToday();
        if (!active) return;
        setToday(t);
        setDraft(t.myAnswer ?? '');
        if (t.answered) loadPeer();
      } catch (e) {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    if (draft.trim().length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const wasAnswered = today?.answered ?? false;
      const updated = await answerToday(draft.trim());
      setToday(updated);
      setDraft(updated.myAnswer ?? '');
      setEditing(false);
      if (!wasAnswered && updated.answered) loadPeer();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit() {
    setDraft(today?.myAnswer ?? '');
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(today?.myAnswer ?? '');
    setEditing(false);
  }

  const isEditing = !today?.answered || editing;

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* 오늘의 문답 */}
            <Text style={[styles.sectionEyebrow, { color: c.primary }]}>오늘의 문답</Text>
            <View style={[styles.questionCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
              <Text style={[styles.question, { color: c.text, fontFamily: Fonts.serif }]}>{today?.content}</Text>
            </View>

            {isEditing ? (
              <>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="오늘의 마음을 적어보세요"
                  placeholderTextColor={c.textSecondary}
                  multiline
                  autoFocus={editing}
                  maxLength={300}
                  style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
                />
                <Text style={[styles.counter, { color: c.textSecondary }]}>{draft.length}/300</Text>
                <Pressable
                  onPress={submit}
                  disabled={draft.trim().length === 0 || submitting}
                  style={[styles.submit, { backgroundColor: c.primary, opacity: draft.trim().length === 0 || submitting ? 0.5 : 1 }]}
                >
                  <Text style={[styles.submitText, { color: c.primaryText }]}>
                    {submitting ? '저장 중...' : today?.answered ? '수정 완료' : '답변 남기기'}
                  </Text>
                </Pressable>
                {today?.answered && (
                  <Pressable onPress={cancelEdit} disabled={submitting} style={styles.cancel} hitSlop={6}>
                    <Text style={{ color: c.textSecondary, fontSize: 14 }}>취소</Text>
                  </Pressable>
                )}
                {!today?.answered && (
                  <Text style={[styles.hint, { color: c.textSecondary }]}>답변해야 상대의 답변을 볼 수 있어요.</Text>
                )}
              </>
            ) : (
              <>
                <Text style={[styles.answeredTag, { color: c.primary }]}>✓ 오늘 답변했어요</Text>
                <View style={[styles.myAnswerCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                  <Text style={[styles.myAnswerText, { color: c.text, fontFamily: Fonts.serif }]}>{today?.myAnswer}</Text>
                </View>
                <Pressable onPress={startEdit} style={[styles.editBtn, { borderColor: c.primary }]}>
                  <Text style={[styles.editBtnText, { color: c.primary }]}>답변 수정하기</Text>
                </Pressable>
              </>
            )}

            {/* 오늘의 상대 (새 인연) */}
            {today?.answered && (
              <View style={styles.peerSection}>
                <Text style={[styles.peerEyebrow, { color: c.primary }]}>오늘의 상대</Text>
                <Text style={[styles.peerSub, { color: c.textSecondary }]}>
                  오늘 같은 질문에 답한 새로운 상대예요. 마음에 들면 하트를 보내거나 대화를 신청해보세요.
                </Text>
                {peerLoading ? (
                  <ActivityIndicator color={c.primary} style={{ marginTop: 16 }} />
                ) : peer?.hasPeer && peer.peerAnswer ? (
                  <View style={[styles.peerCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                    <Text style={[styles.peerBadge, { color: c.textSecondary }]}>익명의 상대 · 같은 질문</Text>

                    <Pressable onPress={() => setPeerRevealed(true)} disabled={peerRevealed}>
                      <Text
                        style={[
                          styles.peerAnswer,
                          { fontFamily: Fonts.serif },
                          peerRevealed
                            ? { color: c.text }
                            : { color: 'transparent', textShadowColor: c.text, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 9 },
                        ]}
                      >
                        {peer.peerAnswer}
                      </Text>
                      {!peerRevealed && (
                        <View style={styles.revealHint}>
                          <Text style={[styles.revealHintText, { color: c.primary }]}>탭하여 상대의 답변 보기</Text>
                        </View>
                      )}
                    </Pressable>

                    <View style={styles.peerActions}>
                      <Pressable
                        onPress={heart}
                        disabled={hearting || hearted}
                        style={[styles.heart, { borderColor: c.primary, backgroundColor: hearted ? c.primary : 'transparent', opacity: hearting ? 0.6 : 1 }]}
                      >
                        {!hearting && (
                          <Image
                            source={require('@/assets/images/match-heart.png')}
                            style={styles.heartIcon}
                            contentFit="contain"
                            tintColor={hearted ? c.primaryText : c.primary}
                          />
                        )}
                        <Text style={[styles.heartText, { color: hearted ? c.primaryText : c.primary }]}>
                          {hearted ? '호감 표시함' : hearting ? '...' : '하트'}
                        </Text>
                      </Pressable>

                      <Pressable onPress={requestConversation} style={[styles.talk, { backgroundColor: c.primary }]}>
                        <Text style={[styles.talkText, { color: c.primaryText }]}>대화 신청</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.peerCard, styles.peerEmpty, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                    <Text style={[styles.peerEmptyText, { color: c.textSecondary }]}>
                      아직 도착한 답변이 없어요.{'\n'}곧 누군가의 마음이 도착할 거예요.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 25, paddingBottom: 40 },
  sectionEyebrow: { fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 4 },
  questionCard: { borderRadius: 16, borderWidth: 1, padding: 24, marginBottom: 20 },
  question: { fontSize: 22, fontWeight: '600', lineHeight: 32 },
  answeredTag: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  myAnswerCard: { borderRadius: 12, borderWidth: 1, padding: 18 },
  myAnswerText: { fontSize: 17, lineHeight: 27 },
  editBtn: { height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  editBtnText: { fontSize: 15, fontWeight: '700' },
  cancel: { alignSelf: 'center', marginTop: 14, padding: 6 },
  input: { minHeight: 140, borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
  counter: { fontSize: 12, textAlign: 'right', marginTop: 6 },
  submit: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitText: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  peerSection: { marginTop: 32 },
  peerEyebrow: { fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  peerSub: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  peerCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  peerBadge: { fontSize: 12, marginBottom: 10 },
  peerAnswer: { fontSize: 17, lineHeight: 27 },
  revealHint: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  revealHintText: { fontSize: 14, fontWeight: '700' },
  peerActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  heart: { flexDirection: 'row', gap: 6, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  heartIcon: { width: 18, height: 18 },
  heartText: { fontSize: 15, fontWeight: '700' },
  talk: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  talkText: { fontSize: 15, fontWeight: '700' },
  peerEmpty: { alignItems: 'center', paddingVertical: 28 },
  peerEmptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
