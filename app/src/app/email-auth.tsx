import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { login, signup } from '@/lib/auth';
import { getMyProfile } from '@/lib/member';

type Mode = 'signup' | 'login';

export default function EmailAuthScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const passwordValid = password.length >= 8;
  const canSubmit = emailValid && passwordValid && !submitting;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const run = isSignup ? signup : login;
      await run(email.trim(), password);
      // 프로필 유무로 온보딩/홈 분기 (index.tsx 자동 로그인과 동일한 규칙)
      const profile = await getMyProfile();
      router.replace(profile ? '/discover' : '/onboarding');
    } catch (e) {
      setError(messageFor(e, isSignup, () => switchMode('login')));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={[styles.back, { color: c.textSecondary }]}>← 뒤로</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>
              {isSignup ? '이메일로 가입' : '이메일로 로그인'}
            </Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              {isSignup ? '이메일과 비밀번호로 시작해요' : '다시 만나서 반가워요'}
            </Text>

            <View style={styles.form}>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                placeholder="이메일"
                placeholderTextColor={c.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                textContentType="emailAddress"
                style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text, borderColor: c.border }]}
              />
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                placeholder="비밀번호 (8자 이상)"
                placeholderTextColor={c.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                textContentType={isSignup ? 'newPassword' : 'password'}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
                style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text, borderColor: c.border }]}
              />

              {error ? <Text style={[styles.error, { color: c.primary }]}>{error}</Text> : null}

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.submit,
                  { backgroundColor: c.primary, opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={c.primaryText} />
                ) : (
                  <Text style={[styles.submitText, { color: c.primaryText }]}>
                    {isSignup ? '가입하고 시작하기' : '로그인'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => switchMode(isSignup ? 'login' : 'signup')} hitSlop={8} style={styles.switch}>
            <Text style={[styles.switchText, { color: c.textSecondary }]}>
              {isSignup ? '이미 계정이 있어요 · 로그인' : '처음이신가요? · 가입하기'}
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** 예외를 사용자용 메시지로 변환. 이미 가입된 이메일이면 로그인 모드로 전환 유도. */
function messageFor(e: unknown, isSignup: boolean, switchToLogin: () => void): string {
  if (e instanceof ApiError) {
    if (e.status === 409 || e.code === 'EMAIL_ALREADY_REGISTERED') {
      switchToLogin();
      return '이미 가입된 이메일이에요. 로그인해 주세요.';
    }
    if (e.status === 401 || e.code === 'INVALID_CREDENTIALS') {
      return '이메일 또는 비밀번호가 올바르지 않아요.';
    }
    if (e.status === 400) {
      return e.message || '입력값을 확인해 주세요.';
    }
    return isSignup ? '가입 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.' : '로그인 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
  }
  return '네트워크 연결을 확인해 주세요.';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 25 },
  header: { height: 44, justifyContent: 'center' },
  back: { fontSize: 15 },
  body: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 8 },
  form: { marginTop: 32, gap: 12 },
  input: { height: 54, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  error: { fontSize: 13, marginTop: 2, marginLeft: 4 },
  submit: { height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { fontSize: 16, fontWeight: '700' },
  switch: { alignItems: 'center', paddingVertical: 16 },
  switchText: { fontSize: 14 },
});
