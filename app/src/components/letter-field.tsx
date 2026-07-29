import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * 작은 편지 봉투들이 팔랑이며 떨어지는 배경 장식. 터치를 가로채지 않는다.
 * 브랜드 마크(하트 씰 봉투)와 같은 조형 — 하늘에서 도착하는 편지들.
 */

export type LetterTones = {
  /** 봉투 종이 면 */
  paper: string;
  /** 접힌 덮개(플랩) — 종이보다 살짝 어둡게 */
  flap: string;
  /** 하트 씰 자리의 점 */
  seal: string;
  /** 외곽선 */
  edge: string;
};

type LetterSpec = {
  left: number;
  width: number;
  duration: number;
  delay: number;
  sway: number;
  /** 종이가 떨어지듯 좌우로 갸웃대는 최대 기울기(도). 빙글 돌지 않는다. */
  tilt: number;
  baseTilt: number;
  opacity: number;
};

// index 기반 의사 난수 — 렌더마다 같은 배치를 유지한다
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function makeLetters(count: number, screenWidth: number): LetterSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    left: rand(i + 1) * screenWidth,
    width: 16 + rand(i + 2) * 12,
    duration: 10000 + rand(i + 3) * 8000,
    delay: rand(i + 4) * 10000,
    sway: 16 + rand(i + 5) * 36,
    tilt: 12 + rand(i + 6) * 14,
    baseTilt: (rand(i + 7) - 0.5) * 24,
    opacity: 0.4 + rand(i + 8) * 0.4,
  }));
}

function Letter({ spec, tones, height }: { spec: LetterSpec; tones: LetterTones; height: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      spec.delay,
      withRepeat(withTiming(1, { duration: spec.duration, easing: Easing.linear }), -1)
    );
    return () => cancelAnimation(t);
  }, [t, spec.delay, spec.duration]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.08, 0.85, 1], [0, spec.opacity, spec.opacity, 0]),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [-40, height + 40]) },
      { translateX: Math.sin(t.value * Math.PI * 2) * spec.sway },
      // 편지는 빙글 돌지 않고, 종이가 떨어지듯 좌우로 갸웃댄다.
      { rotate: `${spec.baseTilt + Math.sin(t.value * Math.PI * 3) * spec.tilt}deg` },
    ],
  }));

  const w = spec.width;
  const h = w / 1.4; // 브랜드 마크와 같은 가로형 봉투 비율

  return (
    <Animated.View style={[styles.letter, { left: spec.left }, style]}>
      <View
        style={{
          width: w,
          height: h,
          backgroundColor: tones.paper,
          borderColor: tones.edge,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* 위에서 내려오는 삼각 플랩 */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            borderLeftWidth: w / 2,
            borderRightWidth: w / 2,
            borderTopWidth: h * 0.55,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: tones.flap,
          }}
        />
        {/* 하트 씰 자리 — 이 크기에서는 점 하나로 충분하다 */}
        <View
          style={{
            position: 'absolute',
            top: h * 0.55 - w * 0.09,
            left: w / 2 - w * 0.09,
            width: w * 0.18,
            height: w * 0.18,
            borderRadius: w * 0.09,
            backgroundColor: tones.seal,
          }}
        />
      </View>
    </Animated.View>
  );
}

export function LetterField({ tones, count = 12 }: { tones: LetterTones; count?: number }) {
  const { width, height } = useWindowDimensions();
  const letters = useMemo(() => makeLetters(count, width), [count, width]);
  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {letters.map((spec, i) => (
        <Letter key={i} spec={spec} tones={tones} height={height} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  letter: { position: 'absolute', top: 0 },
});
