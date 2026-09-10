import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radius, type ThemeColors } from '@/constants/theme';

/**
 * 모든 조각이 함께 쓰는 **하나의** 시계.
 *
 * 예전에는 `Skeleton`마다 자기 `useSharedValue`를 돌렸다. 목록 여덟 줄에 조각이 셋씩이면
 * 스물네 개가 각자 마운트된 순간부터 세기 시작해 위상이 어긋났고, 화면은 조용히 숨쉬는 면이
 * 아니라 지직거리는 노이즈로 읽혔다. 모듈 밖에 시계를 하나 두면 몇 개가 떠 있든 같은 호흡으로
 * 밝아졌다 어두워진다.
 *
 * 한 번 시작하면 멈추지 않는다. 조각이 사라져도 값 하나가 도는 비용은 없는 것과 같고,
 * 다음 화면에서 새 조각이 떠도 이미 돌고 있는 호흡에 그대로 올라탄다 — 멈췄다 다시 켜면
 * 그 순간 모든 조각이 1에서 다시 출발해 화면이 한 번 번쩍인다.
 */
const PULSE_DIM = 0.62;
const pulse = makeMutable(1);
let ticking = false;

function startPulse() {
  if (ticking) return;
  ticking = true;
  pulse.value = withRepeat(withTiming(PULSE_DIM, { duration: 1000, easing: Easing.inOut(Easing.quad) }), -1, true);
}

/**
 * 로딩 자리 표시 — 스피너 대신 **들어올 내용의 모양**을 미리 그린다.
 *
 * 스피너는 "기다리라"고만 말하고 아무것도 알려주지 않는다. 게다가 내용이 들어오는 순간
 * 화면이 통째로 바뀌어 눈이 다시 자리를 찾아야 한다. 같은 자리에 같은 크기의 회색 면을 두면
 * 무엇이 올지 미리 읽히고, 채워질 때 화면이 튀지 않는다.
 *
 * 숨쉬기(opacity)만 한다 — 좌우로 훑는 반짝임(shimmer)은 차가운 종이 톤에 견줘 요란하다.
 * 다만 예전처럼 0.55까지 떨어뜨리지는 않는다. 그 정도로 흐려지면 바탕 위에 놓인 조각은
 * 가장 흐린 순간에 사라져버려서, 숨쉬는 게 아니라 깜빡이는 것으로 보였다.
 *
 * 높이는 [height]나 [aspectRatio] **둘 중 하나로** 정한다. 사진 자리처럼 폭이 정해지면
 * 높이가 따라오는 곳은 비율을 쓴다 — 고정 픽셀로 적어두면 기기 폭이 바뀔 때마다 어긋난다.
 * (둘 다 주지 않으면 글줄 하나 높이로 본다.)
 */
export function Skeleton({
  c,
  width = '100%',
  height,
  aspectRatio,
  radius = Radius.sm,
  style,
}: {
  c: ThemeColors;
  width?: DimensionValue;
  /** 고정 높이. [aspectRatio]와 함께 주지 않는다 — 둘 다 정해지면 비율이 무시된다. */
  height?: number;
  /** 폭에서 높이를 끌어내는 비율(가로/세로). 사진·커버처럼 기기 폭을 따라야 하는 자리에. */
  aspectRatio?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!reduceMotion) startPulse();
  }, [reduceMotion]);

  // "동작 줄이기"를 켠 사람에게 무한 반복 애니메이션은 그 자체로 방해다. 자리는 그대로 두고
  // 숨쉬기만 멈춘다 — 회색 면이 보이는 한 "아직 오지 않았다"는 말은 그대로 전해진다.
  const animated = useAnimatedStyle(() => ({ opacity: reduceMotion ? 1 : pulse.value }), [reduceMotion]);

  return (
    <Animated.View
      style={[
        { width, borderRadius: radius, backgroundColor: c.skeleton },
        aspectRatio === undefined ? { height: height ?? 16 } : { aspectRatio },
        animated,
        style,
      ]}
    />
  );
}

/**
 * 스켈레톤 한 벌을 감싸는 자리 — 스크린리더에게 "불러오는 중"이라고 한 번만 말한다.
 *
 * 회색 조각들은 각각으로는 아무 뜻이 없다. 감싸지 않으면 스크린리더가 빈 View 스물몇 개를
 * 훑고 지나가며 아무것도 읽어주지 못한다. 하나의 요소로 묶어 이름을 붙이면 "불러오는 중"
 * 한 마디로 끝난다.
 */
export function SkeletonScreen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={style}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="불러오는 중"
      importantForAccessibility="yes"
    >
      {children}
    </View>
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

const styles = StyleSheet.create({
  list: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBody: { flex: 1, gap: 0 },
  rowSub: { marginTop: 8 },
  card: { borderRadius: Radius.lg, padding: 18 },
  surface: { borderRadius: Radius.lg, padding: 16 },
  clip: { padding: 0, overflow: 'hidden' },
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
  radius = Radius.lg,
}: {
  c: ThemeColors;
  bodyLines?: number;
  eyebrow?: boolean;
  /** 실제 카드의 모서리를 따라간다 — 화면마다 lg(24)와 md(18)가 섞여 있다. */
  radius?: number;
}) {
  return (
    <View style={[styles.card, { backgroundColor: c.backgroundElement, borderRadius: radius }]}>
      {eyebrow && <Skeleton c={c} width={62} height={11} />}
      <Skeleton c={c} width="82%" height={16} style={eyebrow ? styles.cardTitle : undefined} />
      <SkeletonLines c={c} lines={bodyLines} lineHeight={12} gap={9} style={styles.cardBody} />
    </View>
  );
}

/**
 * 카드 면 위에 조각을 얹는 자리.
 *
 * 면 색을 화면이 정한다. 편지 봉투는 테라코타 틴트, 모임 카드는 중성 회색이라 통짜 회색 하나로
 * 둘 다 흉내낼 수 없다 — 채워질 때 바뀌는 것이 글자만이 아니라 배경 전체가 되면 화면이 튄다.
 *
 * [padding]도 화면이 정한다. 실제 카드가 18인데 여기서 16으로 그리면 안쪽 조각이 2px씩
 * 어긋난 채로 자리를 예고한다.
 */
export function SkeletonCard({
  background,
  clip = false,
  padding,
  radius = Radius.lg,
  style,
  children,
}: {
  background: string;
  /** 사진이 카드 위쪽에 꽉 차는 카드 — 모서리 밖으로 넘치지 않게 자른다. */
  clip?: boolean;
  padding?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.surface,
        clip && styles.clip,
        { backgroundColor: background, borderRadius: radius },
        padding !== undefined && { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** 여러 조각을 목록처럼 세울 때의 바깥 여백 — 화면마다 padding을 다시 쓰지 않도록. */
export function SkeletonList({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <SkeletonScreen style={[styles.list, style]}>{children}</SkeletonScreen>;
}
