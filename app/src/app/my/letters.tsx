import { useEffect, useState } from 'react';
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

import { SkeletonList, SkeletonTextCard } from '@/components/skeleton';
import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  LETTER_MAX,
  LETTER_MAX_LENGTH,
  LETTER_MIN_LENGTH,
  deleteLetter,
  getLetterQuestions,
  getMyLetters,
  writeLetter,
  type LetterQuestion,
  type ProfileLetter,
} from '@/lib/letters';

/**
 * 프로필 문답 — 질문을 골라 미리 써두는 자기소개(최대 LETTER_MAX개, 400자).
 * 한 번에 하나씩 쓴다: 질문 고르기 → 쓰기 → 저장. 저장 즉시 반영이라 별도 저장 버튼이 없다.
 */
export default function LettersScreen() {
  const c = useTheme();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [letters, setLetters] = useState<ProfileLetter[]>([]);
  const [questions, setQuestions] = useState<LetterQuestion[]>([]);
  // 질문 고르기 검색어 — 클라이언트 필터(질문 풀은 이미 다 받아온다).
  const [questionQuery, setQuestionQuery] = useState('');

  /** 지금 쓰는 중인 문답. questionId가 null이면 질문 고르는 단계. */
  const [editing, setEditing] = useState<{ questionId: number | null; draft: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [mine, pool] = await Promise.all([getMyLetters(), getLetterQuestions()]);
        if (!active) return;
        setLetters(mine);
        setQuestions(pool);
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

  const usedIds = new Set(letters.map((l) => l.questionId));
  const editingQuestion =
    editing?.questionId != null ? questions.find((q) => q.questionId === editing.questionId) : null;

  async function save() {
    if (!editing || editing.questionId == null || editing.draft.trim().length === 0 || busy) return;
    setBusy(true);
    try {
      setLetters(await writeLetter(editing.questionId, editing.draft.trim()));
      setEditing(null);
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(letter: ProfileLetter) {
    Alert.alert('문답 삭제', '이 문답을 프로필에서 내릴까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            setLetters(await deleteLetter(letter.questionId));
          } catch (e) {
            Alert.alert('삭제 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SubScreen title="프로필 문답" c={c}>
        <SkeletonList c={c}>
          <SkeletonTextCard c={c} bodyLines={3} />
          <SkeletonTextCard c={c} bodyLines={2} />
        </SkeletonList>
      </SubScreen>
    );
  }

  // ── 쓰기 단계 ──
  if (editing && editing.questionId != null && editingQuestion) {
    return (
      <SubScreen title="문답 쓰기" c={c}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[styles.questionCard, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.questionText, { color: c.text, fontFamily: Fonts.serif }]}>
                {editingQuestion.content}
              </Text>
            </View>
            <TextInput
              value={editing.draft}
              onChangeText={(t) => setEditing({ ...editing, draft: t })}
              placeholder="이 질문에 대한 나를 적어보세요"
              placeholderTextColor={c.textSecondary}
              multiline
              autoFocus
              maxLength={LETTER_MAX_LENGTH}
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
            />
            <Text style={[styles.counter, { color: c.textSecondary }]}>
              {editing.draft.trim().length > 0 && editing.draft.trim().length < LETTER_MIN_LENGTH
                ? `${LETTER_MIN_LENGTH}자 이상 · `
                : ''}
              {editing.draft.length}/{LETTER_MAX_LENGTH}
            </Text>
            <Pressable
              onPress={save}
              disabled={editing.draft.trim().length < LETTER_MIN_LENGTH || busy}
              style={[
                styles.primaryBtn,
                { backgroundColor: c.primary, opacity: editing.draft.trim().length < LETTER_MIN_LENGTH || busy ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.primaryBtnText, { color: c.primaryText }]}>{busy ? '저장 중...' : '프로필에 올리기'}</Text>
            </Pressable>
            <Pressable onPress={() => setEditing(null)} disabled={busy} style={styles.cancel} hitSlop={6}>
              <Text style={{ color: c.textSecondary, fontSize: 15 }}>취소</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SubScreen>
    );
  }

  // ── 질문 고르는 단계 ──
  if (editing) {
    const keyword = questionQuery.trim();
    const available = questions.filter(
      (q) => !usedIds.has(q.questionId) && (keyword === '' || q.content.includes(keyword)),
    );
    return (
      <SubScreen title="질문 고르기" c={c}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.lead, { color: c.textSecondary }]}>어떤 질문에 답해볼까요?</Text>
          {/* 질문이 수십 개라 스크롤로 찾기 어렵다 — 낱말로 바로 좁힌다. */}
          <TextInput
            value={questionQuery}
            onChangeText={setQuestionQuery}
            placeholder="질문 검색 (예: 여행, 아침, 가치)"
            placeholderTextColor={c.textSecondary}
            style={[styles.searchInput, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
          />
          {available.length === 0 && (
            <Text style={[styles.lead, { color: c.textSecondary }]}>‘{keyword}’가 들어간 질문이 없어요.</Text>
          )}
          {available.map((q) => (
            <Pressable
              key={q.questionId}
              onPress={() => setEditing({ questionId: q.questionId, draft: '' })}
              style={({ pressed }) => [
                styles.questionOption,
                { backgroundColor: c.backgroundElement, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.questionOptionText, { color: c.text, fontFamily: Fonts.serif }]}>{q.content}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setEditing(null)} style={styles.cancel} hitSlop={6}>
            <Text style={{ color: c.textSecondary, fontSize: 15 }}>취소</Text>
          </Pressable>
        </ScrollView>
      </SubScreen>
    );
  }

  // ── 목록 ──
  return (
    <SubScreen title="프로필 문답" c={c}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lead, { color: c.textSecondary }]}>
          질문을 골라 미리 써두는 나의 소개예요. 상대의 프로필 상세에서 함께 보여요.
          {'\n'}발견 탭의 오늘 답변도 그대로 올릴 수 있어요.
        </Text>

        {letters.map((letter) => (
          <View key={letter.questionId} style={[styles.letterCard, { backgroundColor: c.backgroundElement }]}>
            <Text style={[styles.letterQuestion, { color: c.textSecondary }]}>{letter.question}</Text>
            <Text style={[styles.letterContent, { color: c.text, fontFamily: Fonts.serif }]}>{letter.content}</Text>
            <View style={styles.letterActions}>
              <Pressable onPress={() => setEditing({ questionId: letter.questionId, draft: letter.content })} hitSlop={6}>
                <Text style={[styles.letterAction, { color: c.primaryStrong }]}>고치기</Text>
              </Pressable>
              <Pressable onPress={() => confirmRemove(letter)} hitSlop={6}>
                <Text style={[styles.letterAction, { color: c.textSecondary }]}>삭제</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {letters.length < LETTER_MAX && (
          <Pressable
            onPress={() => setEditing({ questionId: null, draft: '' })}
            style={({ pressed }) => [styles.addCard, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.addPlus, { color: c.primary }]}>+</Text>
            <Text style={[styles.addLabel, { color: c.textSecondary }]}>
              문답 쓰기 ({letters.length}/{LETTER_MAX})
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  lead: { fontSize: 15, lineHeight: 22, marginBottom: 18 },

  letterCard: { borderRadius: Radius.md, padding: 20, marginBottom: 12 },
  letterQuestion: { fontSize: 14, lineHeight: 20 },
  letterContent: { fontSize: 16.5, lineHeight: 26, marginTop: 8 },
  letterActions: { flexDirection: 'row', gap: 18, marginTop: 14 },
  letterAction: { fontSize: 14.5, fontWeight: '600' },

  addCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: 26,
  },
  addPlus: { fontSize: 28, fontWeight: '300', lineHeight: 30 },
  addLabel: { fontSize: 14, marginTop: 4 },

  questionCard: { borderRadius: Radius.md, padding: 20, marginBottom: 16 },
  questionText: { fontSize: 18, fontWeight: '600', lineHeight: 27 },
  questionOption: { borderRadius: Radius.md, padding: 18, marginBottom: 10 },
  searchInput: { height: 44, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: 15.5, marginBottom: 14 },
  questionOptionText: { fontSize: 16.5, lineHeight: 24 },
  input: {
    minHeight: 180,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 16,
    fontSize: 17,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  counter: { fontSize: 13, textAlign: 'right', marginTop: 6 },
  primaryBtn: { height: 54, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryBtnText: { fontSize: 17, fontWeight: '700' },
  cancel: { alignSelf: 'center', marginTop: 16, padding: 6 },
});
