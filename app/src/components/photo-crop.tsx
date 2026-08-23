import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Image as RNImage, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Radius, type ThemeColors } from '@/constants/theme';

/**
 * 사진 자르기 — 프로필에 실제로 보이는 4:5 창을 그대로 보여주고, 그 안에서 고르게 한다.
 *
 * 프로필 사진은 어디서든 4:5로 잘려 보이는데, 등록할 때는 그걸 알 길이 없었다.
 * 얼굴이 창 밖으로 밀려난 채 소개되는 사진이 나온다 — 등록 순간에 창을 보여주는 게 답이다.
 *
 * 손가락으로 끌어 위치를, 두 손가락으로 배율을 정한다. 창 밖 영역은 어둡게 눌러
 * "이만큼은 잘린다"를 눈으로 말한다. 그대로 써도 된다 — 그때는 가운데 4:5로 잘린 모습이 된다.
 *
 * 크롭은 기기에서 한다(expo-image-manipulator) — 서버는 원본 비율을 그대로 저장하므로,
 * 여기서 자른 파일이 곧 업로드되는 파일이다. 새 네이티브 모듈 없이(OTA 가능) 동작한다.
 */
export const CROP_ASPECT = 4 / 5;

const MAX_ZOOM = 4;

export function PhotoCropModal({
  uri,
  /** 몇 번째/몇 장 — 여러 장을 이어서 자를 때 길잡이. 한 장이면 생략. */
  progress,
  /** 잘리는 창의 비율(가로/세로). 프로필은 4:5(기본), 모임 커버는 16:9. */
  aspect = CROP_ASPECT,
  /** 머리말 — 어디에 보이는 그대로인지 화면마다 말이 다르다. */
  title = '프로필에 보이는 그대로예요',
  onDone,
  onCancel,
  c,
}: {
  uri: string;
  progress?: { index: number; total: number };
  aspect?: number;
  title?: string;
  onDone: (croppedUri: string) => void;
  onCancel: () => void;
  c: ThemeColors;
}) {
  const { width: screenW } = useWindowDimensions();
  const frameW = Math.min(screenW - 48, 360);
  const frameH = frameW / aspect;

  const [img, setImg] = useState<{ w: number; h: number } | null>(null);
  const [applying, setApplying] = useState(false);

  // 끌기(tx, ty)와 배율(zoom). 기준 배율은 "창을 꽉 채우는 cover" — zoom 1이 곧 그대로 쓰기.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const zoom = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startZoom = useSharedValue(1);

  // 사진마다 key={uri}로 새로 마운트되므로 공유값은 초기값에서 시작한다 — 여기서는 크기만 읽는다.
  useEffect(() => {
    let active = true;
    RNImage.getSize(
      uri,
      (w, h) => active && setImg({ w, h }),
      () => active && onCancel(),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const cover = img ? Math.max(frameW / img.w, frameH / img.h) : 1;
  const baseW = img ? img.w * cover : frameW;
  const baseH = img ? img.h * cover : frameH;

  // 창이 늘 사진으로 덮여 있도록 이동 범위를 배율에 맞춰 죈다.
  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      const maxX = Math.max(0, (baseW * zoom.value - frameW) / 2);
      const maxY = Math.max(0, (baseH * zoom.value - frameH) / 2);
      tx.value = Math.min(maxX, Math.max(-maxX, startX.value + e.translationX));
      ty.value = Math.min(maxY, Math.max(-maxY, startY.value + e.translationY));
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      zoom.value = Math.min(MAX_ZOOM, Math.max(1, startZoom.value * e.scale));
      // 배율이 줄면 기존 이동이 창을 벗어날 수 있다 — 그 자리에서 다시 죈다.
      const maxX = Math.max(0, (baseW * zoom.value - frameW) / 2);
      const maxY = Math.max(0, (baseH * zoom.value - frameH) / 2);
      tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
      ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const imageStyle = useAnimatedStyle(() => ({
    width: baseW * zoom.value,
    height: baseH * zoom.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  /** 화면의 창을 원본 픽셀 좌표로 되돌려 자른다. */
  async function apply() {
    if (!img || applying) return;
    setApplying(true);
    try {
      const scale = cover * zoom.value; // 화면 1pt = 원본 1/scale px
      const cropW = frameW / scale;
      const cropH = frameH / scale;
      const originX = (img.w - cropW) / 2 - tx.value / scale;
      const originY = (img.h - cropH) / 2 - ty.value / scale;
      const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
      const context = ImageManipulator.manipulate(uri).crop({
        originX: Math.round(clamp(originX, img.w - cropW)),
        originY: Math.round(clamp(originY, img.h - cropH)),
        width: Math.floor(Math.min(cropW, img.w)),
        height: Math.floor(Math.min(cropH, img.h)),
      });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
      onDone(saved.uri);
    } catch {
      // 크롭에 실패해도 사진을 못 쓰게 두지는 않는다 — 원본 그대로(가운데 4:5로 보인다).
      onDone(uri);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      {/* Modal은 별도 네이티브 창이라 루트의 GestureHandlerRootView가 닿지 않는다(특히 Android) — 안에 하나 더 세운다. */}
      <GestureHandlerRootView style={styles.flex}>
      <View style={styles.backdrop}>
        <Text style={styles.title}>
          {title}
          {progress && progress.total > 1 ? `  ·  ${progress.index + 1}/${progress.total}` : ''}
        </Text>
        <Text style={styles.hint}>끌어서 위치를, 두 손가락으로 크기를 맞춰주세요</Text>

        <GestureDetector gesture={gesture}>
          <View style={[styles.frame, { width: frameW, height: frameH }]}>
            {img && <Animated.Image source={{ uri }} style={imageStyle} resizeMode="cover" />}
          </View>
        </GestureDetector>

        <View style={styles.actions}>
          <Pressable onPress={onCancel} disabled={applying} hitSlop={8} style={styles.skipBtn}>
            <Text style={styles.skipText}>이 사진 빼기</Text>
          </Pressable>
          <Pressable
            onPress={apply}
            disabled={applying || !img}
            style={[styles.applyBtn, { backgroundColor: c.primary, opacity: applying ? 0.6 : 1 }]}
          >
            <Text style={[styles.applyText, { color: c.primaryText }]}>{applying ? '자르는 중...' : '이대로 쓰기'}</Text>
          </Pressable>
        </View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // 자르기는 사진에 집중하는 순간 — 테마와 무관하게 어두운 막 위에서 한다.
  backdrop: { flex: 1, backgroundColor: 'rgba(12, 14, 16, 0.96)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hint: { color: 'rgba(255,255,255,0.65)', fontSize: 13.5, marginTop: 6, marginBottom: 18 },
  frame: {
    overflow: 'hidden',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24 },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  skipText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600' },
  applyBtn: { height: 48, paddingHorizontal: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 16, fontWeight: '700' },
});
