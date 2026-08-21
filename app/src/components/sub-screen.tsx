import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, type ThemeColors } from '@/constants/theme';

/**
 * MY 하위 화면의 공통 틀 — 네이티브 스택 헤더를 쓴다.
 * 직접 그리던 "← 뒤로"보다 플랫폼 기본(iOS 셰브런+스와이프 백, Android 화살표+하드웨어 백)이 낫다.
 * 저장은 headerRight로 올린다 — 저장은 각 화면 안에서만 일어나고 허브는 읽기 전용이다.
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
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.text,
          headerTitleStyle: { fontFamily: Fonts.serif, fontWeight: '700', color: c.text },
          headerRight: onSave
            ? () =>
                saving ? (
                  <ActivityIndicator color={c.primary} />
                ) : (
                  <Pressable onPress={onSave} disabled={saveDisabled} hitSlop={12}>
                    <Text style={[styles.save, { color: c.primaryStrong, opacity: saveDisabled ? 0.35 : 1 }]}>
                      저장
                    </Text>
                  </Pressable>
                )
            : undefined,
        }}
      />
      {children}
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
  save: { fontSize: 16, fontWeight: '700' },
  soonTitle: { fontSize: 18, fontWeight: '700' },
  soonDesc: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 23 },
});
