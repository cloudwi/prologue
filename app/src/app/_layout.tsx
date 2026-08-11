import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UpdateRequired } from '@/components/update-required';
import { requiredUpdateStoreUrl } from '@/lib/app-config';
import { AppearanceProvider, useAppearance } from '@/lib/appearance';

export default function RootLayout() {
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
        <Stack.Screen name="my/preview" />
        <Stack.Screen name="my/preferences" />
        <Stack.Screen name="my/blocked" />
        <Stack.Screen name="my/appearance" />
        <Stack.Screen name="my/letters" />
        <Stack.Screen name="my/answers" />
        <Stack.Screen name="my/events" />
        <Stack.Screen name="my/guide" />
        <Stack.Screen name="my/withdraw" />
        <Stack.Screen name="peer" />
        <Stack.Screen name="past-peers" />
        <Stack.Screen name="mail-compose" />
        <Stack.Screen name="mail-view" />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
