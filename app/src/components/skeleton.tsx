import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Radius, type ThemeColors } from '@/constants/theme';

/**
 * 로딩 자리 표시 — 스피너 대신 **들어올 내용의 모양**을 미리 그린다.
 *
 * 스피너는 "기다리라"고만 말하고 아무것도 알려주지 않는다. 게다가 내용이 들어오는 순간
 * 화면이 통째로 바뀌어 눈이 다시 자리를 찾아야 한다. 같은 자리에 같은 크기의 회색 면을 두면
 * 무엇이 올지 미리 읽히고, 채워질 때 화면이 튀지 않는다.
 *
 * 숨쉬기(opacity)만 한다 — 좌우로 훑는 반짝임(shimmer)은 차가운 종이 톤에 견줘 요란하다.
 */
export function Skeleton({
  c,
  width = '100%',
  height = 16,
  radius = Radius.sm,
  style,
}: {
  c: ThemeColors;
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: c.backgroundSelected }, animated, style]}
    />
  );
}

/** 글줄 여러 개 — 마지막 줄은 짧게 두어 '문단'처럼 읽힌다. */
export function SkeletonLines({
  c,
  lines = 3,
  lineHeight = 14,
  gap = 10,
  style,
}: {
  c: ThemeColors;
  lines?: number;
  lineHeight?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} c={c} height={lineHeight} width={i === lines - 1 ? '62%' : '100%'} />
      ))}
    </View>
  );
}

export const skeletonStyles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: 20, gap: 14 },
});
