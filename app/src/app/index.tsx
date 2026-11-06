import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { useQueryClient } from '@tanstack/react-query';

import { ScreenLoadError } from '@/components/screen-load-error';

import { Colors, Radius, Type } from '@/constants/theme';
import { identify, track } from '@/lib/analytics';
import { ApiError } from '@/lib/api';
import { clearTokens, getAccessToken } from '@/lib/auth-storage';
import { useAppearance } from '@/lib/appearance';
import { getMyProfile } from '@/lib/member';
import { getConsent } from '@/lib/consent';
import { SESSION_QUERY_KEY } from '@/lib/session';

export default function LoginScreen() {
  const { scheme } = useAppearance();
  const c = Colors[scheme];
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(true); // 자동 로그인 확인 중
  const [checkFailed, setCheckFailed] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const wide = useWindowDimensions().width >= 900;

  /** 갈 곳이 정해졌으니 스플래시를 내린다. 실패해도 앱은 그대로 간다(루트에 안전장치가 있다). */
  const hideSplash = () => void SplashScreen.hideAsync().catch(() => {});

  // 앱 시작 시: 저장된 토큰이 있으면 프로필 확인 후 자동 진입
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (!active) return;
      active = false;
      setChecking(false);
      setCheckFailed(true);
      hideSplash();
    }, 20000);
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (active) setChecking(false);
          return;
        }
        const profile = await getMyProfile();
        const pendingConsent = profile ? null : await getConsent();
        if (!active) return;
        if (profile?.accountId) identify(profile.accountId);
        // 방금 확인한 것을 세션 캐시에 심어둔다 — 탭들이 같은 질문을 다시 네트워크로 묻지 않게.
        // (심지 않으면 발견 탭이 자기 차례에 프로필을 또 기다리며 빈 화면을 낸다)
        queryClient.setQueryData(SESSION_QUERY_KEY, { signedIn: true, profile });
        if (active) {
          router.replace(profile?.onboardingComplete === false ? {
            pathname: '/onboarding', params: { resume: '1', ...(!profile.preferredGender ? { intent: 'meetup' } : {}) },
          } : profile ? (profile.preferredGender ? '/discover' : '/meetups') : {
            pathname: pendingConsent ? '/onboarding' : '/consent',
            params: { ...(!pendingConsent ? { authenticated: '1' } : {}), ...(!pendingConsent?.sensitive ? { intent: 'meetup' } : {}) },
          });
          hideSplash(); // 목적지가 그려지는 프레임에 맞춰 내린다
        }
      } catch (e) {
        if (!active) return;
        // 재발급까지 실패한 만료(401/403) — authedFetch가 토큰을 지웠으니 로그인 화면으로 남는다
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          await clearTokens();
          queryClient.clear();
        } else if (active) {
          setCheckFailed(true);
        }
        if (active) { setChecking(false); hideSplash(); }
      } finally {
        clearTimeout(timeout);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [router, queryClient, retryAttempt]);

  if (checkFailed) return <ScreenLoadError title="로그인 정보를 확인하지 못했어요" onRetry={() => {
    setChecking(true); setCheckFailed(false); setRetryAttempt((n) => n + 1);
  }} />;

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
        <Text style={[styles.tagline, { color: c.textSecondary }]}>로그인 정보를 확인하고 있어요</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]} onLayout={hideSplash}>

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.layout, wide && styles.wideLayout]}>
            <View style={[styles.brand, wide && styles.wideBrand]}>
              <View style={styles.brandRow}>
                <Image
                  source={require('@/assets/images/brand-mark.png')}
                  style={styles.logo}
                  contentFit="contain"
                />
                <Text style={[styles.wordmark, { color: c.text }]}>프롤로그</Text>
              </View>
              <Text accessibilityRole="header" style={[styles.headline, wide && styles.wideHeadline, { color: c.text }]}>사진보다 먼저,{'\n'}생각이 닿는 사이.</Text>
              <Text style={[styles.tagline, { color: c.textSecondary }]}>하루 한 문답으로 서로를 알아가고,{'\n'}마음이 닿으면 편지로 이어가요.</Text>
            </View>

            {/* 신규 가입은 동의부터, 기존 회원은 이메일 인증으로 바로 간다. */}
            <View style={[styles.buttons, wide && styles.wideButtons]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="가입 없이 문답 체험하기"
                onPress={() => router.push('/preview')}
                style={({ pressed }) => [styles.previewCard, { backgroundColor: c.backgroundElement, opacity: pressed ? 0.75 : 1 }]}
              >
                <View style={styles.previewHeading}>
                  <Text style={[Type.caption, { color: c.textSecondary }]}>예시 문답</Text>
                  <Text style={[Type.caption, { color: c.textSecondary }]}>가입 없이 체험</Text>
                </View>
                <Text style={[Type.title, { color: c.text }]}>쉬는 날에는 주로 무엇을 하나요?</Text>
                <View style={[styles.sampleAnswer, { backgroundColor: c.background }]}>
                  <Text style={[Type.body, { color: c.textSecondary }]}>늦은 아침을 먹고 목적지 없이 걷는 편이에요.</Text>
                </View>
                <View style={styles.previewHeading}>
                  <Text style={[Type.label, { color: c.text }]}>가입 없이 문답 체험하기</Text>
                  <Text style={[Type.title, { color: c.text }]} accessibilityElementsHidden importantForAccessibility="no">›</Text>
                </View>
              </Pressable>
              <Text style={[styles.freeNote, { color: c.textSecondary }]}>가입과 매일의 문답은 무료예요</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/consent')}
                style={({ pressed }) => [styles.startBtn, { backgroundColor: c.primaryStrong, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.startBtnText, { color: c.primaryText }]}>문답으로 인연 만나기</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => router.push('/email-auth?mode=login')} style={styles.loginLink}>
                <Text style={[styles.loginText, { color: c.textSecondary }]}>이미 가입했어요 · 로그인</Text>
              </Pressable>

              {/*
                * 가입하지 않고 모임부터 — 1.3에서 낸 두 번째 문.
                *
                * 소개팅은 사진과 문답을 먼저 요구해서 문턱이 높다. 그런데 모임은 그럴 이유가 없다
                * ("모임을 하는 사람이 굳이 솔로일 필요는 없다"). 어떤 자리가 열려 있는지 먼저 보고
                * 가입을 정하게 한다 — 손드는 순간에만 나를 밝히면 된다.
                */}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  track('guest_browsed');
                  queryClient.setQueryData(SESSION_QUERY_KEY, { signedIn: false, profile: null });
                  router.replace('/meetups');
                }}
                style={({ pressed }) => [styles.guestBtn, { borderTopColor: c.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.guestBtnText, { color: c.text }]}>가입 없이 모임 둘러보기</Text>
              </Pressable>

              {/* 동의는 다음 화면에서 항목별로 받는다 — 여기서는 미리 읽어볼 수 있는 통로만 둔다 */}
              <Text style={[styles.terms, { color: c.textSecondary }]}>
                <Text accessibilityRole="link" style={[styles.termsLink, { color: c.textSecondary }]} onPress={() => router.push('/terms')}>
                  이용약관
                </Text>
                {'   ·   '}
                <Text accessibilityRole="link" style={[styles.termsLink, { color: c.textSecondary }]} onPress={() => router.push('/privacy')}>
                  개인정보처리방침
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
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
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24, justifyContent: 'center' },
  layout: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', gap: 32, justifyContent: 'space-between' },
  wideLayout: { flexDirection: 'row', alignItems: 'center', maxWidth: 1040, gap: 80 },
  brand: { paddingTop: 8, gap: 20 },
  wideBrand: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 39, height: 28 },
  wordmark: { ...Type.title },
  headline: { ...Type.display, marginTop: 12, fontSize: 32, lineHeight: 44, letterSpacing: -0.8 },
  wideHeadline: { fontSize: 42, lineHeight: 58 },
  tagline: { ...Type.body },
  buttons: { gap: 8 },
  wideButtons: { width: 380 },
  previewCard: { padding: 20, borderRadius: Radius.lg, gap: 16, marginBottom: 8 },
  previewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sampleAnswer: { padding: 16, borderRadius: Radius.sm },
  freeNote: { ...Type.caption, textAlign: 'center', marginBottom: 4 },
  loginLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  loginText: { ...Type.label },
  startBtn: { minHeight: 56, padding: 16, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { ...Type.button },
  // 모임은 소개팅 시작과 구분하되 별도의 큰 버튼 면을 더하지 않는다.
  guestBtn: { minHeight: 52, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  guestBtnText: { ...Type.label },
  terms: { ...Type.caption, textAlign: 'center', marginTop: 8, marginBottom: 8 },
  termsLink: { textDecorationLine: 'underline', fontWeight: '600' },
});
