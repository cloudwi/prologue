import type { ImageSourcePropType } from 'react-native';

export const AVATARS: { id: number; label: string; source: ImageSourcePropType }[] = [
  { id: 1, label: '장발', source: require('@/assets/images/avatars/avatar-1.png') },
  { id: 2, label: '단발', source: require('@/assets/images/avatars/avatar-2.png') },
  { id: 3, label: '가르마', source: require('@/assets/images/avatars/avatar-3.png') },
  { id: 4, label: '덮은머리', source: require('@/assets/images/avatars/avatar-4.png') },
];

export function avatarSource(id?: number | null): ImageSourcePropType | null {
  return AVATARS.find((a) => a.id === id)?.source ?? null;
}
