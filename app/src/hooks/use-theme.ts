import { Colors } from '@/constants/theme';
import { useAppearance } from '@/lib/appearance';

/**
 * 지금 화면에 쓸 색 팔레트.
 * OS 설정이 아니라 MY > 화면 테마에서 고른 값을 따른다(기본값은 시스템 설정).
 */
export function useTheme() {
  return Colors[useAppearance().scheme];
}
