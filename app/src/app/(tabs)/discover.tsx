import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
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
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { JobBadge } from '@/components/job-badge';
import { Avatar } from '@/components/avatar';
import { BottomTabInset, Fonts, Radius, Type, type ThemeColors } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { answerToday, getPastPeers, getPeers, getToday, type Peer } from '@/lib/daily';
import { getInkBalance } from '@/lib/ink';
import { getTasteDeck } from '@/lib/taste';
import { writeLetter } from '@/lib/letters';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { useRefreshOnFocus, useSessionGuard } from '@/lib/query';
import { SignupGate } from '@/components/signup-gate';
import { useSession } from '@/lib/session';
import { Skeleton, SkeletonLines } from '@/components/skeleton';
import { useAppearance } from '@/lib/appearance';
import { showToast } from '@/components/toast';

// 답변 최소 분량 — 서버와 같은 값. "ㅇㅇ" 한 마디는 상대의 하루를 비운다.
const ANSWER_MIN = 10;
const ANSWER_MAX = 500;

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

/**
 * 발견 탭의 문지기.
 *
 * 1.3부터 모임은 가입 없이 둘러볼 수 있어서, 이 탭에도 손님과 '모임만 쓰는 회원'이 들어온다.
 * 문지기를 화면 본체 **바깥**에 세우는 이유는 하나다 — 본체가 마운트되면 오늘의 문답을 묻는
 * 쿼리가 먼저 나가고, 손님에게는 그게 403으로 돌아와 세션 만료로 읽혀 로그인 화면으로
 * 튕겨나간다. 둘러보러 온 사람을 문 밖으로 밀어내는 셈이다. 그래서 여기서 갈라선다.
 */
export default function DiscoverScreen() {
  const session = useSession();

  // 아직 누구인지 모른다 — 이 한 프레임에 손님으로 단정하면 회원에게 가입 유도가 번쩍인다.
  if (session.loading) return null;

  if (!session.signedIn) {
    return (
      <SignupGate
        mode="guest"
        icon="sparkles-outline"
        title={'하루에 한 사람,\n문답으로 알아가요'}
        lines={[
          '매일 같은 질문에 답한 사람 중 한 명이 소개돼요.',
          '사진보다 답변을 먼저 읽는 소개예요.',
        ]}
      />
    );
  }

  if (!session.dating) {
    return (
      <SignupGate
        mode="dating-off"
        icon="sparkles-outline"
        title="아직 소개를 받고 있지 않아요"
        lines={[
          '만나고 싶은 성별만 정하면 내일부터 소개가 시작돼요.',
          '모임은 지금처럼 그대로 쓸 수 있어요.',
        ]}
      />
    );
  }

  return <DiscoverBoard />;
}

function DiscoverBoard() {
  const c = useTheme();
  const isDark = useAppearance().scheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /*
   * 입력 중인 글. null이면 **아직 손대지 않은 상태**라 서버에 저장된 답을 그대로 비춘다.
   * 예전에는 첫 로드 때 ref로 한 번만 채워 넣었는데, 렌더 중 ref를 건드리는 방식이라
   * 갱신이 입력 중인 글을 지울 위험도, 규칙 위반도 함께 있었다. 파생값으로 두면 둘 다 사라진다.
   */
  const [typed, setTyped] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  // 답 쓰기 전에는 한 줄짜리 입구만 보인다 — 누르면 그 자리에서 에디터가 펼쳐진다.
  const [composing, setComposing] = useState(false);
  const [answerExpanded, setAnswerExpanded] = useState(false);
  // 이번 세션에 답변으로 고인 잉크 — 저장 직후 "✓ 오늘 답변했어요" 옆에 잠시 붙여 보여준다.
  const [inkEarnedNote, setInkEarnedNote] = useState(0);

  const queryClient = useQueryClient();

  /*
   * 서버 데이터 셋 — 캐시에 남아 있으면 탭을 다시 열 때 **비지 않고 그대로 그려진다**.
   * 갱신은 그 뒤에 조용히 일어난다(useRefreshOnFocus).
   */
  const todayQuery = useQuery({ queryKey: ['daily', 'today'], queryFn: getToday });
  const peersQuery = useQuery({ queryKey: ['daily', 'peers'], queryFn: getPeers });
  // 지난 상대는 보조 정보 — 실패해도 화면은 유지된다.
  const pastQuery = useQuery({ queryKey: ['daily', 'pastPeers'], queryFn: getPastPeers });
  // 잉크 잔액 — 편지를 보내고 돌아와도 맞게. 실패하면 칩을 그리지 않는다.
  const inkQuery = useQuery({ queryKey: ['ink', 'balance'], queryFn: getInkBalance });
  // 남은 카드가 있는지만 보면 되는 값이라 가볍게 — 실패하면 카드 자리를 그리지 않을 뿐이다.
  const tasteQuery = useQuery({ queryKey: ['taste', 'deck'], queryFn: () => getTasteDeck() });
  const tasteDeck = tasteQuery.data;

  const today = todayQuery.data ?? null;
  const peersData = peersQuery.data ?? null;
  const pastPeers = pastQuery.data ?? [];
  const peersLoading = peersQuery.isPending;
  const ink = inkQuery.data ?? null;

  // refetch는 React Query가 안정적으로 유지한다 — 쿼리 객체를 의존성에 두면 매 렌더 바뀐다.
  const { refetch: refetchToday } = todayQuery;
  const { refetch: refetchPeers } = peersQuery;
  const { refetch: refetchPast } = pastQuery;
  const { refetch: refetchInk } = inkQuery;
  // 카드를 넘기고 돌아온 사람에게 어제 숫자를 보여주지 않는다.
  const { refetch: refetchTaste } = tasteQuery;
  const refreshAll = useCallback(() => {
    void refetchToday();
    void refetchPeers();
    void refetchPast();
    void refetchInk();
    void refetchTaste();
  }, [refetchToday, refetchPeers, refetchPast, refetchInk, refetchTaste]);
  useRefreshOnFocus(refreshAll);

  // 세션 만료는 "HTTP 403" 알림이 아니라 로그인 화면으로 답한다.
  const toLogin = useCallback(() => router.replace('/'), [router]);
  useSessionGuard(todayQuery.error, toLogin);

  const draft = typed ?? today?.myAnswer ?? '';

  async function submit() {
    if (draft.trim().length < ANSWER_MIN || submitting) return;
    setSubmitting(true);
    try {
      const wasAnswered = today?.answered ?? false;
      const updated = await answerToday(draft.trim());
      track('answer_submitted', { inkEarned: updated.inkEarned });
      haptics.success(); // 오늘의 한 편을 남긴 순간 — 손에도 남게
      // 서버가 준 최신값을 캐시에 그대로 얹는다. 다시 물을 필요가 없다.
      queryClient.setQueryData(['daily', 'today'], updated);
      setTyped(null); // 저장했으니 다시 서버 값을 비춘다
      setEditing(false);
      // 오늘의 답변으로 고인 잉크 — 칩을 그 자리에서 올리고, 어디서 늘었는지 한 줄로 알려준다.
      if (updated.inkEarned > 0) {
        // 서버를 다시 묻지 않고 캐시를 올린다 — 상이 도착하는 순간과 숫자가 어긋나면 안 된다.
        queryClient.setQueryData(['ink', 'balance'], (n: number | undefined) =>
          n == null ? n : n + updated.inkEarned,
        );
        setInkEarnedNote(updated.inkEarned);
      }
      // 답을 남기면 그 자리에서 상대가 도착한다 — 이월 카드가 새 사람으로 바뀌는 순간.
      if (!wasAnswered && updated.answered) {
        void queryClient.invalidateQueries({ queryKey: ['daily', 'peers'] });
        void queryClient.invalidateQueries({ queryKey: ['daily', 'pastPeers'] });
      }
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  }

  /** 오늘 쓴 답변을 그대로 프로필 문답으로. 같은 질문이면 덮어쓰고, 상한을 넘으면 서버가 안내한다. */
  async function promoteToProfile() {
    if (!today?.questionId || !today.myAnswer) return;
    try {
      await writeLetter(today.questionId, today.myAnswer);
      haptics.success();
      showToast('프로필에 올렸어요 · 상대가 볼 수 있어요');
    } catch (e) {
      Alert.alert('올리지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    }
  }

  function startEdit() {
    setTyped(null);
    setEditing(true);
  }

  function cancelEdit() {
    setTyped(null);
    setEditing(false);
    setComposing(false);
  }

  // 아직 오늘 답하지 않아 지난번 상대가 그 자리를 지키고 있는 상태. 서버가 판정해 내려준다.
  const carriedOver = (peersData?.carriedOver ?? false) && (peersData?.peers.length ?? 0) > 0;

  const isEditing = !today?.answered || editing;
  const editorOpen = isEditing && (today?.answered ? true : composing);

  /*
   * 생애 첫 로딩에만 보이는 자리 표시 — 캐시가 있으면 여기까지 오지 않는다.
   * 스피너 대신 **들어올 내용과 같은 모양**을 그린다: 표지(눈썹·질문 두 줄·입구)와 상대 카드.
   * 채워질 때 화면이 튀지 않고, 무엇을 기다리는지도 읽힌다.
   */
  if (todayQuery.isPending && !today) {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.content}>
            <View style={[styles.cover, { backgroundColor: c.primary + '14' }]}>
              <View style={styles.topRow}>
                <Skeleton c={c} width={92} height={14} />
              </View>
              <SkeletonLines c={c} lines={2} lineHeight={28} gap={12} />
              <Skeleton c={c} height={60} radius={Radius.lg} style={styles.skeletonEntry} />
            </View>
            <View style={styles.peerSection}>
              <View style={styles.peerHeader}>
                <Skeleton c={c} width={72} height={14} />
              </View>
              <Skeleton c={c} height={260} radius={Radius.lg} />
            </View>
          </View>
        </SafeAreaView>
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
              // 쓰는 동안 표지를 한 톤 가라앉힌다(8% → 16%) — 색을 늘리지 않고 명도 차로 종이를 띄운다.
              style={[styles.cover, { backgroundColor: c.primary + (editorOpen ? '29' : '14') }]}
            >
              {/* 잉크 잔액 칩은 뺐다 — 잔액은 지갑에서만, 모자라면 그 순간 충전으로 보낸다(유저 결정 2026-08-24). */}
              <View style={styles.topRow}>
                <Text style={[styles.dateCaption, { color: c.textSecondary }]}>{todayCaption()}</Text>
                {/*
                 * 잉크 잔액 — 결정을 재촉하지 않는 자리에만 둔다.
                 * 편지를 쓸지 말지 정하는 순간의 '(남은 잉크 N)'은 산수를 앞세우지만,
                 * 둘러보다 눈에 스치는 숫자는 "나한테 잉크라는 게 있구나"를 알려줄 뿐이다.
                 * 여기가 지갑으로 가는 유일한 상시 통로이기도 하다.
                 */}
                {ink != null && (
                  <Pressable
                    onPress={() => router.push('/my/ink')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`남은 잉크 ${ink}, 지갑 열기`}
                    style={({ pressed }) => [styles.inkChip, { backgroundColor: c.backgroundElement, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Ionicons name="water" size={12} color={c.primaryStrong} />
                    <Text style={[styles.inkChipText, { color: c.text }]}>{ink}</Text>
                  </Pressable>
                )}
              </View>
              {/*
                * 눈썹("오늘의 질문")은 뺐다 — 날짜 캡션이 이미 '오늘'을 말하고, 물음표로 끝나는 큰 글자가
                * 질문이라는 걸 말한다. 같은 말을 두 번 하는 줄은 화면을 설명서로 만든다.
                */}
              <Text style={[styles.question, { color: c.text, fontFamily: Fonts.serif }]}>{today?.content}</Text>

              {isEditing ? (
                editorOpen ? (
                  <AnswerSheet c={c} isDark={isDark}>
                    <View style={styles.sheetBody}>
                      <TextInput
                        value={draft}
                        onChangeText={setTyped}
                        placeholder="오늘의 마음을 적어보세요"
                        placeholderTextColor={c.textSecondary}
                        multiline
                        autoFocus
                        maxLength={ANSWER_MAX}
                        scrollEnabled={false}
                        cursorColor={c.primary}
                        selectionColor={c.primary}
                        style={[styles.input, { color: c.text, fontFamily: Fonts.serif }]}
                      />
                    </View>
                    {/* 최소 분량까지 차오르는 선 — 규칙을 읽히는 대신 보이게 한다. */}
                    <MinProgress length={draft.trim().length} c={c} />
                    <View style={styles.sheetFoot}>
                      <AnswerCounter length={draft.trim().length} c={c} />
                      <View style={styles.rowActions}>
                        <Pressable onPress={cancelEdit} disabled={submitting} style={styles.cancel} hitSlop={6}>
                          <Text style={[styles.link, { color: c.textSecondary }]}>취소</Text>
                        </Pressable>
                        <Pressable
                          onPress={submit}
                          disabled={draft.trim().length < ANSWER_MIN || submitting}
                          style={[
                            styles.submit,
                            { backgroundColor: c.primary, opacity: draft.trim().length < ANSWER_MIN || submitting ? 0.35 : 1 },
                          ]}
                        >
                          <Text style={[styles.submitText, { color: c.primaryText }]}>
                            {submitting ? '저장 중' : today?.answered ? '수정 완료' : '남기기'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </AnswerSheet>
                ) : (
                  /*
                   * 입구 — 빈 입력칸과 버튼이 늘 떠 있으면 화면이 폼으로 읽힌다.
                   * 대신 답이 놓일 자리에 **빈 종이 한 장**을 미리 깔아둔다(저장 후와 같은 면·같은 그림자).
                   * 누르면 그 종이가 그 자리에서 펼쳐진다 — 새 화면으로 넘어가지 않는다.
                   */
                  <>
                  <Pressable
                    onPress={() => setComposing(true)}
                    accessibilityRole="button"
                    accessibilityLabel="오늘의 질문에 답 쓰기"
                    style={({ pressed }) => [
                      styles.composeEntry,
                      { backgroundColor: c.backgroundElement },
                      isDark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border } : styles.sheetShadow,
                      pressed && styles.composeEntryPressed,
                    ]}
                  >
                    <View style={[styles.composeIcon, { backgroundColor: c.primary + '1F' }]}>
                      <Ionicons name="pencil" size={15} color={c.primaryStrong} />
                    </View>
                    <Text style={[styles.composeEntryText, { color: c.textSecondary }]}>답을 적어보세요</Text>
                  </Pressable>
                  </>
                )
              ) : (
                <AnswerSheet c={c} isDark={isDark}>
                  <Text
                    style={[styles.myAnswerText, { color: c.text, fontFamily: Fonts.serif }]}
                    numberOfLines={answerExpanded ? undefined : 5}
                  >
                    {today?.myAnswer}
                  </Text>
                  {(today?.myAnswer?.length ?? 0) > 120 && (
                    <Pressable onPress={() => setAnswerExpanded((v) => !v)} hitSlop={6} style={styles.moreBtn}>
                      <Text style={[styles.link, { color: c.primaryStrong }]}>{answerExpanded ? '접기' : '더보기'}</Text>
                    </Pressable>
                  )}
                  <View style={[styles.sheetFoot, styles.sheetFootRule, { borderTopColor: c.border }]}>
                    <Text style={[styles.answeredTag, { color: c.textSecondary }]}>
                      오늘 답변했어요{inkEarnedNote ? ` · 잉크 +${inkEarnedNote}` : ''}
                    </Text>
                    <View style={styles.rowActions}>
                      <Pressable onPress={startEdit} hitSlop={8}>
                        <Text style={[styles.link, { color: c.textSecondary }]}>수정</Text>
                      </Pressable>
                      <Pressable onPress={promoteToProfile} hitSlop={8}>
                        <Text style={[styles.link, { color: c.primaryStrong }]}>프로필에 올리기</Text>
                      </Pressable>
                    </View>
                  </View>
                </AnswerSheet>
              )}
            </Animated.View>

            {/*
             * 취향 카드 — 답을 쓰기 전에도, 쓰고 나서도 늘 있는 자리.
             *
             * 처음엔 답 쓰기 아래의 작은 글씨 한 줄이었는데, 작은 글씨는 아무도 안 누른다.
             * 카드로 세워야 "여기 할 게 하나 더 있다"가 보이고, 남은 장수를 적어 두면
             * 다 넘기지 않은 사람에게 돌아올 이유가 생긴다. 다 넘겼으면 사라진다 —
             * 할 일이 없는 자리를 남겨두면 화면만 길어진다.
             */}
            {tasteDeck && tasteDeck.cards.length > 0 && (
              <Pressable
                onPress={() => router.push('/taste-cards')}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.tasteCard,
                  {
                    backgroundColor: c.backgroundElement,
                    borderColor: c.primary + '55',
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={[styles.tasteIcon, { backgroundColor: c.primary + '1F' }]}>
                  <Ionicons name="albums" size={16} color={c.primaryStrong} />
                </View>
                <View style={styles.tasteBody}>
                  <Text style={[styles.tasteTitle, { color: c.text }]}>취향 카드</Text>
                  <Text style={[styles.tasteSub, { color: c.textSecondary }]}>
                    {tasteDeck.answered > 0
                      ? `${tasteDeck.answered}장 골랐어요 · 겹치는 사람이 먼저 소개돼요`
                      : '둘 중 하나만 고르면 돼요 · 겹치는 사람이 먼저 소개돼요'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
              </Pressable>
            )}

            {/* 오늘의 상대 — 하루 한 사람. 도착한 편지처럼, 크게 한 장. */}
            {/* 쓰는 동안은 아래를 흐린다 — 입력칸을 꾸미는 대신 주변을 가라앉혀 "지금은 쓰는 시간"을 만든다. */}
            <View style={[styles.peerSection, editorOpen && styles.dimmed]} pointerEvents={editorOpen ? 'none' : 'auto'}>
              {/* 부제는 뺐다 — "답을 남기면 새로 도착해요"는 바로 아래 카드가 이미 말한다. */}
              <View style={styles.peerHeader}>
                <Text style={[styles.peerEyebrow, { color: c.text }]}>
                  {carriedOver ? '지난번에 만난 사람' : '오늘의 상대'}
                </Text>
              </View>

              {peersLoading && !peersData ? (
                // 상대 카드가 들어올 자리 — 사진 한 장 크기의 면 하나로 둔다.
                <Skeleton c={c} height={260} radius={Radius.lg} />
              ) : carriedOver ? (
                // 답하기 전 — 자리를 비우지 않고 지난번에 만난 사람이 지킨다.
                // 카드 위 한 줄이 "이건 어제 것"임을 알리고, 아래 한 줄이 다음 행동을 준다.
                <>
                  <PeerCarousel peers={peersData!.peers} question={null} c={c} />
                  <Pressable onPress={() => setComposing(true)} hitSlop={8} style={styles.carryPrompt}>
                    <Text style={[styles.carryPromptText, { color: c.primaryStrong }]}>
                      답하고 새로운 사람 만나기 →
                    </Text>
                  </Pressable>
                </>
              ) : !peersData || !peersData.answerUnlocked ? (
                // 답을 남겨야 상대가 온다 — "후보가 없다"와 다른 상황이라 문구를 나눈다
                <EmptyPeer c={c} title="답을 남기면 오늘의 한 사람이 도착해요" action="답 쓰러 가기" onAction={() => setComposing(true)} />
              ) : peersData.peers.length === 0 ? (
                // 하루 한 명이라 후보가 없는 날이 생긴다. 서버는 조회할 때마다 빈자리를 채우므로
                // "오늘은 끝"이 아니라 "아직"이라는 걸 알려준다 — 저녁에 답한 사람이 생기면 그때 소개된다.
                <EmptyPeer c={c} title="오늘은 아직 인연이 닿지 않았어요" body="답을 남긴 분이 생기면 바로 소개해 드릴게요." />
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
                      {/*
                        * 26pt 동그라미에는 사진을 넣지 않는다(2026-08-25).
                        * 세로 사진을 원으로 자르면 얼굴 한 조각만 남아 누구인지 알아볼 수도 없고,
                        * 그 정도로 잘린 얼굴은 보기에 섬뜩하다. 여기는 '몇 명 있었다'는 표시일 뿐이다.
                        */}
                      <Avatar avatarId={p.peer.avatarId} nickname={p.peer.nickname ?? undefined} size={22} c={c} />
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
 * 답변 종이 — 쓰는 모습과 저장 후 읽는 모습이 **같은 한 장**이다.
 *
 * 예전에는 글 왼쪽에 테라코타 세로선을 세워 '내 목소리'를 표시했는데, 입력칸 왼쪽의
 * 굵은 세로 막대는 거대한 커서로 읽혀 "어디에 쓰는 거냐"는 말을 들었다(2026-08-31).
 * 표시는 종이 자체가 한다 — 선은 없앴다.
 */
function AnswerSheet({ c, isDark, children }: { c: ThemeColors; isDark: boolean; children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(240)}
      style={[
        styles.sheet,
        { backgroundColor: c.backgroundElement },
        // 종이가 표지 위에 떠 있다 — 라이트는 그림자로, 그림자가 안 보이는 다크는 경계선 하나로.
        isDark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border } : styles.sheetShadow,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * 최소 분량까지 차오르는 선.
 *
 * "10자부터 남길 수 있어요"를 읽게 하는 대신, 종이 아래 선이 차오르는 걸 보게 한다.
 * 다 차면 선은 사라진다 — 더 알려줄 게 없어서다. 그 자리에서 저장 버튼이 켜진다.
 */
function MinProgress({ length, c }: { length: number; c: ThemeColors }) {
  const ratio = Math.min(1, length / ANSWER_MIN);
  const fill = useSharedValue(ratio);
  const reached = useRef(ratio >= 1);

  useEffect(() => {
    fill.value = withTiming(ratio, { duration: 200 });
    // 문턱을 넘는 순간에만 한 번 — 글자마다 울리면 앱이 수다스러워진다.
    if (ratio >= 1 && !reached.current) haptics.select();
    reached.current = ratio >= 1;
  }, [ratio, fill]);

  const animated = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
    opacity: interpolate(fill.value, [0, 0.85, 1], [1, 1, 0]),
  }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
      <Animated.View style={[styles.progressFill, { backgroundColor: c.primary }, animated]} />
    </View>
  );
}

/**
 * 종이 아래 왼쪽 한 줄. 차오르는 선이 진행을 이미 말하므로 글자는 최소한만 남긴다.
 * 숫자를 두 개 나란히 두지 않는다 — 상한이 가까울 때만 분수로 바꾼다.
 */
function AnswerCounter({ length, c }: { length: number; c: ThemeColors }) {
  const text =
    length < ANSWER_MIN
      ? length === 0
        ? `${ANSWER_MIN}자부터`
        : `앞으로 ${ANSWER_MIN - length}자`
      : length > ANSWER_MAX - 40
        ? `${length}/${ANSWER_MAX}`
        : `${length}자`;
  return <Text style={[styles.counter, { color: c.textSecondary }]}>{text}</Text>;
}

/** 소개할 사람이 없을 때 — 설명 대신 다음 행동 하나를 건넨다. */
function EmptyPeer({
  c,
  title,
  body,
  action,
  onAction,
}: {
  c: ThemeColors;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[styles.peerCard, styles.emptyCard, { backgroundColor: c.backgroundElement }]}>
      <Image source={require('@/assets/images/brand-mark.png')} style={styles.emptyMark} contentFit="contain" />
      <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>{title}</Text>
      {body ? <Text style={[styles.emptyBody, { color: c.textSecondary }]}>{body}</Text> : null}
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.emptyAction}>
          <Text style={[styles.emptyActionText, { color: c.primaryStrong }]}>{action} →</Text>
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
 * 상대의 답(그 답의 질문과 함께)이 카드의 첫 줄이고, 사진은 그 뒤에 온다. 하트는 상세(청첩장)의 플로팅 버튼에서만.
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
          {peer.question ?? question ?? '질문에 남긴 답'}
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
                    <Text style={[styles.link, { color: c.primaryStrong }]}>{expanded ? '접기' : '더보기'}</Text>
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
            {/*
             * 직장 인증 배지 — 상세로 들어가야만 보이던 것을 카드로 올린다.
             * 인증의 값어치는 내 배지가 아니라 **남의 배지를 볼 때** 생긴다.
             * 하루에 한 사람을 소개받는 앱에서 그 한 사람의 신뢰 신호가 카드에 없으면,
             * 인증하고 싶어질 자리가 없다. 도메인까지 쓰면 이름 줄이 길어지므로 카드에서는 '직장 인증'만.
             */}
            {peer.jobVerified ? (
              <View style={styles.peerJobBadge}>
                <JobBadge c={c} />
              </View>
            ) : null}
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
        {/* 겹치는 취향 — 키워드보다 위에. "둘 다 골랐다"는 사실이 자기소개보다 먼저 눈에 들어와야 한다. */}
        {(peer.sharedTastes ?? []).length > 0 && (
          <View style={styles.peerChips}>
            {(peer.sharedTastes ?? []).slice(0, 2).map((taste) => (
              <View key={taste.cardId} style={[styles.tasteChip, { borderColor: c.primary, backgroundColor: c.primary + '14' }]}>
                <Text style={[styles.tasteChipText, { color: c.primaryStrong }]}>둘 다 · {taste.choice}</Text>
              </View>
            ))}
          </View>
        )}
        {keywords.length > 0 && (
          <View style={styles.peerChips}>
            {keywords.map((k) => (
              <View key={k} style={[styles.peerChip, { borderColor: c.border }]}>
                <Text style={[styles.peerChipText, { color: c.textSecondary }]}>{k}</Text>
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
  // 취향 카드 진입 — 답과 오늘의 상대 사이에 놓이는 한 줄짜리 카드. 테두리만 테라코타로 옅게.
  tasteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, paddingHorizontal: 16, paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1 },
  tasteIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tasteBody: { flex: 1 },
  tasteTitle: { ...Type.label },
  tasteSub: { ...Type.caption, marginTop: 3 },
  tasteChip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  tasteChipText: { ...Type.caption, fontWeight: '600' },
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 8 }, // 아래 여백은 렌더 시 탭바·세이프에어리어를 더해 덮어쓴다
  skeletonEntry: { marginTop: 24 },

  // ── 오늘의 표지 ──
  // 화면 가장자리까지 면을 내어 "카드"가 아니라 "표지"로 읽히게 한다. 색은 테라코타 8% 한 겹뿐.
  cover: {
    marginHorizontal: -20,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    borderBottomLeftRadius: Radius.lg + 8,
    borderBottomRightRadius: Radius.lg + 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  // 날짜는 회색으로 둔다 — 테라코타는 누를 수 있는 것에만.
  dateCaption: { ...Type.caption, fontWeight: '600' },
  inkChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 9, borderRadius: Radius.pill },
  inkChipText: { ...Type.caption, fontWeight: '600' },
  // 질문이 곧 헤더 — 화면에서 700 굵기를 쓰는 유일한 자리.
  question: { ...Type.display },

  // ── 답변 ──
  // 입구 — 답이 놓일 자리에 미리 깔아둔 빈 종이.
  composeEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, height: 60, paddingHorizontal: 18, borderRadius: Radius.lg },
  composeEntryPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  composeIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  composeEntryText: { ...Type.body },
  // 답변 종이 — 쓸 때도 읽을 때도 같은 한 장. overflow hidden 금지(iOS에서 그림자가 잘린다).
  sheet: { marginTop: 24, borderRadius: Radius.lg, paddingTop: 18, paddingHorizontal: 20 },
  sheetShadow: { shadowColor: '#1B2126', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  sheetBody: { paddingBottom: 14 },
  input: { ...Type.read, minHeight: 27 * 4, padding: 0, paddingTop: 0, textAlignVertical: 'top' },
  progressTrack: { height: 2, marginHorizontal: -20, overflow: 'hidden' },
  progressFill: { height: 2 },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingVertical: 12 },
  sheetFootRule: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counter: { ...Type.caption },
  cancel: { padding: 4 },
  submit: { height: 40, paddingHorizontal: 18, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  submitText: { ...Type.button },
  myAnswerText: { ...Type.read },
  moreBtn: { marginTop: 8, alignSelf: 'flex-start' },
  answeredTag: { ...Type.caption, fontWeight: '600' },
  /** 누를 수 있는 글자는 전부 이 하나 — 수정·더보기·취소가 서로 다른 크기였다. */
  link: { ...Type.label },

  // ── 오늘의 상대 ──
  peerSection: { marginTop: 32 },
  dimmed: { opacity: 0.35 },
  peerHeader: { marginBottom: 12, paddingHorizontal: 2 },
  peerEyebrow: { ...Type.label },
  // 카드가 화면 가장자리 밑으로 흐르게 좌우 패딩을 상쇄한다 — 옆 카드가 살짝 보이는 게 넘길 수 있다는 신호.
  carouselScroll: { marginHorizontal: -20, overflow: 'visible' },
  carouselContent: { paddingHorizontal: 20, gap: 12 },
  peerCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  peerJobBadge: { marginTop: 6 },
  peerAnswerBlock: { padding: 20, paddingBottom: 18 },
  peerAnswerQuestion: { ...Type.caption, marginBottom: 8 },
  peerAnswer: { ...Type.read },
  maskPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 26, borderRadius: Radius.sm + 2 },
  revealHintText: { ...Type.label },
  // 4:5 세로 사진 — 소개팅 프로필의 표준 비율. 카드 폭을 꽉 채운다.
  peerPhoto: { width: '100%', aspectRatio: 4 / 5 },
  photoBadge: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill, opacity: 0.92 },
  photoBadgeText: { ...Type.caption, fontWeight: '600' },
  peerBody: { padding: 18, paddingTop: 16 },
  peerHead: { flexDirection: 'row', alignItems: 'center' },
  peerHeadBody: { flex: 1 },
  peerName: { ...Type.title },
  peerMeta: { ...Type.caption, marginTop: 2 },
  detailCta: { height: 34, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  detailCtaText: { ...Type.label },
  peerBio: { ...Type.body, marginTop: 12 },
  peerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  peerChip: { paddingHorizontal: 10, height: 26, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  peerChipText: { ...Type.caption },

  // 빈 상태 — 상대 카드와 같은 면 위에 마크 하나와 한 줄.
  emptyCard: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 28 },
  emptyMark: { width: 54, height: 40, marginBottom: 16 },
  emptyTitle: { ...Type.title, textAlign: 'center' },
  emptyBody: { ...Type.body, textAlign: 'center', marginTop: 8 },
  emptyAction: { marginTop: 14, padding: 4 },
  emptyActionText: { ...Type.button },
  // 이월된 카드 아래 한 줄 — 다음 행동 하나.
  carryPrompt: { alignSelf: 'center', marginTop: 14, padding: 4 },
  carryPromptText: { ...Type.button },

  // 지난 상대 — 한 줄 링크.
  pastEntry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 26, paddingVertical: 8 },
  pastFaces: { flexDirection: 'row' },
  pastFace: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pastFaceOverlap: { marginLeft: -8 },
  pastEntryLabel: { ...Type.label },
});
