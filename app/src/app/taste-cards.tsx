import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';

import { PlaceholderInput } from '@/components/placeholder-input';
import { Fonts, Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';
import { chooseTaste, getTasteDeck, TASTE_NOTE_MAX, type TasteCard, type TasteDeck, type TasteOption } from '@/lib/taste';

/**
 * 취향 카드 — 둘 중 하나를 고르는 가벼운 문답.
 *
 * 이 화면이 있는 이유는 하나다. 가입하고 처음 만나는 것이 **백지**였다는 것 —
 * 오늘의 문답은 열 자면 되지만, 막는 건 분량이 아니라 빈 화면이다. 카드는 탭 하나로 시작하게 하고,
 * 고르고 난 자리에 한 줄 칸을 열어둔다. 고른 다음의 한 줄은 백지 앞의 한 줄보다 훨씬 쉽다.
 *
 * 그래서 이 화면은 **빠르게 넘어가는 것**을 가장 중요하게 친다 — 고르면 곧장 다음 장이다.
 * 한 줄은 쓰고 싶은 사람만, 한 번 더 눌러서.
 *
 * 잉크는 여기서 나오지 않는다. 잉크는 글(오늘의 문답)의 몫이고, 카드가 돌려주는 것은
 * 더 맞는 상대다 — 겹치는 선택이 소개 순서에 실린다.
 */
/**
 * 고른 뒤 카드가 머무는 시간(ms). 짧으면 무엇을 골랐는지 눈에 안 남고, 길면 빠르게 넘기는
 * 맛이 사라진다 — 손이 다음 카드를 누르러 가기 직전이 이 언저리다.
 */
const HOLD_MS = 260;

export default function TasteCardsScreen() {
  const c = useTheme();
  const router = useRouter();
  /** intro=1이면 가입 직후다 — 첫 화면에 왜 넘기는지 한 줄을 붙이고, 마치면 발견 탭으로 보낸다. */
  const { intro } = useLocalSearchParams<{ intro?: string }>();
  const isIntro = intro === '1';

  const [cards, setCards] = useState<TasteCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** 방금 고른 쪽 — 카드가 넘어가기 전 잠깐 색이 차오르는 자리. */
  const [chosen, setChosen] = useState<TasteOption | null>(null);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * 받아온 묶음을 화면에 건다.
   *
   * 진행 숫자(몇 장 중 몇 장)는 일부러 쓰지 않는다 — 남은 장수가 보이면 카드 넘기기가
   * 채워야 할 진도표가 되고, 끝이 멀어 보이면 애초에 시작하지 않는다. 이 더미는 언제든
   * 그만둬도 되는 것이라 끝을 세지 않는다.
   */
  const apply = useCallback((deck: TasteDeck) => {
    setCards(deck.cards);
    setIndex(0);
    setFailed(false);
  }, []);

  /** 다음 묶음을 받아온다. 스피너를 켜는 건 부르는 쪽 몫이다 — 마운트 시엔 이미 켜져 있다. */
  const load = useCallback(async () => {
    try {
      apply(await getTasteDeck());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    track('taste_deck_opened');
    let active = true;
    getTasteDeck()
      .then((deck) => active && apply(deck))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [apply]);

  const card = cards[index];
  /**
   * 이 화면을 떠난다. **왔던 곳으로 돌아가는 게 기본이다** — 발견 탭에서 들어온 사람을 MY로
   * 보내면 쓰던 흐름이 끊긴다(처음엔 그렇게 짜서 실제로 그랬다).
   * 가입 직후(intro)만 예외다: 그때는 뒤가 온보딩이라 돌아갈 곳이 아니고, 발견 탭이 목적지다.
   */
  const done = () => {
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

  /** 다음 장으로. 묶음을 다 넘겼으면 서버에서 다음 묶음을 받아온다. */
  function advance() {
    setNote('');
    setNoteOpen(false);
    setChosen(null);
    if (index + 1 < cards.length) {
      setIndex(index + 1);
    } else {
      setLoading(true);
      void load();
    }
  }

  /**
   * 한 장을 고른다.
   *
   * 누르자마자 다음 카드로 갈아치우면 무엇을 골랐는지 손에 남지 않는다 — 그래서 고른 쪽에
   * 색이 차오르는 짧은 순간([HOLD_MS])을 두고 넘긴다. 저장은 그 사이에 끝난다.
   * 저장이 더 걸려도 기다리지 않는다: 카드 한 장이 서버를 기다리느라 멈추면, 빠르게 넘기는
   * 맛이 사라져 이 화면의 존재 이유가 없어진다.
   */
  async function choose(option: TasteOption) {
    if (!card || saving) return;
    setSaving(true);
    setChosen(option);
    haptics.select();
    const noted = note.trim().length > 0;
    const saved = chooseTaste(card.id, option, note.trim() || undefined)
      .then(() => track('taste_card_chosen', { noted }))
      // 한 장이 저장되지 않았다고 흐름을 세우지는 않는다 — 조용히 다음 장으로 간다.
      .catch(() => undefined);
    await Promise.all([saved, new Promise((resolve) => setTimeout(resolve, HOLD_MS))]);
    advance();
    setSaving(false);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={done} hitSlop={12} style={styles.headerButton}>
          <Text style={[styles.headerAction, { color: c.textSecondary }]}>
            {isIntro ? '나중에 하기' : '닫기'}
          </Text>
        </Pressable>
      </View>

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
              겹치는 취향이 있는 사람이{'\n'}먼저 소개돼요.
            </Text>
            <Pressable
              onPress={done}
              style={[styles.primaryButton, { backgroundColor: c.primary }]}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryLabel, { color: c.primaryText }]}>돌아가기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.flex}>
            <View style={styles.body}>
              {/* 가입 직후 첫 장에서만 왜 넘기는지 한 줄 — 두 번째 장부터는 카드가 스스로 말한다. */}
              {isIntro && index === 0 && (
                <Animated.Text entering={FadeIn} style={[styles.intro, { color: c.textSecondary }]}>
                  고르기만 하면 돼요. 겹치는 취향이 있는 사람이 먼저 소개돼요.
                </Animated.Text>
              )}
              {/* 카드 한 장이 통째로 갈린다 — 물음만 바뀌면 같은 종이에 글자만 바뀐 것처럼 보인다. */}
              <Animated.View key={card.id} entering={FadeInDown.duration(240)} exiting={FadeOut.duration(120)}>
                <Text style={[styles.prompt, { color: c.text, fontFamily: Fonts.serif }]}>{card.prompt}</Text>

                <View style={styles.options}>
                  {(['A', 'B'] as const).map((option) => {
                    const picked = chosen === option;
                    const passed = chosen != null && !picked;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => void choose(option)}
                        disabled={saving}
                        accessibilityRole="button"
                        accessibilityState={{ selected: picked }}
                        style={({ pressed }) => [
                          styles.option,
                          {
                            // 고른 쪽은 색이 차오르고, 고르지 않은 쪽은 조용히 물러난다.
                            backgroundColor: picked ? c.primary : pressed ? c.backgroundSelected : c.backgroundElement,
                            borderColor: picked ? c.primary : c.border,
                            opacity: passed ? 0.35 : 1,
                            transform: [{ scale: picked ? 1.02 : pressed ? 0.99 : 1 }],
                          },
                        ]}
                      >
                        <View style={styles.optionRow}>
                          <Text style={[styles.optionText, { color: picked ? c.primaryText : c.text }]}>
                            {option === 'A' ? card.optionA : card.optionB}
                          </Text>
                          {picked ? (
                            <Animated.View entering={ZoomIn.duration(160)}>
                              <Ionicons name="checkmark-circle" size={20} color={c.primaryText} />
                            </Animated.View>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>

              {noteOpen ? (
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
                  <Text style={[styles.noteHint, { color: c.textSecondary }]}>
                    위에서 고르면 이 한 줄까지 함께 남아요.
                  </Text>
                </Animated.View>
              ) : (
                <Pressable onPress={() => setNoteOpen(true)} hitSlop={10} style={styles.noteOpen}>
                  <Ionicons name="create-outline" size={15} color={c.textSecondary} />
                  <Text style={[styles.noteOpenLabel, { color: c.textSecondary }]}>한 줄 덧붙이기 (선택)</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.footer}>
              <Pressable onPress={advance} disabled={saving} hitSlop={12} style={styles.headerButton}>
                <Text style={[styles.skip, { color: c.textSecondary }]}>이 카드는 넘기기</Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  pad: { paddingHorizontal: 32 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerButton: { paddingVertical: 4 },
  headerAction: { ...Type.label },

  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  intro: { ...Type.body, textAlign: 'center', marginBottom: 20 },
  prompt: { ...Type.display, textAlign: 'center' },

  options: { marginTop: 28, gap: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  option: { borderRadius: Radius.md, borderWidth: 1, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center' },
  optionText: { ...Type.read, fontWeight: '600', textAlign: 'center' },

  noteOpen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  noteOpenLabel: { ...Type.caption },
  noteBox: { marginTop: 20 },
  noteInput: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, ...Type.body },
  noteHint: { ...Type.caption, marginTop: 8, textAlign: 'center' },

  footer: { alignItems: 'center', paddingBottom: 12 },
  skip: { ...Type.caption },

  retry: { ...Type.label, marginTop: 12 },
  emptyTitle: { ...Type.title, marginTop: 12 },
  emptyHint: { ...Type.body, textAlign: 'center', marginTop: 10 },
  primaryButton: { marginTop: 24, borderRadius: Radius.pill, paddingHorizontal: 32, paddingVertical: 14 },
  primaryLabel: { ...Type.button },
});
