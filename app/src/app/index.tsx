import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { PetalField } from '@/components/petal-field';
import { Colors, Fonts } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { clearTokens, getAccessToken } from '@/lib/auth-storage';
import { getMyProfile } from '@/lib/member';

// 흩날리는 꽃잎 색 — 테라코타 계열의 은은한 톤
const PETAL_TONES = {
  light: ['#E8A98F', '#EFC3AD', '#DFA37A', '#D9694C'],
  dark: ['#E07A5C', '#B96A50', '#8A5642', '#E8A98F'],
} as const;

export default function LoginScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const [checking, setChecking] = useState(true); // 자동 로그인 확인 중

  // 앱 시작 시: 저장된 토큰이 있으면 프로필 확인 후 자동 진입
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (active) setChecking(false);
        return;
      }
      try {
        const profile = await getMyProfile();
        if (active) router.replace(profile ? '/discover' : '/onboarding');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await clearTokens();
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <PetalField tones={PETAL_TONES[scheme]} />

      <SafeAreaView style={styles.safe}>
        {/* 브랜드 */}
        <View style={styles.brand}>
          <Animated.View entering={FadeInDown.duration(700)} style={styles.center}>
            <Image
              source={require('@/assets/images/brand-mark.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={[styles.wordmark, { color: c.text, fontFamily: Fonts.serif }]}>프롤로그</Text>
            <Text style={[styles.wordmarkEn, { color: c.primary }]}>PROLOGUE</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(700).delay(250)} style={styles.center}>
            <Text style={[styles.tagline, { color: c.textSecondary }]}>하루 한 문답으로 알아가는,</Text>
            <Text style={[styles.tagline, { color: c.textSecondary }]}>가치관이 꼭 맞는 소중한 인연</Text>
          </Animated.View>
        </View>

        {/* 시작하기 / 로그인하기 */}
        <Animated.View entering={FadeInUp.duration(700).delay(450)} style={styles.buttons}>
          <Pressable
            onPress={() => router.push({ pathname: '/email-auth', params: { mode: 'signup' } })}
            style={({ pressed }) => [styles.startBtn, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.startBtnText, { color: c.primaryText }]}>시작하기</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/email-auth', params: { mode: 'login' } })}
            style={({ pressed }) => [
              styles.loginBtn,
              { borderColor: c.border, backgroundColor: c.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.loginBtnText, { color: c.text }]}>로그인하기</Text>
          </Pressable>

          <Text style={[styles.terms, { color: c.textSecondary }]}>
            가입 시{' '}
            <Text style={[styles.termsLink, { color: c.text }]} onPress={() => router.push('/terms')}>
              이용약관
            </Text>{' '}
            및{' '}
            <Text style={[styles.termsLink, { color: c.text }]} onPress={() => router.push('/privacy')}>
              개인정보처리방침
            </Text>
            에 동의하게 됩니다
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1, paddingHorizontal: 25, justifyContent: 'flex-end' },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 72, height: 72, marginBottom: 4 },
  wordmark: { fontSize: 36, fontWeight: '700', letterSpacing: 2, marginTop: 8 },
  wordmarkEn: { fontSize: 13, fontWeight: '700', letterSpacing: 6, marginTop: 6 },
  tagline: { fontSize: 15, marginTop: 6 },
  buttons: { gap: 12 },
  startBtn: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { fontSize: 16, fontWeight: '700' },
  loginBtn: { height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { fontSize: 16, fontWeight: '600' },
  terms: { fontSize: 11, textAlign: 'center', marginTop: 12, marginBottom: 8, lineHeight: 17 },
  termsLink: { textDecorationLine: 'underline', fontWeight: '600' },
});
