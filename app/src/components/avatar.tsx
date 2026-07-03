import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { avatarSource } from '@/constants/avatars';
import type { ThemeColors } from '@/constants/theme';

/** 아바타. avatarId가 있으면 아바타 이미지, 없으면 닉네임 첫 글자 원. */
export function Avatar({
  avatarId,
  nickname,
  size,
  c,
}: {
  avatarId?: number | null;
  nickname?: string;
  size: number;
  c: ThemeColors;
}) {
  const src = avatarSource(avatarId);
  if (src) {
    return <Image source={src} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.primary }]}>
      <Text style={{ color: c.primaryText, fontSize: size * 0.42, fontWeight: '700' }}>{nickname?.slice(0, 1) ?? '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
