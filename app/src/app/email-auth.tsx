import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { PlaceholderInput } from '@/components/placeholder-input';
import { Colors, Fonts } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { requestCode, verifyCode } from '@/lib/auth';
import { getMyProfile } from '@/lib/member';

type Step = 'email' | 'code';

const RESEND_SECONDS = 60;

export default function EmailAuthScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const codeValid = /^\d{6}$/.test(code);

  // 재전송 쿨다운 카운트다운
  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cooldown > 0]);

  async function sendCode() {
    if (!emailValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestCode(email.trim());
      setStep('code');
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(sendErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCode() {
    if (!codeValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await verifyCode(email.trim(), code);
      const profile = await getMyProfile();
      router.replace(profile ? '/discover' : '/onboarding');
    } catch (e) {
      setError(verifyErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  function editEmail() {
    setStep('email');
    setError(null);
    setCode('');
    setCooldown(0);
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Pressable onPress={() => (step === 'code' ? editEmail() : router.back())} hitSlop={12}>
              <Text style={[styles.back, { color: c.textSecondary }]}>← 뒤로</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            {step === 'email' ? (
              <>
                <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>
                  이메일로 시작해요
                </Text>
                {/* 문장 경계에서 끊어 "요."만 다음 줄로 떨어지는 것을 막는다 */}
                <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                  인증코드를 보내드릴게요.{'\n'}이미 가입하셨다면 바로 로그인돼요.
                </Text>
                <View style={styles.form}>
                  <PlaceholderInput
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
                    autoFocus
                    onSubmitEditing={sendCode}
                    returnKeyType="send"
                    style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text, borderColor: c.border }]}
                  />
                  {error ? <Text style={[styles.error, { color: c.primary }]}>{error}</Text> : null}
                  <Pressable
                    onPress={sendCode}
                    disabled={!emailValid || submitting}
                    style={({ pressed }) => [
                      styles.submit,
                      { backgroundColor: c.primary, opacity: !emailValid || submitting ? 0.5 : pressed ? 0.85 : 1 },
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator color={c.primaryText} />
                    ) : (
                      <Text style={[styles.submitText, { color: c.primaryText }]}>인증코드 받기</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>인증코드 입력</Text>
                <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                  <Text style={{ color: c.text }}>{email.trim()}</Text> 로 보낸 6자리 코드를 입력해 주세요
                </Text>
                <View style={styles.form}>
                  <TextInput
                    value={code}
                    onChangeText={(t) => {
                      setCode(t.replace(/\D/g, '').slice(0, 6));
                      setError(null);
                    }}
                    placeholder="000000"
                    placeholderTextColor={c.textSecondary}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    autoFocus
                    onSubmitEditing={submitCode}
                    returnKeyType="go"
                    style={[styles.codeInput, { backgroundColor: c.backgroundElement, color: c.text, borderColor: c.border }]}
                  />
                  {error ? <Text style={[styles.error, { color: c.primary }]}>{error}</Text> : null}
                  <Pressable
                    onPress={submitCode}
                    disabled={!codeValid || submitting}
                    style={({ pressed }) => [
                      styles.submit,
                      { backgroundColor: c.primary, opacity: !codeValid || submitting ? 0.5 : pressed ? 0.85 : 1 },
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator color={c.primaryText} />
                    ) : (
                      <Text style={[styles.submitText, { color: c.primaryText }]}>확인</Text>
                    )}
                  </Pressable>

                  <Pressable onPress={sendCode} disabled={cooldown > 0 || submitting} hitSlop={8} style={styles.resend}>
                    <Text style={[styles.resendText, { color: cooldown > 0 ? c.textSecondary : c.primary }]}>
                      {cooldown > 0 ? `코드 재전송 (${cooldown}초)` : '코드 재전송'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function sendErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return e.message || '인증코드를 방금 보냈어요. 잠시 후 다시 시도해 주세요.';
    if (e.status === 400) return e.message || '이메일 형식을 확인해 주세요.';
    return '코드 발송 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
  }
  return '네트워크 연결을 확인해 주세요.';
}

function verifyErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401 || e.code === 'INVALID_CODE') return '코드가 올바르지 않거나 만료됐어요.';
    if (e.status === 429) return '시도 횟수를 초과했어요. 코드를 다시 요청해 주세요.';
    return '인증 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
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
  subtitle: { fontSize: 15, marginTop: 8, lineHeight: 22 },
  form: { marginTop: 32, gap: 12 },
  input: { height: 54, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  codeInput: {
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: { fontSize: 13, marginTop: 2, marginLeft: 4 },
  submit: { height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { fontSize: 16, fontWeight: '700' },
  resend: { alignItems: 'center', paddingVertical: 14 },
  resendText: { fontSize: 14 },
});
