import { useRouter } from 'expo-router';
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

import { Colors, Fonts } from '@/constants/theme';
import { answerToday, getPeer, getToday, sendHeart, type Peer, type Today } from '@/lib/daily';

export default function HomeScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

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
      const { matched } = await sendHeart(peer.peerAnswerId);
      setHearted(true);
      if (matched) {
        Alert.alert('매칭됐어요! 💝', '서로의 마음이 닿았어요. 곧 대화를 시작할 수 있어요.');
      } else {
        Alert.alert('하트를 보냈어요 ♥', '상대도 마음을 보내면 매칭돼요.');
      }
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setHearting(false);
    }
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

  // 미답변이면 항상 편집, 답변했으면 '수정하기'를 눌렀을 때만 편집
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
            <View style={styles.header}>
              <Text style={[styles.eyebrow, { color: c.primary }]}>오늘의 문답</Text>
              <Pressable onPress={() => router.push('/mypage')} hitSlop={10}>
                <Text style={{ color: c.textSecondary, fontSize: 14, fontWeight: '600' }}>MY</Text>
              </Pressable>
            </View>

            {/* 질문 카드 */}
            <View style={[styles.questionCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
              <Text style={[styles.question, { color: c.text, fontFamily: Fonts.serif }]}>
                {today?.content}
              </Text>
            </View>

            {isEditing ? (
              <>
                {/* 답변 입력 (작성 / 수정 모드) */}
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
                  style={[
                    styles.submit,
                    { backgroundColor: c.primary, opacity: draft.trim().length === 0 || submitting ? 0.5 : 1 },
                  ]}
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
                  <Text style={[styles.hint, { color: c.textSecondary }]}>
                    답변해야 상대의 답변을 볼 수 있어요.
                  </Text>
                )}
              </>
            ) : (
              <>
                {/* 내 답변 (읽기 전용) */}
                <Text style={[styles.answeredTag, { color: c.primary }]}>✓ 오늘 답변했어요</Text>
                <View style={[styles.myAnswerCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                  <Text style={[styles.myAnswerText, { color: c.text, fontFamily: Fonts.serif }]}>
                    {today?.myAnswer}
                  </Text>
                </View>

                <Pressable
                  onPress={startEdit}
                  style={[styles.editBtn, { borderColor: c.primary }]}
                >
                  <Text style={[styles.editBtnText, { color: c.primary }]}>답변 수정하기</Text>
                </Pressable>
              </>
            )}

            {/* 블라인드 상대 답변 (Give & Take) */}
            {today?.answered && (
              <View style={styles.peerSection}>
                <Text style={[styles.peerEyebrow, { color: c.primary }]}>상대의 답변</Text>
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
                            : {
                                color: 'transparent',
                                textShadowColor: c.text,
                                textShadowOffset: { width: 0, height: 0 },
                                textShadowRadius: 9,
                              },
                        ]}
                      >
                        {peer.peerAnswer}
                      </Text>
                      {!peerRevealed && (
                        <View style={styles.revealHint}>
                          <Text style={[styles.revealHintText, { color: c.primary }]}>👀 탭하여 상대의 답변 보기</Text>
                        </View>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={heart}
                      disabled={hearting || hearted}
                      style={[
                        styles.heart,
                        {
                          backgroundColor: hearted ? c.backgroundElement : c.primary,
                          borderColor: c.primary,
                          opacity: hearting ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.heartText, { color: hearted ? c.primary : c.primaryText }]}>
                        {hearted ? '♥ 하트를 보냈어요' : hearting ? '보내는 중...' : '♥ 이 마음에 하트 보내기'}
                      </Text>
                    </Pressable>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  eyebrow: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  questionCard: { borderRadius: 16, borderWidth: 1, padding: 24, marginBottom: 20 },
  question: { fontSize: 22, fontWeight: '600', lineHeight: 32, marginTop: 4 },
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
  peerEyebrow: { fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  peerCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  peerBadge: { fontSize: 12, marginBottom: 10 },
  peerAnswer: { fontSize: 17, lineHeight: 27 },
  revealHint: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  revealHintText: { fontSize: 14, fontWeight: '700' },
  heart: { height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  heartText: { fontSize: 15, fontWeight: '700' },
  peerEmpty: { alignItems: 'center', paddingVertical: 28 },
  peerEmptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
