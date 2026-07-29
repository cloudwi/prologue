import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

/**
 * 사진을 가로로 넘겨 보는 페이저.
 * 몇 장째인지는 아래쪽 흰 점으로만 표시한다 — 사진 위에 얹는 유일한 오버레이.
 */
export function PhotoPager({
  photos,
  aspectRatio = 4 / 5,
  backgroundColor,
}: {
  photos: string[];
  aspectRatio?: number;
  backgroundColor?: string;
}) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ backgroundColor }}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {photos.map((url) => (
            <Image key={url} source={{ uri: url }} style={{ width, aspectRatio }} contentFit="cover" transition={150} />
          ))}
        </ScrollView>
      )}
      {photos.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((url, i) => (
            <View key={url} style={[styles.dot, { opacity: i === page ? 1 : 0.45 }]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  // 사진 위라 테마와 무관하게 흰 점 — 은은한 그림자로 밝은 사진에서도 보인다.
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});
