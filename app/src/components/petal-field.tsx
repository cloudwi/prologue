import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
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

/** 화면 전체에 꽃잎이 흩날리는 배경 장식. 터치를 가로채지 않는다. */

type PetalSpec = {
  left: number;
  size: number;
  duration: number;
  delay: number;
  sway: number;
  spin: number;
  opacity: number;
  tone: string;
};

// index 기반 의사 난수 — 렌더마다 같은 배치를 유지한다
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function makePetals(count: number, width: number, tones: readonly string[]): PetalSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    left: rand(i + 1) * width,
    size: 9 + rand(i + 2) * 9,
    duration: 9000 + rand(i + 3) * 8000,
    delay: rand(i + 4) * 9000,
    sway: 18 + rand(i + 5) * 42,
    spin: (rand(i + 6) > 0.5 ? 1 : -1) * (240 + rand(i + 7) * 360),
    opacity: 0.35 + rand(i + 8) * 0.45,
    tone: tones[i % tones.length],
  }));
}

function Petal({ spec, height }: { spec: PetalSpec; height: number }) {
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
      { rotate: `${t.value * spec.spin}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          left: spec.left,
          width: spec.size,
          height: spec.size,
          backgroundColor: spec.tone,
          borderTopLeftRadius: spec.size,
          borderBottomRightRadius: spec.size,
          borderTopRightRadius: spec.size * 0.2,
          borderBottomLeftRadius: spec.size * 0.2,
        },
        styles.petal,
        style,
      ]}
    />
  );
}

export function PetalField({ tones, count = 14 }: { tones: readonly string[]; count?: number }) {
  const { width, height } = useWindowDimensions();
  const petals = useMemo(() => makePetals(count, width, tones), [count, width, tones]);
  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {petals.map((spec, i) => (
        <Petal key={i} spec={spec} height={height} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  petal: { position: 'absolute', top: 0 },
});
