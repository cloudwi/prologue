import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

function Navigation() {
  const { scheme } = useAppearance();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
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
        <Stack.Screen name="my/guide" />
        <Stack.Screen name="my/withdraw" />
        <Stack.Screen name="peer" />
        <Stack.Screen name="conversation/[id]" />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
