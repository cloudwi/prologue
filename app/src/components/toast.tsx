import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 토스트 — 화면 아래에 잠깐 떠올랐다 사라지는 한 줄.
 *
 * "복사했어요" 같은 확인은 그 자리의 버튼을 바꾸는 대신 여기로 말한다.
 * 버튼이 제 모습을 바꾸면 옆 요소들이 밀리며 레이아웃이 흔들리고,
 * Alert는 확인 버튼을 눌러야 해서 이 정도 일에는 과하다.
 *
 * 전역 함수 + 호스트 한 개 구조: 어느 화면에서든 showToast() 한 줄로 띄우고,
 * 실제 렌더링은 루트에 하나 있는 <ToastHost/>가 맡는다 — 새 네이티브 모듈 없이(OTA 가능).
 */
const TOAST_MS = 1_800;

type Listener = (message: string) => void;
let listener: Listener | null = null;

/** 어디서든 부른다. 호스트가 아직 없으면 조용히 무시된다(부팅 직후 등). */
export function showToast(message: string) {
  listener?.(message);
}

export function ToastHost() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    listener = (m) => {
      setMessage(m);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), TOAST_MS);
    };
    return () => {
      listener = null;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <View pointerEvents="none" style={[styles.overlay, { bottom: insets.bottom + 84 }]}>
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(180)}
        style={[styles.toast, { backgroundColor: c.text }]}
      >
        <Text style={[styles.text, { color: c.background }]}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    maxWidth: '86%',
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 11,
    opacity: 0.94,
  },
  text: { fontSize: 13.5, fontWeight: '600' },
});
