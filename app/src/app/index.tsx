import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { Colors, Fonts } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { clearTokens, getAccessToken } from '@/lib/auth-storage';
import { getMyProfile } from '@/lib/member';

export default function LoginScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
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
      <SafeAreaView style={styles.safe}>
        {/* 브랜드 */}
        <View style={styles.brand}>
          <Image
            source={require('@/assets/images/brand-mark.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.wordmark, { color: c.text, fontFamily: Fonts.serif }]}>프롤로그</Text>
          <Text style={[styles.wordmarkEn, { color: c.primary }]}>PROLOGUE</Text>
          <Text style={[styles.tagline, { color: c.textSecondary }]}>하루 한 문답, 서로를 알아가는</Text>
          <Text style={[styles.tagline, { color: c.textSecondary }]}>가치관 블라인드 소개팅</Text>
        </View>

        {/* 이메일 로그인 (소셜 로그인 제거 → 이메일 인증 방식으로 전환) */}
        <View style={styles.buttons}>
          <Pressable
            onPress={() => router.push('/email-auth')}
            style={({ pressed }) => [styles.emailBtn, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.emailBtnText, { color: c.primaryText }]}>이메일로 시작하기</Text>
          </Pressable>
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
  logo: { width: 72, height: 72, marginBottom: 4 },
  wordmark: { fontSize: 36, fontWeight: '700', letterSpacing: 2, marginTop: 8 },
  wordmarkEn: { fontSize: 13, fontWeight: '700', letterSpacing: 6, marginTop: 6 },
  tagline: { fontSize: 15, marginTop: 6 },
  buttons: { gap: 12 },
  emailBtn: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emailBtnText: { fontSize: 16, fontWeight: '700' },
  terms: { fontSize: 11, textAlign: 'center', marginTop: 20, marginBottom: 8 },
});
