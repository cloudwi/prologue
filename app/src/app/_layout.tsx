import * as Sentry from '@sentry/react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { enableAppSwitcherProtectionAsync, usePreventScreenCapture } from 'expo-screen-capture';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/toast';
import { UpdateRequired } from '@/components/update-required';
import { requiredUpdateStoreUrl } from '@/lib/app-config';
import { AppearanceProvider, useAppearance } from '@/lib/appearance';

/**
 * 에러 모니터링 — 유저가 겪는 크래시를 제보보다 먼저 알기 위한 장치.
 * DSN은 비밀이 아니라(클라이언트에 실려 나가는 값) 코드에 둔다.
 * 개발 중에는 끈다 — 로컬에서 일부러 내는 에러가 쿼터를 갉아먹지 않게.
 */
Sentry.init({
  dsn: 'https://7a48292a145d53327d445f8e3cb848bb@o4511901645078528.ingest.us.sentry.io/4511901658841088',
  enabled: !__DEV__,
  sendDefaultPii: false, // 소개팅 앱 — 에러 리포트에 개인정보를 싣지 않는다
});

/**
 * 스플래시를 우리가 내린다 — 자동으로 사라지게 두지 않는다(2026-08-25).
 *
 * 예전에는 번들이 로드되는 순간 스플래시가 사라지고, 그 자리에 맨 스피너가 떴다.
 * 그런데 첫 화면은 저장된 토큰을 읽고 프로필을 **네트워크로** 확인한다 —
 * 서버가 잠들어 있으면(무료 티어 콜드스타트) 그 빈 화면이 한참 간다.
 * 스플래시는 로그인 화면과 같은 조판으로 구운 브랜드 화면이라, 떠 있는 동안은
 * '로딩'이 아니라 '시작'으로 읽힌다.
 *
 * 내리는 건 index.tsx가 갈 곳을 정한 뒤. 다만 어디서도 못 내리는 경우를 대비해
 * 아래 SPLASH_MAX_MS 안전장치를 둔다 — 스플래시에 갇힌 앱은 죽은 앱이다.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  // 이미 사라졌거나 지원하지 않는 환경 — 붙잡지 못했을 뿐이라 앱은 그대로 간다.
});

/** 무슨 일이 있어도 이 시간이 지나면 스플래시를 내린다. */
const SPLASH_MAX_MS = 4000;

export default Sentry.wrap(RootLayout);

function RootLayout() {
  useScreenPrivacy();
  useSplashFailsafe();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* 화면 테마 취향을 먼저 읽어야 첫 화면부터 올바른 색으로 그려진다. */}
        <AppearanceProvider>
          <Navigation />
        </AppearanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** 스플래시 안전장치 — 첫 화면이 어떤 이유로든 내리지 못해도 앱이 갇히지 않게. */
function useSplashFailsafe() {
  useEffect(() => {
    const timer = setTimeout(() => void SplashScreen.hideAsync().catch(() => {}), SPLASH_MAX_MS);
    return () => clearTimeout(timer);
  }, []);
}

/**
 * 화면 캡처 차단 — 앱 전체에 건다.
 *
 * 상대의 사진과 답변이 늘 떠 있고, 편지에는 전화번호와 카카오톡 ID가 실려 간다.
 * 건넨 사람은 상대 한 명에게만 준 것이라 믿는데 그게 갈무리돼 떠돌면 신뢰가 무너진다.
 *
 * 안드로이드는 FLAG_SECURE라 스크린샷·화면 녹화가 막히고 최근 앱 미리보기도 비워진다.
 * iOS는 캡처 차단(13+)은 되지만 앱 스위처 가림은 별도라, 그쪽만 따로 켠다.
 */
function useScreenPrivacy() {
  usePreventScreenCapture();

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // 실패해도 앱이 멈출 이유는 없다 — 가림막이 없을 뿐이다.
    void enableAppSwitcherProtectionAsync().catch(() => {});
  }, []);
}

/**
 * 부팅 시 한 번 서버에 최소 지원 버전을 물어본다.
 * 확인이 끝나기를 기다리지는 않는다 — 느린 네트워크 때문에 첫 화면이 늦게 뜨면 손해가 더 크다.
 * 막아야 한다는 답이 오면 그때 화면을 갈아끼운다.
 */
function useForcedUpdate() {
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const url = await requiredUpdateStoreUrl();
      if (active && url) setStoreUrl(url);
    })();
    return () => {
      active = false;
    };
  }, []);

  return storeUrl;
}

function Navigation() {
  const { scheme } = useAppearance();
  const updateStoreUrl = useForcedUpdate();

  if (updateStoreUrl) {
    return (
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <UpdateRequired storeUrl={updateStoreUrl} />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="consent" />
        <Stack.Screen name="email-auth" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        {/* MY 하위 화면 — 탭 위에 쌓여 뎁스를 만든다 */}
        <Stack.Screen name="my/edit-photos" />
        <Stack.Screen name="my/edit-basic" />
        <Stack.Screen name="my/edit-detail" />
        <Stack.Screen name="my/edit-bio" />
        <Stack.Screen name="my/preview" />
        <Stack.Screen name="my/preferences" />
        <Stack.Screen name="my/blocked" />
        <Stack.Screen name="my/appearance" />
        <Stack.Screen name="my/letters" />
        <Stack.Screen name="my/answers" />
        <Stack.Screen name="my/events" />
        <Stack.Screen name="my/invite" />
        <Stack.Screen name="my/guide" />
        <Stack.Screen name="my/withdraw" />
        <Stack.Screen name="peer" />
        <Stack.Screen name="past-peers" />
        <Stack.Screen name="meetup-create" />
        <Stack.Screen name="meetup/[id]" />
        <Stack.Screen name="meetup-member/[id]" />
        <Stack.Screen name="my-meetups" />
        <Stack.Screen name="mail-compose" />
        <Stack.Screen name="mail-view" />
      </Stack>
      {/* 전역 토스트 — 스택 위에 떠서 어느 화면에서든 showToast()로 말할 수 있다. */}
      <ToastHost />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
