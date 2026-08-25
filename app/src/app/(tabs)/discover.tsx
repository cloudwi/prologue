import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { BottomTabInset, Fonts, Radius, type ThemeColors } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { isSessionExpired } from '@/lib/api';
import { answerToday, getPastPeers, getPeers, getToday, type PastPeer, type Peer, type Today, type TodayPeers } from '@/lib/daily';
import { writeLetter } from '@/lib/letters';
import { useTheme } from '@/hooks/use-theme';

// 답변 최소 분량 — 서버와 같은 값. "ㅇㅇ" 한 마디는 상대의 하루를 비운다.
const ANSWER_MIN = 15;
const ANSWER_MAX = 300;

function peerMetaLabel(peer: Peer): string {
  const parts: string[] = [];
  if (peer.age != null) parts.push(`${peer.age}세`);
  if (peer.heightCm) parts.push(`${peer.heightCm}cm`);
  if (peer.region) parts.push(peer.region.split(' ').slice(-1)[0]);
  // 카드에서는 가장 값진 신호(오늘 활동)만 — 상세 버킷은 프로필 화면 몫.
  if (peer.lastActive === 'TODAY') parts.push('오늘 활동');
  return parts.join(' · ');
}

/** 오늘 날짜 캡션 — "8월 19일 수요일". 질문 위에 작게 놓여 '오늘의 표지'라는 걸 말한다. */
function todayCaption(): string {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
}

/** 다음 정오(KST)까지 남은 ms. 이미 정오가 지났으면 0 — 공개 여부는 서버(open)가 판단한다. */
function msUntilNoonKst(now = new Date()): number {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);
  const noon = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 12, 0, 0) - kstOffset;
  return Math.max(0, noon - now.getTime());
}

function countdownLabel(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${Math.max(m, 1)}분 뒤`;
  if (m === 0) return `${h}시간 뒤`;
  return `${h}시간 ${m}분 뒤`;
}

export default function DiscoverScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [today, setToday] = useState<Today | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  // 답 쓰기 전에는 한 줄짜리 입구만 보인다 — 누르면 그 자리에서 에디터가 펼쳐진다.
  const [composing, setComposing] = useState(false);
  const [peersData, setPeersData] = useState<TodayPeers | null>(null);
  const [peersLoading, setPeersLoading] = useState(false);
  const [answerExpanded, setAnswerExpanded] = useState(false);
  const [pastPeers, setPastPeers] = useState<PastPeer[]>([]);
  // 이번 세션에 답변으로 고인 잉크 — 저장 직후 "✓ 오늘 답변했어요" 옆에 잠시 붙여 보여준다.
  const [inkEarnedNote, setInkEarnedNote] = useState(0);

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

  // 첫 로드에만 작성칸을 서버 답변으로 채운다 — 이후 새로고침이 입력 중인 글을 지우면 안 된다.
  const seeded = useRef(false);

  /**
   * 탭으로 돌아올 때마다 다시 읽는다.
   *
   * 탭 화면은 한 번 뜨면 계속 살아 있어서, 마운트 때만 읽으면 앱을 켜둔 동안 화면이 그대로 굳는다.
   * 자정을 넘겨 질문이 바뀌어도, 하트나 편지로 지난 상대의 남은 기간이 달라져도 알 수 없다.
   */
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const t = await getToday();
          if (!active) return;
          setToday(t);
          if (!seeded.current) {
            setDraft(t.myAnswer ?? '');
            seeded.current = true;
          }
          loadPeers(); // 답변 전에도 상대 프로필은 미리보기
          getPastPeers().then((p) => active && setPastPeers(p)).catch(() => {}); // 지난 상대는 보조 정보
        } catch (e) {
          if (!active) return;
          if (isSessionExpired(e)) {
            router.replace('/'); // 세션 만료 — 에러 알림 대신 로그인으로
            return;
          }
          Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [router]),
  );

  async function submit() {
    if (draft.trim().length < ANSWER_MIN || submitting) return;
    setSubmitting(true);
    try {
      const wasAnswered = today?.answered ?? false;
      const updated = await answerToday(draft.trim());
      track('answer_submitted', { inkEarned: updated.inkEarned });
      setToday(updated);
      setDraft(updated.myAnswer ?? '');
      setEditing(false);
      // 오늘의 답변으로 고인 잉크 — 칩을 그 자리에서 올리고, 어디서 늘었는지 한 줄로 알려준다.
      if (updated.inkEarned > 0) setInkEarnedNote(updated.inkEarned);
      if (!wasAnswered && updated.answered) loadPeers();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  }

  /** 오늘 쓴 답변을 그대로 프로필 문답으로. 같은 질문이면 덮어쓰고, 3개가 넘으면 서버가 안내한다. */
  async function promoteToProfile() {
    if (!today?.questionId || !today.myAnswer) return;
    try {
      await writeLetter(today.questionId, today.myAnswer);
      Alert.alert('프로필에 올렸어요', '상대가 내 프로필 상세에서 이 답변을 볼 수 있어요.');
    } catch (e) {
      Alert.alert('올리지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    }
  }

  function startEdit() {
    setDraft(today?.myAnswer ?? '');
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(today?.myAnswer ?? '');
    setEditing(false);
    setComposing(false);
  }

  const isEditing = !today?.answered || editing;
  const editorOpen = isEditing && (today?.answered ? true : composing);

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
            {/*
             * 오늘의 표지 — 질문이 곧 헤더다.
             * 작은 카드에 가두지 않고 화면 첫 면을 내준다. 날짜는 캡션으로.
             */}
            <Animated.View
              entering={FadeIn.duration(320)}
              style={[styles.cover, { backgroundColor: c.primary + '14' }]}
            >
              {/* 잉크 잔액 칩은 뺐다 — 잔액은 지갑에서만, 모자라면 그 순간 충전으로 보낸다(유저 결정 2026-08-24). */}
              <View style={styles.topRow}>
                <Text style={[styles.dateCaption, { color: c.primaryStrong }]}>{todayCaption()}</Text>
              </View>
              <Text style={[styles.questionEyebrow, { color: c.textSecondary }]}>오늘의 질문</Text>
              <Text style={[styles.question, { color: c.text, fontFamily: Fonts.serif }]}>{today?.content}</Text>

              {isEditing ? (
                editorOpen ? (
                  /*
                   * 답변 종이 — 쓰는 모습이 저장 후 읽는 모습과 같다.
                   * 표지 위에 흰 종이 한 장을 올리고, 그 안에서 왼쪽 테라코타 선 + 인용체로 쓴다.
                   * 카운터·취소·저장은 종이 아래 한 줄에 모아 "폼"이 아니라 "한 장"으로 읽히게 한다.
                   */
                  <View style={[styles.sheet, { backgroundColor: c.backgroundElement }]}>
                    <View style={styles.sheetBody}>
                      <View style={[styles.myAnswerRule, { backgroundColor: c.primary }]} />
                      <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        placeholder="오늘의 마음을 적어보세요"
                        placeholderTextColor={c.textSecondary}
                        multiline
                        autoFocus
                        maxLength={ANSWER_MAX}
                        scrollEnabled={false}
                        style={[styles.input, { color: c.text, fontFamily: Fonts.serif }]}
                      />
                    </View>
                    <View style={[styles.sheetFoot, { borderTopColor: c.border }]}>
                      <AnswerCounter length={draft.trim().length} c={c} />
                      <View style={styles.editorActions}>
                        <Pressable onPress={cancelEdit} disabled={submitting} style={styles.cancel} hitSlop={6}>
                          <Text style={{ color: c.textSecondary, fontSize: 15, fontWeight: '600' }}>취소</Text>
                        </Pressable>
                        <Pressable
                          onPress={submit}
                          disabled={draft.trim().length < ANSWER_MIN || submitting}
                          style={[styles.submit, { backgroundColor: c.primary, opacity: draft.trim().length < ANSWER_MIN || submitting ? 0.4 : 1 }]}
                        >
                          <Text style={[styles.submitText, { color: c.primaryText }]}>
                            {submitting ? '저장 중...' : today?.answered ? '수정 완료' : '답변 남기기'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ) : (
                  // 입구 한 줄 — 빈 입력칸과 버튼이 늘 떠 있으면 화면이 폼처럼 보인다.
                  <Pressable
                    onPress={() => setComposing(true)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.composeEntry, { backgroundColor: c.backgroundElement, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.composeEntryText, { color: c.textSecondary }]}>답을 적어보세요</Text>
                    <Ionicons name="arrow-forward" size={16} color={c.primaryStrong} />
                  </Pressable>
                )
              ) : (
                <View style={styles.myAnswerBlock}>
                  <View style={[styles.myAnswerRule, { backgroundColor: c.primary }]} />
                  <View style={styles.flex}>
                    <Text
                      style={[styles.myAnswerText, { color: c.text, fontFamily: Fonts.serif }]}
                      numberOfLines={answerExpanded ? undefined : 4}
                    >
                      {today?.myAnswer}
                    </Text>
                    {(today?.myAnswer?.length ?? 0) > 100 && (
                      <Pressable onPress={() => setAnswerExpanded((v) => !v)} hitSlop={6} style={styles.moreBtn}>
                        <Text style={{ color: c.primaryStrong, fontSize: 14, fontWeight: '600' }}>
                          {answerExpanded ? '접기' : '더보기'}
                        </Text>
                      </Pressable>
                    )}
                    <View style={styles.answerActions}>
                      <Text style={[styles.answeredTag, { color: c.primaryStrong }]}>
                        ✓ 오늘 답변했어요{inkEarnedNote ? ` · 잉크 +${inkEarnedNote}` : ''}
                      </Text>
                      <View style={styles.answerLinks}>
                        <Pressable onPress={startEdit} hitSlop={8}>
                          <Text style={[styles.answerLink, { color: c.textSecondary }]}>수정</Text>
                        </Pressable>
                        <Text style={[styles.answerLinkDot, { color: c.textSecondary }]}>·</Text>
                        <Pressable onPress={promoteToProfile} hitSlop={8}>
                          <Text style={[styles.answerLink, { color: c.textSecondary }]}>프로필에 올리기</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </Animated.View>

            {/* 오늘의 상대 — 하루 한 사람. 도착한 편지처럼, 크게 한 장. */}
            <View style={styles.peerSection}>
              <View style={styles.peerHeader}>
                <Text style={[styles.peerEyebrow, { color: c.primaryStrong }]}>오늘의 상대</Text>
                <Text style={[styles.peerSub, { color: c.textSecondary }]}>매일 정오, 한 사람</Text>
              </View>

              {peersLoading && !peersData ? (
                <ActivityIndicator color={c.primary} style={{ marginTop: 16 }} />
              ) : !peersData || !peersData.open ? (
                <ArrivalCountdown answered={today?.answered ?? false} c={c} />
              ) : !peersData.answerUnlocked ? (
                // 답을 남겨야 상대가 보인다 — "후보가 없다"와 다른 상황이라 문구를 나눈다
                <EmptyPeer
                  c={c}
                  title="오늘의 답변을 먼저 남겨주세요"
                  body="답을 남기면 오늘의 상대를 만날 수 있어요."
                  action="답 쓰러 가기"
                  onAction={() => setComposing(true)}
                />
              ) : peersData.peers.length === 0 ? (
                // 하루 한 명이라 후보가 없는 날이 생긴다. 서버는 조회할 때마다 빈자리를 채우므로
                // "오늘은 끝"이 아니라 "아직"이라는 걸 알려준다 — 저녁에 답한 사람이 생기면 그때 소개된다.
                <EmptyPeer c={c} title="오늘은 아직 인연이 닿지 않았어요" body="새로 답을 남긴 분이 생기면 바로 소개해 드릴게요." />
              ) : (
                <PeerCarousel peers={peersData.peers} question={today?.content ?? null} c={c} />
              )}
            </View>

            {/* 지난 상대 — 발견은 "오늘"로 끝난다. 여운은 아래에 한 줄로만. */}
            {pastPeers.length > 0 && (
              <Pressable
                onPress={() => router.push('/past-peers')}
                hitSlop={6}
                style={({ pressed }) => [styles.pastEntry, { opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={styles.pastFaces}>
                  {pastPeers.slice(0, 3).map((p, i) => (
                    <View
                      key={p.peer.peerAnswerId ?? i}
                      style={[
                        styles.pastFace,
                        { backgroundColor: c.backgroundSelected, borderColor: c.background },
                        i > 0 && styles.pastFaceOverlap,
                      ]}
                    >
                      {p.peer.photoUrls[0] ? (
                        <Image source={{ uri: p.peer.photoUrls[0] }} style={styles.pastFaceFill} contentFit="cover" />
                      ) : (
                        <Avatar avatarId={p.peer.avatarId} nickname={p.peer.nickname ?? undefined} size={22} c={c} />
                      )}
                    </View>
                  ))}
                </View>
                <Text style={[styles.pastEntryLabel, { color: c.textSecondary }]}>지난 상대 {pastPeers.length}명 보기 ›</Text>
              </Pressable>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * 정오 전 — 기다림을 콘텐츠로. 남은 시간을 분 단위로 세며 "도착"이라는 말을 미리 건넨다.
 * 답을 아직 안 썼으면 그 사이 할 일을 같이 알려준다.
 */
/**
 * 답변 종이 아래 안내 한 줄.
 * 비어 있을 땐 규칙을, 모자랄 땐 "앞으로 몇 자"를, 넘겼으면 글자 수만 조용히 보여준다.
 * "15자 이상 · 3/300"처럼 숫자를 두 개 나란히 두면 폼 검증 메시지처럼 읽힌다.
 */
function AnswerCounter({ length, c }: { length: number; c: ThemeColors }) {
  if (length === 0) {
    return <Text style={[styles.counter, { color: c.textSecondary }]}>{ANSWER_MIN}자부터 남길 수 있어요</Text>;
  }
  if (length < ANSWER_MIN) {
    return <Text style={[styles.counter, { color: c.primaryStrong, fontWeight: '600' }]}>앞으로 {ANSWER_MIN - length}자</Text>;
  }
  return (
    <Text style={[styles.counter, { color: length >= ANSWER_MAX - 20 ? c.primaryStrong : c.textSecondary }]}>
      {length}/{ANSWER_MAX}
    </Text>
  );
}

function ArrivalCountdown({ answered, c }: { answered: boolean; c: ThemeColors }) {
  const [remaining, setRemaining] = useState(() => msUntilNoonKst());
  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilNoonKst()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Animated.View entering={FadeInDown.duration(380)} style={[styles.peerCard, styles.countdown, { backgroundColor: c.backgroundElement }]}>
      <Image source={require('@/assets/images/brand-mark.png')} style={styles.countdownMark} contentFit="contain" />
      <Text style={[styles.countdownTitle, { color: c.text, fontFamily: Fonts.serif }]}>
        {remaining > 0 ? `오늘의 상대가 ${countdownLabel(remaining)} 도착해요` : '오늘의 상대가 곧 도착해요'}
      </Text>
      <Text style={[styles.countdownBody, { color: c.textSecondary }]}>
        {answered ? '정오가 되면 같은 질문에 답한 한 사람이 여기에 도착해요.' : '그동안 오늘의 질문에 답을 남겨두세요.\n답을 남겨야 상대의 답도 열려요.'}
      </Text>
    </Animated.View>
  );
}

function EmptyPeer({
  c,
  title,
  body,
  action,
  onAction,
}: {
  c: ThemeColors;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[styles.peerCard, styles.countdown, { backgroundColor: c.backgroundElement }]}>
      <Image source={require('@/assets/images/brand-mark.png')} style={styles.countdownMark} contentFit="contain" />
      <Text style={[styles.countdownTitle, { color: c.text, fontFamily: Fonts.serif }]}>{title}</Text>
      <Text style={[styles.countdownBody, { color: c.textSecondary }]}>{body}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.countdownAction}>
          <Text style={[styles.countdownActionText, { color: c.primaryStrong }]}>{action} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** 상대 카드 캐러셀 — 옆 카드가 살짝 보이게 가로로 넘긴다. 한 명이면 그냥 꽉 채운다. */
function PeerCarousel({ peers, question, c }: { peers: Peer[]; question: string | null; c: ThemeColors }) {
  const [width, setWidth] = useState(0);
  const cardWidth = peers.length > 1 ? width - 28 : width;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + 12}
          decelerationRate="fast"
          disableIntervalMomentum
          style={styles.carouselScroll}
          contentContainerStyle={styles.carouselContent}
        >
          {peers.map((peer, i) => (
            <View key={peer.peerAnswerId ?? i} style={{ width: cardWidth }}>
              <PeerCard peer={peer} question={question} c={c} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * 가려진 답변 자리의 스켈레톤 세 줄 — 글이 있다는 것만 알리고 내용은 감춘다.
 * 줄 길이를 다르게 두어 "문장"처럼 보이게 한다. 답변 글줄(lineHeight 27)과 같은 리듬.
 */
/**
 * 가려진 답변 — 실제 텍스트는 렌더링하지 않는다(캡처로 새지 않게).
 * 스켈레톤 줄무늬 대신 닫힌 편지 같은 단색 면 하나 — 답은 "봉투 안"에 있다.
 */
function MaskedAnswer({ icon, hint, tint, c }: { icon: keyof typeof Ionicons.glyphMap; hint: string; tint: string; c: ThemeColors }) {
  return (
    <View style={[styles.maskPanel, { backgroundColor: c.backgroundSelected }]} pointerEvents="none">
      <Ionicons name={icon} size={18} color={tint} />
      <Text style={[styles.revealHintText, { color: tint }]}>{hint}</Text>
    </View>
  );
}

/**
 * 상대 1명 카드 — "사진보다 생각이 먼저".
 * 같은 질문에 대한 상대의 답이 카드의 첫 줄이고, 사진은 그 뒤에 온다. 하트는 상세(청첩장)의 플로팅 버튼에서만.
 */
function PeerCard({ peer, question, c }: { peer: Peer; question: string | null; c: ThemeColors }) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  /** 상세 화면으로 — 나머지 사진과 프로필 전체, 하트는 거기서. 오늘의 질문도 함께 넘긴다. */
  function openDetail() {
    // 상대가 답한 질문이 오늘 질문과 다를 수 있다 — 상대 쪽 값을 우선한다
    router.push({ pathname: '/peer', params: { data: JSON.stringify(peer), question: peer.question ?? question ?? '' } });
  }

  const keywords = [...peer.hobbies, ...peer.interests, ...peer.strengths].slice(0, 4);

  return (
    <Animated.View entering={FadeInDown.duration(420)} style={[styles.peerCard, { backgroundColor: c.backgroundElement }]}>
      {/* 1) 답변 — 카드의 첫인상. 열리기 전에는 흐리게, 탭하면 선명해진다. */}
      <View style={styles.peerAnswerBlock}>
        <Text style={[styles.peerAnswerQuestion, { color: c.textSecondary }]} numberOfLines={2}>
          {peer.question ?? question ?? '같은 질문에 남긴 답'}
        </Text>
        {peer.answerUnlocked && peer.peerAnswer ? (
          <>
            {/* 가려진 답변은 진짜 텍스트 대신 스켈레톤 줄로 그린다.
                예전의 투명 글자 + textShadow 블러는 iOS에서만 흐릿하게 보였고,
                Android에서는 그림자 렌더링이 달라 아예 비거나 이상하게 나왔다.
                실제 텍스트를 렌더링하지 않으니 캡처로 새어 나갈 것도 없다. */}
            {revealed ? (
              <>
                <Text
                  numberOfLines={expanded ? undefined : 6}
                  style={[styles.peerAnswer, { fontFamily: Fonts.serif, color: c.text }]}
                >
                  {peer.peerAnswer}
                </Text>
                {(peer.peerAnswer?.length ?? 0) > 140 && (
                  <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={6} style={styles.moreBtn}>
                    <Text style={{ color: c.primaryStrong, fontSize: 14, fontWeight: '600' }}>{expanded ? '접기' : '더보기'}</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <Pressable onPress={() => setRevealed(true)} accessibilityRole="button" accessibilityLabel="탭하여 답변 읽기">
                <MaskedAnswer icon="mail-outline" hint="탭하여 답변 읽기" tint={c.primaryStrong} c={c} />
              </Pressable>
            )}
          </>
        ) : (
          <MaskedAnswer icon="lock-closed" hint="내 답을 남기면 열려요" tint={c.textSecondary} c={c} />
        )}
      </View>

      {/* 2) 사진 — 카드 폭 전체, 4:5. 글자는 사진 위에 얹지 않고 면에 앉힌다(MY 프로필 카드와 같은 규칙). */}
      {peer.photoUrls.length > 0 && (
        <Pressable onPress={openDetail}>
          <Image
            source={{ uri: peer.photoUrls[0] }}
            style={[styles.peerPhoto, { backgroundColor: c.backgroundSelected }]}
            contentFit="cover"
            transition={200}
          />
          {peer.photoUrls.length > 1 && (
            <View style={[styles.photoBadge, { backgroundColor: c.background }]}>
              <Text style={[styles.photoBadgeText, { color: c.text }]}>+{peer.photoUrls.length - 1}</Text>
            </View>
          )}
        </Pressable>
      )}

      {/* 3) 누구인지 — 이름·메타 한 줄, 키워드 몇 개, 그리고 상세로. */}
      <Pressable onPress={openDetail} style={styles.peerBody}>
        <View style={styles.peerHead}>
          {peer.photoUrls.length === 0 && <Avatar avatarId={peer.avatarId} size={46} c={c} />}
          <View style={styles.peerHeadBody}>
            {peer.nickname ? (
              <Text style={[styles.peerName, { color: c.text, fontFamily: Fonts.serif }]}>{peer.nickname}</Text>
            ) : null}
            <Text style={[styles.peerMeta, { color: c.textSecondary }]}>{peerMetaLabel(peer)}</Text>
          </View>
          <View style={[styles.detailCta, { backgroundColor: c.backgroundSelected }]}>
            <Text style={[styles.detailCtaText, { color: c.text }]}>프로필 보기</Text>
          </View>
        </View>
        {/* 자기소개 — 상대가 먼저 건네는 인사 한 문단. 두 줄만, 나머지는 상세에서. */}
        {peer.bio ? (
          <Text style={[styles.peerBio, { color: c.text }]} numberOfLines={2}>
            {peer.bio}
          </Text>
        ) : null}
        {keywords.length > 0 && (
          <View style={styles.peerChips}>
            {keywords.map((k) => (
              <View key={k} style={[styles.peerChip, { borderColor: c.border }]}>
                <Text style={{ color: c.textSecondary, fontSize: 13 }}>{k}</Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 8 }, // 아래 여백은 렌더 시 탭바·세이프에어리어를 더해 덮어쓴다

  // ── 오늘의 표지 ──
  // 화면 가장자리까지 면을 내어 "카드"가 아니라 "표지"로 읽히게 한다. 색은 테라코타 8% 한 겹뿐.
  cover: { marginHorizontal: -20, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 26, borderBottomLeftRadius: Radius.lg + 8, borderBottomRightRadius: Radius.lg + 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  dateCaption: { fontSize: 13.5, fontWeight: '700', letterSpacing: 0.3 },
  questionEyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8 },
  // 질문이 곧 헤더 — 크게, 왼쪽 정렬, 줄 간격 넉넉히.
  question: { fontSize: 27, fontWeight: '700', lineHeight: 38, letterSpacing: -0.3 },

  composeEntry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, height: 52, paddingHorizontal: 18, borderRadius: Radius.md },
  composeEntryText: { fontSize: 16 },
  // 답변 종이 — 표지 위 흰 면 한 장. 글줄은 저장 후의 내 답(17.5/27)과 같은 리듬.
  sheet: { marginTop: 20, borderRadius: Radius.lg, paddingTop: 18, paddingHorizontal: 20, overflow: 'hidden' },
  sheetBody: { flexDirection: 'row', gap: 14, paddingBottom: 12 },
  input: { flex: 1, minHeight: 27 * 4, fontSize: 17.5, lineHeight: 27, padding: 0, paddingTop: 0, textAlignVertical: 'top' },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  editorActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  counter: { fontSize: 13.5 },
  cancel: { padding: 4 },
  submit: { height: 38, paddingHorizontal: 16, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 15, fontWeight: '700' },

  // 내 답 — 질문 아래 인용처럼. 왼쪽 테라코타 선 한 줄이 "내 목소리"라는 표시.
  myAnswerBlock: { flexDirection: 'row', marginTop: 20, gap: 14 },
  myAnswerRule: { width: 2, borderRadius: 1, marginTop: 4, marginBottom: 4 },
  myAnswerText: { fontSize: 17.5, lineHeight: 27 },
  moreBtn: { marginTop: 8, alignSelf: 'flex-start' },
  answerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 6 },
  answeredTag: { fontSize: 13.5, fontWeight: '700' },
  answerLinks: { flexDirection: 'row', alignItems: 'center' },
  answerLink: { fontSize: 14, fontWeight: '600' },
  answerLinkDot: { marginHorizontal: 7, fontSize: 14 },

  // ── 오늘의 상대 ──
  peerSection: { marginTop: 30 },
  peerHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 2 },
  peerEyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  peerSub: { fontSize: 13.5 },
  // 카드가 화면 가장자리 밑으로 흐르게 좌우 패딩을 상쇄한다 — 옆 카드가 살짝 보이는 게 넘길 수 있다는 신호.
  carouselScroll: { marginHorizontal: -20, overflow: 'visible' },
  carouselContent: { paddingHorizontal: 20, gap: 12 },
  peerCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  peerAnswerBlock: { padding: 20, paddingBottom: 18 },
  peerAnswerQuestion: { fontSize: 13.5, lineHeight: 19, marginBottom: 8 },
  peerAnswer: { fontSize: 18, lineHeight: 27, fontWeight: '500' },
  // 가려진 답변의 스켈레톤 — 글줄(lineHeight 27)과 같은 간격으로 세 줄.
  maskPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 26,
    borderRadius: 14,
  },
  revealHintText: { fontSize: 14.5, fontWeight: '700' },
  // 4:5 세로 사진 — 소개팅 프로필의 표준 비율. 카드 폭을 꽉 채운다.
  peerPhoto: { width: '100%', aspectRatio: 4 / 5 },
  photoBadge: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill, opacity: 0.92 },
  photoBadgeText: { fontSize: 12, fontWeight: '700' },
  peerBody: { padding: 18, paddingTop: 16 },
  peerHead: { flexDirection: 'row', alignItems: 'center' },
  peerHeadBody: { flex: 1, marginLeft: 0 },
  peerName: { fontSize: 19, fontWeight: '700' },
  peerMeta: { fontSize: 14, marginTop: 2 },
  detailCta: { height: 34, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  detailCtaText: { fontSize: 14, fontWeight: '700' },
  peerBio: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  peerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  peerChip: { paddingHorizontal: 10, height: 26, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // 기다림·빈 상태 — 박스 대신 마크 한 점과 문장.
  countdown: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 28 },
  countdownMark: { width: 54, height: 40, marginBottom: 16 },
  countdownTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 26 },
  countdownBody: { fontSize: 14.5, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  countdownAction: { marginTop: 14, padding: 4 },
  countdownActionText: { fontSize: 15, fontWeight: '700' },

  // 지난 상대 — 한 줄 링크.
  pastEntry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 26, paddingVertical: 8 },
  pastFaces: { flexDirection: 'row' },
  pastFace: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pastFaceOverlap: { marginLeft: -8 },
  pastFaceFill: { width: '100%', height: '100%' },
  pastEntryLabel: { fontSize: 14.5, fontWeight: '600' },
});
