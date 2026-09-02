import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { useQueryClient } from '@tanstack/react-query';

import { Colors, Fonts } from '@/constants/theme';
import { identify, track } from '@/lib/analytics';
import { ApiError } from '@/lib/api';
import { clearTokens, getAccessToken } from '@/lib/auth-storage';
import { useAppearance } from '@/lib/appearance';
import { getMyProfile } from '@/lib/member';
import { SESSION_QUERY_KEY } from '@/lib/session';

export default function LoginScreen() {
  const { scheme } = useAppearance();
  const c = Colors[scheme];
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(true); // 자동 로그인 확인 중

  /** 갈 곳이 정해졌으니 스플래시를 내린다. 실패해도 앱은 그대로 간다(루트에 안전장치가 있다). */
  const hideSplash = () => void SplashScreen.hideAsync().catch(() => {});

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
        // 방금 확인한 것을 세션 캐시에 심어둔다 — 탭들이 같은 질문을 다시 네트워크로 묻지 않게.
        // (심지 않으면 발견 탭이 자기 차례에 프로필을 또 기다리며 빈 화면을 낸다)
        queryClient.setQueryData(SESSION_QUERY_KEY, { signedIn: true, profile });
        if (active) {
          router.replace(profile ? '/discover' : '/onboarding');
          hideSplash(); // 목적지가 그려지는 프레임에 맞춰 내린다
        }
      } catch (e) {
        // 재발급까지 실패한 만료(401/403) — authedFetch가 토큰을 지웠으니 로그인 화면으로 남는다
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) await clearTokens();
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, queryClient]);

  /*
   * 확인이 끝나기 전 — 그 자리는 스플래시가 덮고 있다.
   * 스피너를 띄우면 브랜드 화면이 사라진 자리에 점 세 개만 남는다.
   *
   * 그런데 확인이 길어져(무료 티어 콜드스타트) 루트의 안전장치가 스플래시를 내리면
   * 빈 배경만 남는다. 그래서 스플래시와 **같은 그림**을 그려 둔다 —
   * 무엇이 먼저 걷히든 화면은 이어진 것처럼 보인다. 애니메이션은 넣지 않는다(스플래시는 정지 화면이다).
   *
   * "같은 그림"은 말 그대로여야 한다. 예전에는 마크와 글자를 앱에서 새로 조판했는데,
   * 스플래시가 쓰는 splash.png와 자간·크기가 미묘하게 달라 걷히는 순간 화면이 한 번 튀었다
   * (유저 지적 2026-09-02). 이제 같은 파일을, 같은 폭(app.json의 imageWidth 200)으로,
   * 같은 배경 위에 그린다 — 다크 모드까지 짝을 맞춘다.
   */
  if (checking) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background }]}>
        <Image
          source={scheme === 'dark' ? require('@/assets/images/splash-dark.png') : require('@/assets/images/splash.png')}
          style={styles.splashMatch}
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]} onLayout={hideSplash}>

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

          {/*
            * 가입하지 않고 모임부터 — 1.3에서 낸 두 번째 문.
            *
            * 소개팅은 사진과 문답을 먼저 요구해서 문턱이 높다. 그런데 모임은 그럴 이유가 없다
            * ("모임을 하는 사람이 굳이 솔로일 필요는 없다"). 어떤 자리가 열려 있는지 먼저 보고
            * 가입을 정하게 한다 — 손드는 순간에만 나를 밝히면 된다.
            */}
          <Pressable
            onPress={() => {
              track('guest_browsed');
              queryClient.setQueryData(SESSION_QUERY_KEY, { signedIn: false, profile: null });
              router.replace('/meetups');
            }}
            style={({ pressed }) => [styles.guestBtn, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.guestBtnText, { color: c.text }]}>가입 없이 모임 둘러보기</Text>
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

/** app.json의 expo-splash-screen 설정과 같은 값 — 여기만 바꾸면 이음매가 어긋난다. */
const SPLASH_WIDTH = 200;
const SPLASH_RATIO = 392 / 600; // splash.png의 세로/가로

const styles = StyleSheet.create({
  splashMatch: { width: SPLASH_WIDTH, height: SPLASH_WIDTH * SPLASH_RATIO },
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
  // 두 번째 문이라 테두리만 — 색 덩어리가 둘이면 어느 쪽이 본길인지 흐려진다.
  guestBtn: { height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  guestBtnText: { fontSize: 16, fontWeight: '600' },
  terms: { fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 8, lineHeight: 18 },
  termsLink: { textDecorationLine: 'underline', fontWeight: '600' },
});
