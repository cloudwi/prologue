import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { avatarSource } from '@/constants/avatars';
import type { ThemeColors } from '@/constants/theme';

/**
 * 아바타. avatarId가 있으면 아바타 이미지, 없으면 닉네임 첫 글자.
 *
 * [height]와 [radius]를 주면 사진 자리와 같은 모양으로 세울 수 있다 —
 * 한 줄에 사진과 아바타가 섞여 나올 때 모양이 다르면 목록이 들쭉날쭉해진다.
 */
export function Avatar({
  avatarId,
  nickname,
  size,
  height,
  radius,
  c,
}: {
  avatarId?: number | null;
  nickname?: string;
  size: number;
  /** 세로 크기. 없으면 정사각(원). */
  height?: number;
  /** 모서리 반경. 없으면 원. */
  radius?: number;
  c: ThemeColors;
}) {
  const h = height ?? size;
  const r = radius ?? Math.min(size, h) / 2;
  const src = avatarSource(avatarId);
  if (src) {
    return <Image source={src} style={{ width: size, height: h, borderRadius: r }} contentFit="cover" />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: h, borderRadius: r, backgroundColor: c.primary }]}>
      <Text style={{ color: c.primaryText, fontSize: size * 0.42, fontWeight: '700' }}>{nickname?.slice(0, 1) ?? '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
