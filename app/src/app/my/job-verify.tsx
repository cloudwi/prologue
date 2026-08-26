import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { PlaceholderInput } from '@/components/placeholder-input';
import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getJobStatus, requestJobCode, verifyJobCode } from '@/lib/job';

/**
 * 직장 인증 — 회사 이메일로 코드를 받아 확인한다.
 * 회사 메일함에 접근할 수 있다는 것이 곧 재직의 증거라, 서류 없이 끝난다.
 * 서버에는 도메인만 남고, 그 도메인이 프로필 배지에 공개된다(유저 결정 2026-08-24) —
 * 인증 전에 이 화면에서 분명히 말해야 한다. 이메일 주소 자체는 저장하지 않는다.
 */
export default function JobVerifyScreen() {
  const c = useTheme();
  const [checked, setChecked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [domain, setDomain] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getJobStatus()
        .then((s) => {
          if (!active) return;
          setVerified(s.verified);
          setDomain(s.domain);
        })
        .catch(() => {})
        .finally(() => active && setChecked(true));
      return () => {
        active = false;
      };
    }, []),
  );

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  async function sendCode() {
    if (!emailValid || busy) return;
    setBusy(true);
    try {
      await requestJobCode(email.trim());
      setCodeSent(true);
      setCode('');
    } catch (e) {
      Alert.alert('코드를 보내지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await verifyJobCode(email.trim(), code);
      setVerified(true);
      setDomain(res.domain);
    } catch (e) {
      Alert.alert('인증하지 못했어요', e instanceof Error ? e.message : '코드를 확인해주세요');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SubScreen title="직장 인증" c={c}>
      {!checked ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : verified ? (
        <View style={[styles.flex, styles.center]}>
          <View style={[styles.doneBadge, { backgroundColor: c.primary }]}>
            <Ionicons name="shield-checkmark" size={26} color={c.primaryText} />
          </View>
          <Text style={[styles.doneTitle, { color: c.text }]}>직장 인증 완료</Text>
          <Text style={[styles.doneText, { color: c.textSecondary }]}>
            {domain ? `@${domain} 메일로 인증됐어요.` : '회사 이메일로 인증됐어요.'}{'\n'}
            프로필에 {domain ? `[${domain} 인증]` : '[직장 인증]'} 배지가 보여요.{'\n'}회사가 바뀌면 새 회사 메일로 다시
            인증하면 돼요.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.desc, { color: c.textSecondary }]}>
            회사 이메일로 인증코드를 보내드려요.{'\n'}
            인증하면 <Text style={{ color: c.text, fontWeight: '600' }}>회사 메일 도메인</Text>(예: company.co.kr)이 프로필
            배지에 표시돼 다른 회원에게 보여요. 이메일 주소 자체는 저장되지 않고, 한 이메일로는 한 계정만 인증할 수
            있어요. 개인 메일(gmail, naver 등)은 쓸 수 없어요.
          </Text>

          <PlaceholderInput
            value={email}
            onChangeText={setEmail}
            placeholder="이름@회사.co.kr"
            placeholderTextColor={c.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!codeSent}
            style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text, opacity: codeSent ? 0.6 : 1 }]}
          />

          {codeSent && (
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="인증코드 6자리"
              placeholderTextColor={c.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
            />
          )}

          <Pressable
            onPress={codeSent ? submitCode : sendCode}
            disabled={busy}
            style={({ pressed }) => [
              styles.submit,
              { backgroundColor: c.primary, opacity: busy || pressed ? 0.7 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={c.primaryText} />
            ) : (
              <Text style={[styles.submitText, { color: c.primaryText }]}>
                {codeSent ? '인증하기' : '인증코드 받기'}
              </Text>
            )}
          </Pressable>

          {codeSent && (
            <Pressable onPress={() => setCodeSent(false)} hitSlop={8} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: c.textSecondary }]}>이메일 다시 입력</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  desc: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  input: { height: 52, borderRadius: Radius.md, paddingHorizontal: 16, fontSize: 16 },
  submit: { height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  submitText: { fontSize: 16, fontWeight: '700' },
  backLink: { alignItems: 'center', paddingVertical: 10 },
  backLinkText: { fontSize: 14, textDecorationLine: 'underline' },
  doneBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  doneTitle: { fontSize: 21, fontWeight: '700' },
  doneText: { fontSize: 14.5, lineHeight: 22, textAlign: 'center', marginTop: 10 },
});
