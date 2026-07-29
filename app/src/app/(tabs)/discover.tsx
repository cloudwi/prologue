import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Avatar } from '@/components/avatar';
import { BottomTabInset, Fonts, Radius, type ThemeColors } from '@/constants/theme';
import { answerToday, getPeers, getToday, sendHeart, type Peer, type Today, type TodayPeers } from '@/lib/daily';
import { sendConversationRequest } from '@/lib/conversation';
import { useTheme } from '@/hooks/use-theme';

function peerMetaLabel(peer: Peer): string {
  const parts: string[] = [];
  if (peer.age != null) parts.push(`${peer.age}세`);
  if (peer.heightCm) parts.push(`${peer.heightCm}cm`);
  if (peer.region) parts.push(peer.region.split(' ').slice(-1)[0]);
  return parts.join(' · ');
}

export default function DiscoverScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  const [today, setToday] = useState<Today | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [peersData, setPeersData] = useState<TodayPeers | null>(null);
  const [peersLoading, setPeersLoading] = useState(false);
  const [answerExpanded, setAnswerExpanded] = useState(false);

  async function loadPeers() {
    setPeersLoading(true);
    try {
      setPeersData(await getPeers());
    } catch {
      // 상대 답변은 보조 정보 — 실패해도 화면은 유지
    } finally {
      setPeersLoading(false);
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
        loadPeers(); // 답변 전에도 상대 프로필은 미리보기
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

  // 발견 탭에 다시 들어올 때, 아직 공개 전이거나 상대가 없으면 다시 시도 (정오가 지났을 수 있음)
  useFocusEffect(
    useCallback(() => {
      if (!peersData?.open || peersData.peers.length === 0) loadPeers();
       
    }, [peersData?.open, peersData?.peers.length]),
  );

  async function submit() {
    if (draft.trim().length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const wasAnswered = today?.answered ?? false;
      const updated = await answerToday(draft.trim());
      setToday(updated);
      setDraft(updated.myAnswer ?? '');
      setEditing(false);
      if (!wasAnswered && updated.answered) loadPeers();
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
        <SafeAreaView style={styles.flex} edges={['top']}>
          {/* 탭바는 콘텐츠 위에 떠 있다 — 마지막 카드가 가리지 않도록 탭바 높이만큼 비워둔다. */}
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* 오늘의 문답 */}
            <Text style={[styles.sectionEyebrow, { color: c.primaryStrong }]}>오늘의 문답</Text>
            <View style={[styles.questionCard, { backgroundColor: c.backgroundElement }]}>
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
                <Text style={[styles.answeredTag, { color: c.primaryStrong }]}>✓ 오늘 답변했어요</Text>
                <View style={[styles.myAnswerCard, { backgroundColor: c.backgroundElement }]}>
                  <Text
                    style={[styles.myAnswerText, { color: c.text, fontFamily: Fonts.serif }]}
                    numberOfLines={answerExpanded ? undefined : 4}
                  >
                    {today?.myAnswer}
                  </Text>
                  {(today?.myAnswer?.length ?? 0) > 100 && (
                    <Pressable onPress={() => setAnswerExpanded((v) => !v)} hitSlop={6} style={styles.moreBtn}>
                      <Text style={{ color: c.primaryStrong, fontSize: 13, fontWeight: '600' }}>
                        {answerExpanded ? '접기' : '더보기'}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Pressable onPress={startEdit} style={[styles.editBtn, { borderColor: c.border }]}>
                  <Text style={[styles.editBtnText, { color: c.primaryStrong }]}>답변 수정하기</Text>
                </Pressable>
              </>
            )}

            {/* 오늘의 상대 — 매일 정오, 최대 3명 */}
            <View style={styles.peerSection}>
              <Text style={[styles.peerEyebrow, { color: c.primaryStrong }]}>오늘의 상대</Text>
              <Text style={[styles.peerSub, { color: c.textSecondary }]}>
                매일 정오, 같은 질문에 답한 3명의 답변이 도착해요.
              </Text>

              {peersLoading && !peersData ? (
                <ActivityIndicator color={c.primary} style={{ marginTop: 16 }} />
              ) : !peersData || !peersData.open ? (
                <View style={[styles.peerCard, styles.peerEmpty, { backgroundColor: c.backgroundSelected }]}>
                  <Text style={[styles.peerEmptyText, { color: c.textSecondary }]}>
                    오늘의 인연은 정오에 공개돼요.{'\n'}그동안 오늘의 질문에 답을 남겨보세요.
                  </Text>
                </View>
              ) : peersData.peers.length === 0 ? (
                <View style={[styles.peerCard, styles.peerEmpty, { backgroundColor: c.backgroundSelected }]}>
                  <Text style={[styles.peerEmptyText, { color: c.textSecondary }]}>
                    아직 도착한 답변이 없어요.{'\n'}곧 누군가의 마음이 도착할 거예요.
                  </Text>
                </View>
              ) : (
                peersData.peers.map((peer, i) => (
                  <PeerCard key={peer.peerAnswerId ?? i} peer={peer} c={c} />
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** 상대 1명 카드 — 하트/대화신청/답변 열람 상태를 카드별로 가진다. */
function PeerCard({ peer, c }: { peer: Peer; c: ThemeColors }) {
  const [hearted, setHearted] = useState(false);
  const [hearting, setHearting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function heart() {
    if (!peer.peerAnswerId || hearting || hearted) return;
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

  async function requestConversation() {
    if (!peer.peerAnswerId || requesting || requested) return;
    setRequesting(true);
    try {
      await sendConversationRequest(peer.peerAnswerId);
      setRequested(true);
      Alert.alert('대화 신청을 보냈어요', '상대가 수락하면 둘만의 문답이 시작돼요.');
    } catch (e) {
      Alert.alert('신청 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <View style={[styles.peerCard, { backgroundColor: c.backgroundElement }]}>
      {/*
       * 사진이 카드의 첫인상 — 상대가 먼저 보이고, 답변은 그 아래에서 이어진다.
       * 글자는 사진 위에 얹지 않고 면에 앉힌다(MY 프로필 카드와 같은 규칙).
       */}
      {peer.photoUrls.length > 0 && (
        <Image source={{ uri: peer.photoUrls[0] }} style={[styles.peerPhoto, { backgroundColor: c.backgroundSelected }]} contentFit="cover" transition={150} />
      )}

      <View style={styles.peerBody}>
        <View style={styles.peerHead}>
          {peer.photoUrls.length === 0 && <Avatar avatarId={peer.avatarId} size={46} c={c} />}
          <View style={styles.peerHeadBody}>
            {peer.nickname ? (
              <Text style={[styles.peerName, { color: c.text, fontFamily: Fonts.serif }]}>{peer.nickname}</Text>
            ) : null}
            <Text style={[styles.peerMeta, { color: c.textSecondary }]}>{peerMetaLabel(peer)}</Text>
          </View>
        </View>
        {peer.bio ? <Text style={[styles.peerBio, { color: c.text }]}>{peer.bio}</Text> : null}
        {[...peer.hobbies, ...peer.interests, ...peer.strengths].length > 0 && (
          <View style={styles.peerChips}>
            {[...peer.hobbies, ...peer.interests, ...peer.strengths].slice(0, 5).map((k) => (
              <View key={k} style={[styles.peerChip, { backgroundColor: c.backgroundSelected }]}>
                <Text style={{ color: c.textSecondary, fontSize: 12 }}>{k}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.peerDivider, { backgroundColor: c.border }]} />

      {peer.answerUnlocked && peer.peerAnswer ? (
        <>
          <Pressable onPress={() => setRevealed(true)} disabled={revealed}>
            <Text
              numberOfLines={revealed ? (expanded ? undefined : 6) : 4}
              style={[
                styles.peerAnswer,
                { fontFamily: Fonts.serif },
                revealed
                  ? { color: c.text }
                  : { color: 'transparent', textShadowColor: c.text, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 9 },
              ]}
            >
              {peer.peerAnswer}
            </Text>
            {!revealed && (
              <View style={styles.revealHint}>
                <Text style={[styles.revealHintText, { color: c.primaryStrong }]}>탭하여 상대의 답변 보기</Text>
              </View>
            )}
          </Pressable>
          {revealed && (peer.peerAnswer?.length ?? 0) > 140 && (
            <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={6} style={styles.moreBtn}>
              <Text style={{ color: c.primaryStrong, fontSize: 13, fontWeight: '600' }}>{expanded ? '접기' : '더보기'}</Text>
            </Pressable>
          )}

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

            <Pressable
              onPress={requestConversation}
              disabled={requesting || requested}
              style={[styles.talk, { backgroundColor: c.primary, opacity: requesting ? 0.6 : 1 }]}
            >
              <Text style={[styles.talkText, { color: c.primaryText }]}>
                {requested ? '신청함' : requesting ? '신청 중...' : '대화 신청'}
              </Text>
            </Pressable>
          </View>
        </>
        ) : (
          <View style={styles.peerLock}>
            <Text style={[styles.peerLockText, { color: c.textSecondary }]}>
              오늘의 질문에 답하면{'\n'}이 상대의 답변이 열려요.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 16 }, // 아래 여백은 렌더 시 탭바·세이프에어리어를 더해 덮어쓴다
  sectionEyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 10 },
  questionCard: { borderRadius: Radius.md, padding: 20, marginBottom: 16 },
  question: { fontSize: 19, fontWeight: '600', lineHeight: 28 },
  answeredTag: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  myAnswerCard: { borderRadius: Radius.md, padding: 20 },
  myAnswerText: { fontSize: 16, lineHeight: 25 },
  moreBtn: { marginTop: 8, alignSelf: 'flex-start' },
  editBtn: { height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  editBtnText: { fontSize: 14, fontWeight: '700' },
  cancel: { alignSelf: 'center', marginTop: 14, padding: 6 },
  // 입력만 테두리를 남긴다 — "쓸 수 있는 곳"이라는 표시.
  input: { minHeight: 140, borderRadius: Radius.md, borderWidth: 1, padding: 16, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
  counter: { fontSize: 12, textAlign: 'right', marginTop: 6 },
  submit: { height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitText: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  peerSection: { marginTop: 34 },
  peerEyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 4 },
  peerSub: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  peerCard: { borderRadius: Radius.lg, marginBottom: 14, overflow: 'hidden' },
  // 4:5 세로 사진 — 소개팅 프로필의 표준 비율. 카드 폭을 꽉 채운다.
  peerPhoto: { width: '100%', aspectRatio: 4 / 5 },
  peerBody: { padding: 20 },
  peerName: { fontSize: 20, fontWeight: '700' },
  peerHead: { flexDirection: 'row', alignItems: 'center' },
  peerHeadBody: { flex: 1, marginLeft: 12 },
  peerMeta: { fontSize: 13.5, marginTop: 3 },
  peerBio: { fontSize: 14.5, lineHeight: 22, marginTop: 12 },
  peerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  peerChip: { paddingHorizontal: 11, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  peerDivider: { height: StyleSheet.hairlineWidth, marginVertical: 18 },
  peerLock: { alignItems: 'center', paddingVertical: 14 },
  peerLockText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  peerAnswer: { fontSize: 16, lineHeight: 25 },
  revealHint: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  revealHintText: { fontSize: 14, fontWeight: '700' },
  peerActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  heart: { flexDirection: 'row', gap: 6, height: 48, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  heartIcon: { width: 18, height: 18 },
  heartText: { fontSize: 15, fontWeight: '700' },
  talk: { flex: 1, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  talkText: { fontSize: 15, fontWeight: '700' },
  peerEmpty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  peerEmptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
