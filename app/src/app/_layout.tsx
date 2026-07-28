import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
            <Stack.Screen name="my/guide" />
            <Stack.Screen name="my/withdraw" />
            <Stack.Screen name="conversation/[id]" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
