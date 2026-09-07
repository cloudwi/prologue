import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 탭의 첫 조회 실패. 빈 목록과 구분하고, 같은 자리에서 다시 읽을 수 있게 한다. */
export function ScreenLoadError({
  title,
  onRetry,
  retrying = false,
}: {
  title: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + 24 }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>{title}</Text>
        <Text style={[styles.description, { color: c.textSecondary }]}>
          연결 상태를 확인하고 다시 시도해주세요.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: retrying, busy: retrying }}
          disabled={retrying}
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, { backgroundColor: c.text, opacity: pressed || retrying ? 0.6 : 1 }]}
        >
          <Text style={[styles.retryText, { color: c.background }]}>{retrying ? '다시 불러오는 중' : '다시 시도'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { ...Type.title, textAlign: 'center' },
  description: { ...Type.body, textAlign: 'center', marginTop: 8 },
  retry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.md, marginTop: 24 },
  retryText: { ...Type.button, textAlign: 'center' },
});
