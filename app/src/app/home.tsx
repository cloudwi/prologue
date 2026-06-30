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
import { clearTokens } from '@/lib/auth-storage';
import { answerToday, getToday, type Today } from '@/lib/daily';

export default function HomeScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [today, setToday] = useState<Today | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const t = await getToday();
        if (!active) return;
        setToday(t);
        setDraft(t.myAnswer ?? '');
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
      const updated = await answerToday(draft.trim());
      setToday(updated);
      setDraft(updated.myAnswer ?? '');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await clearTokens();
    router.replace('/');
  }

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
            <Text style={[styles.eyebrow, { color: c.primary }]}>오늘의 문답</Text>

            {/* 질문 카드 */}
            <View style={[styles.questionCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
              <Text style={[styles.quote, { color: c.primary }]}>&ldquo;</Text>
              <Text style={[styles.question, { color: c.text, fontFamily: Fonts.serif }]}>
                {today?.content}
              </Text>
            </View>

            {today?.answered && (
              <Text style={[styles.answeredTag, { color: c.primary }]}>✓ 오늘 답변했어요 (수정 가능)</Text>
            )}

            {/* 답변 입력 */}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="오늘의 마음을 적어보세요"
              placeholderTextColor={c.textSecondary}
              multiline
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
                {submitting ? '저장 중...' : today?.answered ? '답변 수정하기' : '답변 남기기'}
              </Text>
            </Pressable>

            <Text style={[styles.hint, { color: c.textSecondary }]}>
              답변해야 상대의 답변을 볼 수 있어요. (곧 매칭이 열려요)
            </Text>

            <Pressable onPress={logout} hitSlop={8} style={styles.logout}>
              <Text style={{ color: c.textSecondary, fontSize: 12, opacity: 0.7 }}>로그아웃</Text>
            </Pressable>
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
  eyebrow: { fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 24 },
  questionCard: { borderRadius: 16, borderWidth: 1, padding: 24, marginBottom: 20 },
  quote: { fontSize: 40, lineHeight: 40, fontFamily: Platform.select({ default: 'serif' }) },
  question: { fontSize: 22, fontWeight: '600', lineHeight: 32, marginTop: 4 },
  answeredTag: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  input: { minHeight: 140, borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
  counter: { fontSize: 12, textAlign: 'right', marginTop: 6 },
  submit: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitText: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  logout: { alignSelf: 'center', marginTop: 28, padding: 8 },
});
