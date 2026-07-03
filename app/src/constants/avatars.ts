import type { ImageSourcePropType } from 'react-native';

export const AVATARS: { id: number; label: string; source: ImageSourcePropType }[] = [
  { id: 1, label: '깐머리', source: require('@/assets/images/avatars/avatar-1.png') },
  { id: 2, label: '짧은머리', source: require('@/assets/images/avatars/avatar-2.png') },
  { id: 3, label: '덮은머리', source: require('@/assets/images/avatars/avatar-3.png') },
  { id: 4, label: '단발', source: require('@/assets/images/avatars/avatar-4.png') },
  { id: 5, label: '파마', source: require('@/assets/images/avatars/avatar-5.png') },
  { id: 6, label: '장발', source: require('@/assets/images/avatars/avatar-6.png') },
  { id: 7, label: '묶은머리', source: require('@/assets/images/avatars/avatar-7.png') },
  { id: 8, label: '웨이브', source: require('@/assets/images/avatars/avatar-8.png') },
];

export function avatarSource(id?: number | null): ImageSourcePropType | null {
  return AVATARS.find((a) => a.id === id)?.source ?? null;
}
