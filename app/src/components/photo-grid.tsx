import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';

/** 프로필 사진 그리드 (최대 6장). 첫 번째 사진이 대표. */

export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 6;

/** 앨범에서 사진 여러 장 선택 → 로컬 URI 목록. 취소하면 빈 배열. */
export async function pickPhotos(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.8,
    // 아이폰 기본 촬영 형식(HEIC)은 브라우저·안드로이드에서 열리지 않는다.
    // 호환 표현을 요청하면 사진 앱이 JPEG로 변환해 넘겨준다.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri);
}

export function PhotoGrid({
  photos,
  onAdd,
  onRemove,
  busy = false,
  c,
}: {
  /** 로컬 URI(온보딩) 또는 공개 URL(MY) 목록. */
  photos: string[];
  onAdd: () => void;
  onRemove: (photo: string) => void;
  busy?: boolean;
  c: ThemeColors;
}) {
  return (
    <View style={styles.grid}>
      {photos.map((photo, i) => (
        <View key={photo} style={[styles.tile, { borderColor: c.border, backgroundColor: c.backgroundElement }]}>
          <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
          {i === 0 && (
            <View style={[styles.primaryBadge, { backgroundColor: c.primary }]}>
              <Text style={[styles.primaryBadgeText, { color: c.primaryText }]}>대표</Text>
            </View>
          )}
          <Pressable
            onPress={() => onRemove(photo)}
            disabled={busy}
            hitSlop={8}
            style={[styles.removeBtn, { backgroundColor: c.text }]}
          >
            <Text style={[styles.removeBtnText, { color: c.background }]}>✕</Text>
          </Pressable>
        </View>
      ))}
      {photos.length < MAX_PHOTOS && (
        <Pressable
          onPress={onAdd}
          disabled={busy}
          style={[styles.tile, styles.addTile, { borderColor: c.border, backgroundColor: c.backgroundElement, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[styles.addPlus, { color: c.primary }]}>+</Text>
          <Text style={[styles.addLabel, { color: c.textSecondary }]}>
            {photos.length}/{MAX_PHOTOS}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryBadgeText: { fontSize: 10, fontWeight: '700' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  removeBtnText: { fontSize: 11, fontWeight: '700', lineHeight: 13 },
  addTile: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  addPlus: { fontSize: 30, fontWeight: '300', lineHeight: 34 },
  addLabel: { fontSize: 12, marginTop: 2 },
});
