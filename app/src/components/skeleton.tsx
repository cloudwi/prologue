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

const styles = StyleSheet.create({
  list: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBody: { flex: 1, gap: 0 },
  rowSub: { marginTop: 8 },
  card: { borderRadius: Radius.lg, padding: 18 },
  cardTitle: { marginTop: 10 },
  cardBody: { marginTop: 12 },
});


/**
 * 목록 한 줄이 들어올 자리 — 왼쪽 동그라미(아바타), 제목 줄, 부제 줄, 오른쪽 조각.
 *
 * 통짜 회색 막대를 여러 개 까는 것과 다르다. 실제 줄에는 굵기가 다른 글줄 둘과 여백이 있어서,
 * 같은 자리에 같은 결의 조각을 두어야 채워질 때 눈이 다시 자리를 찾지 않는다.
 */
export function SkeletonRow({
  c,
  avatar = false,
  subtitle = true,
  trailing = false,
}: {
  c: ThemeColors;
  avatar?: boolean;
  subtitle?: boolean;
  trailing?: boolean;
}) {
  return (
    <View style={styles.row}>
      {avatar && <Skeleton c={c} width={44} height={44} radius={22} />}
      <View style={styles.rowBody}>
        <Skeleton c={c} width="46%" height={15} />
        {subtitle && <Skeleton c={c} width="72%" height={12} style={styles.rowSub} />}
      </View>
      {trailing && <Skeleton c={c} width={44} height={20} radius={Radius.pill} />}
    </View>
  );
}

/**
 * 글이 담긴 카드 자리 — 작은 머리글, 제목 한 줄, 본문 몇 줄.
 *
 * 카드 면을 먼저 깔고 그 위에 글줄을 얹는다. 실제 화면이 밝은 카드 위의 글이라, 통짜 회색을
 * 두면 색부터 다르게 보인다. 채워질 때 바뀌는 것이 글자뿐이어야 화면이 조용하다.
 */
export function SkeletonTextCard({
  c,
  bodyLines = 3,
  eyebrow = true,
}: {
  c: ThemeColors;
  bodyLines?: number;
  eyebrow?: boolean;
}) {
  return (
    <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
      {eyebrow && <Skeleton c={c} width={62} height={11} />}
      <Skeleton c={c} width="82%" height={16} style={eyebrow ? styles.cardTitle : undefined} />
      <SkeletonLines c={c} lines={bodyLines} lineHeight={12} gap={9} style={styles.cardBody} />
    </View>
  );
}

/** 여러 조각을 목록처럼 세울 때의 바깥 여백 — 화면마다 padding을 다시 쓰지 않도록. */
export function SkeletonList({ c, children }: { c: ThemeColors; children: React.ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

