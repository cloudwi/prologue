import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SocialButton } from '@/components/social-button';
import { Colors, Fonts } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import {
  loginWithApple,
  loginWithGoogle,
  loginWithKakao,
  loginWithNaver,
  type LoginResult,
} from '@/lib/auth';
import { clearTokens, getAccessToken } from '@/lib/auth-storage';
import { getMyProfile } from '@/lib/member';

type Provider = 'kakao' | 'naver' | 'google' | 'apple';

export default function LoginScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [loading, setLoading] = useState<Provider | null>(null);
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
        if (active) router.replace(profile ? '/home' : '/onboarding');
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

  async function handle(provider: Provider, fn: () => Promise<LoginResult>) {
    if (loading) return;
    setLoading(provider);
    try {
      const result = await fn();
      // 프로필(Member) 존재 여부로 분기 — 계정만 있고 온보딩 미완료면 온보딩으로
      let hasProfile: boolean;
      try {
        hasProfile = (await getMyProfile()) != null;
      } catch {
        hasProfile = !result.isNewUser; // 조회 실패 시 폴백
      }
      router.replace(hasProfile ? '/home' : '/onboarding');
    } catch (e) {
      Alert.alert('로그인 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setLoading(null);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.safe}>
        {/* 브랜드 */}
        <View style={styles.brand}>
          <Text style={[styles.wordmark, { color: c.text, fontFamily: Fonts.serif }]}>프롤로그</Text>
          <Text style={[styles.tagline, { color: c.textSecondary }]}>하루 한 문답, 서로를 알아가는</Text>
          <Text style={[styles.tagline, { color: c.textSecondary }]}>가치관 블라인드 소개팅</Text>
        </View>

        {/* 소셜 로그인 */}
        <View style={styles.buttons}>
          <SocialButton
            label="카카오로 시작하기"
            iconText="k"
            backgroundColor="#FEE500"
            textColor="#191600"
            iconColor="#FEE500"
            iconBackground="#191600"
            loading={loading === 'kakao'}
            onPress={() => handle('kakao', loginWithKakao)}
          />
          <SocialButton
            label="네이버로 시작하기"
            iconText="N"
            backgroundColor="#03C75A"
            textColor="#FFFFFF"
            loading={loading === 'naver'}
            onPress={() => handle('naver', loginWithNaver)}
          />
          <SocialButton
            label="구글로 시작하기"
            iconText="G"
            backgroundColor="#FFFFFF"
            textColor={c.text}
            iconColor="#4285F4"
            borderColor={c.border}
            loading={loading === 'google'}
            onPress={() => handle('google', loginWithGoogle)}
          />
          {Platform.OS === 'ios' && (
            <SocialButton
              label="Apple로 시작하기"
              iconText=""
              backgroundColor="#111111"
              textColor="#FFFFFF"
              loading={loading === 'apple'}
              onPress={() => handle('apple', loginWithApple)}
            />
          )}
        </View>

        <Text style={[styles.terms, { color: c.textSecondary }]}>
          시작하면 이용약관 및 개인정보처리방침에 동의합니다
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1, paddingHorizontal: 25, justifyContent: 'flex-end' },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontSize: 44, fontWeight: '700', letterSpacing: 2, marginTop: 8 },
  tagline: { fontSize: 15, marginTop: 6 },
  buttons: { gap: 12 },
  terms: { fontSize: 11, textAlign: 'center', marginTop: 20, marginBottom: 8 },
});
