import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 전체화면 이미지 뷰어 — 핀치로 확대, 끌어서 이동, 두 번 탭으로 확대/원복.
 * 확대 중에는 페이지 스와이프를 잠근다(제스처가 싸우지 않게).
 * 크롭 모달과 같은 제스처 스택(gesture-handler + reanimated)이라 새 의존성이 없다.
 */

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;

function ZoomableImage({
  uri,
  width,
  height,
  onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startZoom = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  function clampOffsets() {
    'worklet';
    const maxX = (width * (zoom.value - 1)) / 2;
    const maxY = (height * (zoom.value - 1)) / 2;
    tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
    ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
  }

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      zoom.value = Math.min(MAX_ZOOM, Math.max(1, startZoom.value * e.scale));
      clampOffsets();
    })
    .onEnd(() => {
      if (zoom.value < 1.05) {
        zoom.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
      }
      runOnJS(onZoomChange)(zoom.value > 1.05);
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      if (zoom.value <= 1.05) return; // 원본 배율에서는 페이저 스와이프에 양보한다
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
      clampOffsets();
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zoomed = zoom.value > 1.05;
      zoom.value = withTiming(zoomed ? 1 : DOUBLE_TAP_ZOOM);
      if (zoomed) {
        tx.value = withTiming(0);
        ty.value = withTiming(0);
      }
      runOnJS(onZoomChange)(!zoomed);
    });

  const gesture = Gesture.Simultaneous(doubleTap, Gesture.Simultaneous(pinch, pan));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, styles.center, style]}>
        <Image source={{ uri }} style={{ width, height }} contentFit="contain" transition={120} />
      </Animated.View>
    </GestureDetector>
  );
}

export function ImageViewerModal({
  photos,
  initialIndex,
  visible,
  onClose,
}: {
  photos: string[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // 열릴 때마다 탭한 사진에서 시작한다 — setState는 다음 틱으로 미뤄 연쇄 렌더를 피한다.
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      setPage(initialIndex);
      setZoomed(false);
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [visible, initialIndex, width]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* Modal은 별도 네이티브 창이라 루트의 GestureHandlerRootView가 닿지 않는다 — 안에 하나 세운다. */}
      <GestureHandlerRootView style={styles.root}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {photos.map((url) => (
            <ZoomableImage key={url} uri={url} width={width} height={height} onZoomChange={setZoomed} />
          ))}
        </ScrollView>

        <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { top: insets.top + 10 }]}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        {photos.length > 1 && (
          <View style={[styles.counter, { top: insets.top + 14 }]} pointerEvents="none">
            <Text style={styles.counterText}>
              {page + 1} / {photos.length}
            </Text>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    right: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  counter: { position: 'absolute', alignSelf: 'center' },
  counterText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
