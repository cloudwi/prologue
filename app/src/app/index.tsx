import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { Colors, Fonts } from '@/constants/theme';
import { identify } from '@/lib/analytics';
import { ApiError } from '@/lib/api';
import { clearTokens, getAccessToken } from '@/lib/auth-storage';
import { useAppearance } from '@/lib/appearance';
import { getMyProfile } from '@/lib/member';

export default function LoginScreen() {
  const { scheme } = useAppearance();
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
        if (profile?.accountId) identify(profile.accountId);
        if (active) router.replace(profile ? '/discover' : '/onboarding');
      } catch (e) {
        // 재발급까지 실패한 만료(401/403) — authedFetch가 토큰을 지웠으니 로그인 화면으로 남는다
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) await clearTokens();
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

      <SafeAreaView style={styles.safe}>
        {/* 브랜드 */}
        <View style={styles.brand}>
          <Animated.View entering={FadeInDown.duration(380)} style={styles.center}>
            <Image
              source={require('@/assets/images/brand-mark.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={[styles.wordmark, { color: c.text, fontFamily: Fonts.serif }]}>프롤로그</Text>
            <Text style={[styles.wordmarkEn, { color: c.primary }]}>PROLOGUE</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(380).delay(90)} style={styles.center}>
            <Text style={[styles.tagline, { color: c.textSecondary }]}>하루 한 문답으로 알아가는,</Text>
            <Text style={[styles.tagline, { color: c.textSecondary }]}>가치관이 꼭 맞는 소중한 인연</Text>
          </Animated.View>
        </View>

        {/* 이메일 인증은 가입과 로그인이 같은 흐름이라 진입 버튼도 하나로 둔다.
            이메일도 개인정보라 수집 전에 동의를 받아야 해서, 동의 화면을 먼저 거친다. */}
        <Animated.View entering={FadeInUp.duration(380).delay(180)} style={styles.buttons}>
          <Pressable
            onPress={() => router.push('/consent')}
            style={({ pressed }) => [styles.startBtn, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.startBtnText, { color: c.primaryText }]}>이메일로 시작하기</Text>
          </Pressable>

          {/* 동의는 다음 화면에서 항목별로 받는다 — 여기서는 미리 읽어볼 수 있는 통로만 둔다 */}
          <Text style={[styles.terms, { color: c.textSecondary }]}>
            <Text style={[styles.termsLink, { color: c.text }]} onPress={() => router.push('/terms')}>
              이용약관
            </Text>
            {'   ·   '}
            <Text style={[styles.termsLink, { color: c.text }]} onPress={() => router.push('/privacy')}>
              개인정보처리방침
            </Text>
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
  logo: { width: 89, height: 64, marginBottom: 6 }, // 마크는 1.4:1 가로형
  wordmark: { fontSize: 36, fontWeight: '700', letterSpacing: 2, marginTop: 8 },
  wordmarkEn: { fontSize: 14, fontWeight: '700', letterSpacing: 6, marginTop: 6 },
  tagline: { fontSize: 16, marginTop: 6 },
  buttons: { gap: 12 },
  startBtn: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { fontSize: 17, fontWeight: '700' },
  terms: { fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 8, lineHeight: 18 },
  termsLink: { textDecorationLine: 'underline', fontWeight: '600' },
});
