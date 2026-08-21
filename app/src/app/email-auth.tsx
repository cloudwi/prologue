import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceholderInput } from '@/components/placeholder-input';
import { Fonts } from '@/constants/theme';
import { identify, track } from '@/lib/analytics';
import { ApiError } from '@/lib/api';
import { requestCode, verifyCode } from '@/lib/auth';
import { clearPendingEmail, getPendingEmail, savePendingEmail } from '@/lib/auth-storage';
import { getMyProfile } from '@/lib/member';
import { useTheme } from '@/hooks/use-theme';

type Step = 'email' | 'code';

const RESEND_SECONDS = 60;

export default function EmailAuthScreen() {
  const c = useTheme();
  const router = useRouter();
  // 메일의 "앱에서 바로 입력하기" 버튼으로 들어오면 코드가 실려 온다.
  const { code: linkedCode } = useLocalSearchParams<{ code?: string }>();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [codeFocused, setCodeFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const codeValid = /^\d{6}$/.test(code);

  // 딥링크로 코드가 실려 오면 저장해 둔 이메일과 짝지어 코드 단계로 바로 넘긴다.
  // 다른 기기에서 메일을 열어 이메일이 없으면 그대로 이메일 입력부터 진행한다.
  useEffect(() => {
    if (!linkedCode || !/^\d{6}$/.test(linkedCode)) return;
    let active = true;
    (async () => {
      const pending = await getPendingEmail();
      if (!active || !pending) return;
      setEmail(pending);
      setCode(linkedCode);
      setStep('code');
    })();
    return () => {
      active = false;
    };
  }, [linkedCode]);

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
      track('auth_code_requested');
      await requestCode(email.trim());
      // 메일의 딥링크는 코드만 담으므로, 짝이 될 이메일을 기기에 남긴다.
      await savePendingEmail(email.trim());
      setStep('code');
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(sendErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  // 여섯 자리가 차면 버튼을 기다리지 않는다 — 코드 입력의 끝이 곧 제출이다.
  useEffect(() => {
    if (step === 'code' && codeValid && !submitting) void submitCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  async function submitCode() {
    if (!codeValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await verifyCode(email.trim(), code);
      if (session?.accountId) identify(session.accountId);
      track('auth_succeeded');
      await clearPendingEmail();
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

          {/* 키보드가 화면 절반을 먹는 화면이라 중앙 정렬 대신 상단 정렬 —
              제목·입력·버튼이 항상 키보드 위에 남는다. 작은 화면은 스크롤로 감당한다. */}
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
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
                  {/* 6칸 분리형 코드 입력 — 실제 입력은 투명한 TextInput 하나가 받고
                      (붙여넣기·iOS 문자 자동완성이 그대로 동작), 칸은 그리기만 한다. */}
                  <View>
                    <View style={styles.otpRow} pointerEvents="none">
                      {Array.from({ length: 6 }, (_, i) => {
                        const active = codeFocused && i === Math.min(code.length, 5);
                        return (
                          <View
                            key={i}
                            style={[
                              styles.otpCell,
                              {
                                backgroundColor: c.backgroundElement,
                                borderColor: active ? c.primary : c.border,
                                borderWidth: active ? 2 : 1,
                              },
                            ]}
                          >
                            <Text style={[styles.otpDigit, { color: c.text }]}>{code[i] ?? ''}</Text>
                            {active && code.length <= i && <View style={[styles.otpCaret, { backgroundColor: c.primary }]} />}
                          </View>
                        );
                      })}
                    </View>
                    <TextInput
                      value={code}
                      onChangeText={(t) => {
                        setCode(t.replace(/\D/g, '').slice(0, 6));
                        setError(null);
                      }}
                      onFocus={() => setCodeFocused(true)}
                      onBlur={() => setCodeFocused(false)}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      maxLength={6}
                      autoFocus
                      onSubmitEditing={submitCode}
                      returnKeyType="go"
                      caretHidden
                      style={styles.otpHiddenInput}
                    />
                  </View>
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
          </ScrollView>
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
  back: { fontSize: 16 },
  body: { paddingTop: 36, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, marginTop: 8, lineHeight: 23 },
  form: { marginTop: 32, gap: 12 },
  input: { height: 54, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 17 },
  otpRow: { flexDirection: 'row', gap: 8 },
  otpCell: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: { fontSize: 24, fontWeight: '700' },
  otpCaret: { position: 'absolute', width: 2, height: 24, borderRadius: 1 },
  // 투명 입력 — 셀 전체를 덮어 어디를 눌러도 포커스되고, 자동완성도 이 입력이 받는다.
  otpHiddenInput: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, opacity: 0.01, fontSize: 1 },
  error: { fontSize: 14, marginTop: 2, marginLeft: 4 },
  submit: { height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { fontSize: 17, fontWeight: '700' },
  resend: { alignItems: 'center', paddingVertical: 14 },
  resendText: { fontSize: 15 },
});
