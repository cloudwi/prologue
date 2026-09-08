import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { PlaceholderInput } from '@/components/placeholder-input';
import { Fonts, Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';
import { chooseTaste, startTasteSession, getTasteSession, type TasteReward, TASTE_NOTE_MAX, type TasteCard, type TasteDeck, type TasteOption } from '@/lib/taste';

/**
 * 취향 카드 — 3~4개 중 하나를 고르는 가벼운 문답.
 *
 * 이 화면이 있는 이유는 하나다. 가입하고 처음 만나는 것이 **백지**였다는 것 —
 * 오늘의 문답은 열 자면 되지만, 막는 건 분량이 아니라 빈 화면이다. 카드는 탭 하나로 시작하게 하고,
 * 고르고 난 자리에 한 줄 칸을 열어둔다. 고른 다음의 한 줄은 백지 앞의 한 줄보다 훨씬 쉽다.
 *
 * 고른 뒤 통계를 잠깐 보여주고 자동 이동한다. 상단 카드 칸을 눌러 이전 답변을 다시 볼 수 있다.
 * 한 줄은 쓰고 싶은 사람만, 한 번 더 눌러서.
 *
 * 잉크는 여기서 나오지 않는다. 잉크는 글(오늘의 문답)의 몫이고, 카드가 돌려주는 것은
 * 더 맞는 상대다 — 겹치는 선택이 소개 순서에 실린다.
 */
/** 보상 배지가 떠 있는 시간(ms). 계속 붙어 있으면 그게 진행 표시가 된다. */
const REWARD_SHOWN_MS = 2600;
const AUTO_ADVANCE_MS = 500;

export default function TasteCardsScreen() {
  const c = useTheme();
  const router = useRouter();
  /** intro=1이면 가입 직후다 — 첫 화면에 왜 넘기는지 한 줄을 붙이고, 마치면 발견 탭으로 보낸다. */
  const { intro } = useLocalSearchParams<{ intro?: string }>();
  const isIntro = intro === '1';

  const autoAdvance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const sessionId = useRef<string | undefined>(undefined);
  const visibleIndex = useRef(0);
  const manualNavigationVersion = useRef(0);
  const pendingCardIds = useRef(new Set<number>());
  const [percentages, setPercentages] = useState<Partial<Record<TasteOption, number>> | null>(null);
  const [statistic, setStatistic] = useState<number | null>(null);
  const [cards, setCards] = useState<TasteCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingCardIds, setSavingCardIds] = useState<ReadonlySet<number>>(() => new Set());
  /** 방금 고른 쪽 — 카드가 넘어가기 전 잠깐 색이 차오르는 자리. */
  const [chosen, setChosen] = useState<TasteOption | null>(null);
  /**
   * 방금 받은 보상. 이정표를 밟은 순간에만 생기고 몇 초 뒤 사라진다.
   * 'arrived'는 상대가 그 자리에서 도착한 것, 'pending'은 지금 후보가 없어 기다리는 것.
   */
  const [reward, setReward] = useState<'arrived' | 'pending' | null>(null);
  const [rewardStatus, setRewardStatus] = useState<TasteReward | null>(null);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const apply = useCallback((deck: TasteDeck) => {
    sessionId.current = deck.sessionId;
    const all = deck.sessionCards?.length ? deck.sessionCards : deck.cards;
    setCards(all);
    setRewardStatus(deck.reward ?? null);
    const first = all.findIndex((item) => !item.myOption);
    const initialIndex = first >= 0 ? first : all.length;
    visibleIndex.current = initialIndex;
    setIndex(initialIndex);
    setChosen(null);
    setStatistic(null);
    setPercentages(null);
    setFailed(false);
  }, []);

  /** 다음 묶음을 받아온다. 스피너를 켜는 건 부르는 쪽 몫이다 — 마운트 시엔 이미 켜져 있다. */
  const load = useCallback(async () => {
    try {
      apply(await (sessionId.current ? getTasteSession(sessionId.current) : startTasteSession()));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    alive.current = true;
    track('taste_deck_opened');
    let active = true;
    startTasteSession()
      .then((deck) => active && apply(deck))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      alive.current = false;
      if (autoAdvance.current) clearTimeout(autoAdvance.current);
    };
  }, [apply]);

  // 배지는 잠깐 떠 있다 사라진다 — 계속 붙어 있으면 그게 진행 표시가 된다.
  useEffect(() => {
    if (reward == null) return;
    const timer = setTimeout(() => setReward(null), REWARD_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [reward]);

  const card = cards[index];
  const currentCardSaving = card ? savingCardIds.has(card.id) : false;
  /**
   * 이 화면을 떠난다. **왔던 곳으로 돌아가는 게 기본이다** — 발견 탭에서 들어온 사람을 MY로
   * 보내면 쓰던 흐름이 끊긴다(처음엔 그렇게 짜서 실제로 그랬다).
   * 가입 직후(intro)만 예외다: 그때는 뒤가 온보딩이라 돌아갈 곳이 아니고, 발견 탭이 목적지다.
   */
  const done = () => {
    if (autoAdvance.current) clearTimeout(autoAdvance.current);
    if (isIntro) {
      router.replace('/discover' as never);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // 뒤가 없는 경우(딥링크·알림으로 바로 열렸을 때)의 착지점.
    router.replace('/my' as never);
  };

  function navigateTo(next: number, snapshot = cards) {
    if (autoAdvance.current) clearTimeout(autoAdvance.current);
    autoAdvance.current = null;
    const target = snapshot[next];
    visibleIndex.current = next;
    setIndex(next);
    setChosen(target?.myOption ?? null);
    setPercentages(target?.optionPercentages ?? null);
    setStatistic(target?.myOption ? target.optionPercentages?.[target.myOption] ?? null : null);
    setNote('');
    setNoteOpen(false);
  }

  function nextUnanswered(snapshot = cards) {
    const unanswered = (item: TasteCard) => !item.myOption && !pendingCardIds.current.has(item.id);
    const after = snapshot.findIndex((item, i) => i > index && unanswered(item));
    const next = after >= 0 ? after : snapshot.findIndex(unanswered);
    return next >= 0 ? next : snapshot.length;
  }

  function openCard(next: number) {
    manualNavigationVersion.current += 1;
    haptics.select();
    navigateTo(next, cards);
  }

  async function choose(option: TasteOption) {
    if (!card || card.myOption || savingCardIds.has(card.id) || chosen != null) return;
    const answeredCardId = card.id;
    const answeredIndex = index;
    const navigationVersion = manualNavigationVersion.current;
    pendingCardIds.current.add(answeredCardId);
    setSavingCardIds((current) => new Set(current).add(answeredCardId));
    setCards((current) => current.map((item) => item.id === answeredCardId ? { ...item, myOption: option } : item));
    setChosen(option);
    haptics.select();
    const noted = note.trim().length > 0;
    try {
      if (!sessionId.current) throw new Error('Missing taste session');
      const progress = await chooseTaste(card.id, option, note.trim() || undefined, sessionId.current);
      if (!alive.current) return;
      const updated = cards.map((item) => item.id === answeredCardId
        ? { ...item, myOption: option, optionPercentages: progress.optionPercentages ?? null }
        : item);
      setCards((current) => current.map((item) => item.id === answeredCardId
        ? { ...item, myOption: option, optionPercentages: progress.optionPercentages ?? null }
        : item));
      const stayedOnAnsweredCard = visibleIndex.current === answeredIndex;
      if (manualNavigationVersion.current === navigationVersion || stayedOnAnsweredCard) {
        setChosen(option);
        setStatistic(progress.selectedPercentage ?? null);
        setPercentages(progress.optionPercentages ?? null);
      }
      if (progress.reward) {
        setRewardStatus((current) => !current || progress.reward!.remaining <= current.remaining ? progress.reward! : current);
      }
      track('taste_card_chosen', { noted });
      if (manualNavigationVersion.current === navigationVersion) {
        autoAdvance.current = setTimeout(() => navigateTo(nextUnanswered(updated), updated), AUTO_ADVANCE_MS);
      }
      if (progress.milestoneReached) {
        haptics.success();
        setReward(progress.peerArrived ? 'arrived' : 'pending');
        if (progress.peerArrived) track('taste_peer_rewarded');
      }
    } catch {
      setCards((current) => current.map((item) => item.id === answeredCardId
        ? { ...item, myOption: undefined, optionPercentages: null }
        : item));
      if (visibleIndex.current === answeredIndex) {
        setChosen(null);
        setStatistic(null);
        setPercentages(null);
      }
      Alert.alert('저장하지 못했어요', '선택이 저장됐는지 확인하지 못했어요. 같은 선택을 다시 눌러주세요.');
    } finally {
      if (alive.current) {
        pendingCardIds.current.delete(answeredCardId);
        setSavingCardIds((current) => {
          const next = new Set(current);
          next.delete(answeredCardId);
          return next;
        });
      }
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={done} hitSlop={12} style={styles.headerButton}>
          <Text style={[styles.headerAction, { color: c.textSecondary }]}>
            {isIntro ? '나중에 하기' : '닫기'}
          </Text>
        </Pressable>
        {/*
          * 보상은 잉크가 아니라 사람이다. 도착했으면 그렇게 말하고, 지금 후보가 없으면
          * 그것도 그대로 말한다 — "곧 도착"이라고 얼버무리면 다음에 열어본 사람이 속았다고 느낀다.
          */}
        {reward != null && (
          <Animated.View
            entering={ZoomIn.duration(220)}
            exiting={FadeOut.duration(200)}
            style={[styles.reward, { backgroundColor: reward === 'arrived' ? c.primary : c.backgroundSelected }]}
          >
            <Ionicons
              name={reward === 'arrived' ? 'person-add' : 'hourglass-outline'}
              size={13}
              color={reward === 'arrived' ? c.primaryText : c.textSecondary}
            />
            <Text style={[styles.rewardText, { color: reward === 'arrived' ? c.primaryText : c.textSecondary }]}>
              {reward === 'arrived' ? '상대 한 명 더 도착' : '새로운 인연을 찾고 있어요'}
            </Text>
          </Animated.View>
        )}
      </View>

      {rewardStatus && (
        <View style={styles.journey}>
          <View style={styles.journeyLabels}>
            <Text style={[styles.headerAction, { color: c.text }]}>오늘의 취향</Text>
            <View style={styles.clockLabel} accessible accessibilityLabel="매일 정오에 새 카드 10개">
              <Ionicons name="refresh-outline" size={14} color={c.textSecondary} />
              <Ionicons name="sunny-outline" size={16} color={c.textSecondary} />
              <Text style={[styles.skip, { color: c.textSecondary }]}>12:00</Text>
            </View>
          </View>
          <View style={styles.progressGroup}>
              <View style={styles.stamps}>
                {Array.from({ length: 10 }, (_, i) => (
                  <View key={i}
                    accessible
                    accessibilityLabel={`${i + 1}번 카드${cards[i]?.myOption ? ', 답변 완료' : ''}`}
                    accessibilityState={{ selected: index === i }}
                    style={styles.stampTarget}>
                    <View style={[styles.stamp, {
                      backgroundColor: index === i ? c.primaryStrong : cards[i]?.myOption ? c.textSecondary : c.backgroundSelected,
                    }]} />
                  </View>
                ))}
              </View>
              <Text style={[styles.progressCount, { color: c.textSecondary }]}>{10 - rewardStatus.remaining} / 10</Text>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={[styles.flex, styles.center]}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : failed ? (
          <View style={[styles.flex, styles.center, styles.pad]}>
            <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>카드를 불러오지 못했어요</Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                void load();
              }}
              hitSlop={12}
            >
              <Text style={[styles.retry, { color: c.primaryStrong }]}>다시 시도</Text>
            </Pressable>
          </View>
        ) : !card ? (
          <View style={[styles.flex, styles.center, styles.pad]}>
            <Ionicons name="checkmark-circle-outline" size={44} color={c.primary} />
            <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>카드를 다 넘겼어요</Text>
            <Text style={[styles.emptyHint, { color: c.textSecondary }]}>
              ☀ 12:00  ↻
            </Text>
            <Pressable
              onPress={() => isIntro ? done() : openCard(Math.max(0, cards.length - 1))}
              style={[styles.primaryButton, { backgroundColor: c.primary }]}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryLabel, { color: c.primaryText }]}>{isIntro ? '발견으로 가기' : '답변 다시보기'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.flex}>
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {/* 가입 직후 첫 장에서만 왜 넘기는지 한 줄 — 두 번째 장부터는 카드가 스스로 말한다. */}
              {isIntro && index === 0 && (
                <Animated.Text entering={FadeIn} style={[styles.intro, { color: c.textSecondary }]}>
                  고르기만 하면 돼요. 겹치는 취향이 있는 사람이 먼저 소개돼요.
                </Animated.Text>
              )}
              <View key={card.id}>
                    <Text style={[styles.prompt, { color: c.text, fontFamily: Fonts.serif }]}>{card.prompt}</Text>

                    <View style={styles.options}>
                      {(card.options ?? [{ id: 'A' as const, label: card.optionA }, { id: 'B' as const, label: card.optionB }]).map(({ id: option, label }) => {
                        const picked = chosen === option;
                        const optionLocked = currentCardSaving || chosen != null;
                        const percentage = chosen != null ? percentages?.[option] ?? (picked ? statistic : null) : null;
                        return (
                          <Pressable
                            key={option}
                            onPress={() => void choose(option)}
                            disabled={optionLocked}
                            accessibilityRole="button"
                            accessibilityState={{ selected: picked, disabled: optionLocked }}
                            style={({ pressed }) => [
                              styles.option,
                              {
                                backgroundColor: pressed ? c.backgroundSelected : c.backgroundElement,
                                borderColor: picked ? c.primary : c.border,
                                opacity: 1,
                                transform: [{ scale: pressed ? 0.99 : 1 }],
                              },
                            ]}
                          >
                            {percentage != null && (
                              <View pointerEvents="none"
                                style={[styles.voteFill, { width: `${percentage}%`, backgroundColor: picked ? c.primary : c.textSecondary }]} />
                            )}
                            <View style={styles.optionRow}>
                              <Text style={[styles.optionText, { color: c.text }]}>{label}</Text>
                              <View style={styles.voteLabel}>
                                {picked && <Ionicons name="checkmark-circle" size={18} color={c.primaryStrong} />}
                                {percentage != null && (
                                  <Text accessibilityLabel={`${label}, ${percentage}% 선택`} style={[styles.headerAction, { color: c.textSecondary }]}>{percentage}%</Text>
                                )}
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
              </View>
              <View testID="taste-card-meta" style={styles.cardMeta}>
                    {chosen != null && !currentCardSaving && statistic == null && (
                      <Text accessibilityLiveRegion="polite" style={[styles.feedbackHint, { color: c.textSecondary }]}>아직 응답을 모으고 있어요</Text>
                    )}

                    {chosen == null && (noteOpen ? (
                      <Animated.View entering={FadeIn.duration(160)} style={styles.noteBox}>
                        <PlaceholderInput
                          value={note}
                          onChangeText={setNote}
                          placeholder="예) 새벽이 제일 조용해서요"
                          placeholderTextColor={c.textSecondary}
                          maxLength={TASTE_NOTE_MAX}
                          autoFocus
                          style={[
                            styles.noteInput,
                            { backgroundColor: c.backgroundElement, borderColor: c.border, color: c.text },
                          ]}
                        />
                        <Text style={[styles.noteHint, { color: c.textSecondary }]}>위에서 고르면 이 한 줄까지 함께 남아요.</Text>
                      </Animated.View>
                    ) : (
                      <Pressable onPress={() => setNoteOpen(true)} hitSlop={10} style={styles.noteOpen}>
                        <Ionicons name="create-outline" size={15} color={c.textSecondary} />
                        <Text style={[styles.noteOpenLabel, { color: c.textSecondary }]}>한 줄 덧붙이기 (선택)</Text>
                      </Pressable>
                    ))}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <View style={[styles.pager, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                <Pressable
                  onPress={() => openCard(index - 1)}
                  disabled={index === 0}
                  accessibilityRole="button"
                  accessibilityLabel="이전 카드"
                  accessibilityState={{ disabled: index === 0 }}
                  style={({ pressed }) => [styles.pagerButton, { backgroundColor: pressed ? c.backgroundSelected : 'transparent', opacity: index === 0 ? 0.28 : 1 }]}
                >
                  <Ionicons name="chevron-back" size={21} color={c.text} />
                </Pressable>
                <Text style={[styles.pagerCount, { color: c.textSecondary }]}>{index + 1} / {cards.length}</Text>
                <Pressable
                  onPress={() => openCard(index + 1)}
                  disabled={index === cards.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel="다음 카드"
                  accessibilityState={{ disabled: index === cards.length - 1 }}
                  style={({ pressed }) => [styles.pagerButton, { backgroundColor: pressed ? c.backgroundSelected : 'transparent', opacity: index === cards.length - 1 ? 0.28 : 1 }]}
                >
                  <Ionicons name="chevron-forward" size={21} color={c.text} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  pad: { paddingHorizontal: 32 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerButton: { paddingVertical: 4 },
  headerAction: { ...Type.label },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  rewardText: { ...Type.caption, fontWeight: '700' },

  journey: { marginHorizontal: 24, paddingVertical: 12 },
  journeyLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  clockLabel: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  progressGroup: { flex: 1 },
  stamps: { flexDirection: 'row', gap: 4 },
  stampTarget: { flex: 1, height: 14, justifyContent: 'center' },
  stamp: { width: '100%', height: 6, borderRadius: 3 },
  progressCount: { ...Type.caption, marginTop: 8 },
  voteFill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.16 },
  voteLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  body: { flexGrow: 1, paddingTop: 20, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  intro: { ...Type.body, textAlign: 'center', marginBottom: 20 },
  prompt: { ...Type.display, textAlign: 'center' },

  options: { marginTop: 28, gap: 12 },
  optionRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  option: { overflow: 'hidden', borderRadius: Radius.md, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  optionText: { flex: 1, ...Type.read, fontWeight: '600', textAlign: 'left' },

  cardMeta: { minHeight: 50, justifyContent: 'center' },
  noteOpen: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  noteOpenLabel: { ...Type.caption },
  noteBox: { paddingTop: 12 },
  noteInput: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, ...Type.body },
  noteHint: { ...Type.caption, marginTop: 8, textAlign: 'center' },
  feedbackHint: { ...Type.caption, textAlign: 'center' },

  footer: { minHeight: 76, alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 5, borderWidth: 1, borderRadius: Radius.pill },
  pagerButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pagerCount: { ...Type.caption, minWidth: 46, textAlign: 'center', fontWeight: '700', fontVariant: ['tabular-nums'] },
  skip: { ...Type.caption },

  retry: { ...Type.label, marginTop: 12 },
  emptyTitle: { ...Type.title, marginTop: 12 },
  emptyHint: { ...Type.body, textAlign: 'center', marginTop: 10 },
  primaryButton: { marginTop: 24, borderRadius: Radius.pill, paddingHorizontal: 32, paddingVertical: 14 },
  primaryLabel: { ...Type.button },
});
