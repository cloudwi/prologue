import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, type ThemeColors } from '@/constants/theme';

/**
 * MY 하위 화면의 공통 틀. 뒤로가기 + 제목 + (선택) 우측 저장 버튼.
 * 저장은 각 화면 안에서만 일어난다 — 허브는 읽기 전용이다.
 */
export function SubScreen({
  title,
  c,
  children,
  onSave,
  saveDisabled = false,
  saving = false,
}: {
  title: string;
  c: ThemeColors;
  children: ReactNode;
  onSave?: () => void;
  saveDisabled?: boolean;
  saving?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.textSecondary }]}>← 뒤로</Text>
          </Pressable>
          <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]} numberOfLines={1}>
            {title}
          </Text>
          {onSave ? (
            <Pressable
              onPress={onSave}
              disabled={saveDisabled || saving}
              hitSlop={12}
              style={({ pressed }) => [{ opacity: saveDisabled || saving ? 0.35 : pressed ? 0.5 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <Text style={[styles.save, { color: c.primary }]}>저장</Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
        {children}
      </SafeAreaView>
    </View>
  );
}

/** 아직 붙일 API가 없는 화면의 자리. 무엇이 준비 중인지 분명히 밝힌다. */
export function ComingSoon({ c, description }: { c: ThemeColors; description: string }) {
  return (
    <View style={[styles.flex, styles.center, { paddingHorizontal: 32 }]}>
      <Text style={[styles.soonTitle, { color: c.text }]}>준비 중이에요</Text>
      <Text style={[styles.soonDesc, { color: c.textSecondary }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
  },
  back: { fontSize: 15, minWidth: 56 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  save: { fontSize: 15, fontWeight: '700', minWidth: 56, textAlign: 'right' },
  spacer: { minWidth: 56 },
  soonTitle: { fontSize: 18, fontWeight: '700' },
  soonDesc: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
