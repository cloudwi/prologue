/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * 프롤로그 디자인 시스템 — "하루 한 문답, 편지 같은 무드".
 * 따뜻한 크림 배경 + 깊은 잉크 텍스트 + 절제된 테라코타 포인트.
 */
export const Colors = {
  light: {
    text: '#2B2723', // 따뜻한 잉크
    background: '#FAF6F0', // 크림
    backgroundElement: '#F2EADF', // 카드/표면
    backgroundSelected: '#E8DCCB',
    textSecondary: '#8A8178',
    primary: '#D9694C', // 테라코타 (CTA·하트)
    primaryText: '#FFFFFF',
    border: '#E7DDCD',
  },
  dark: {
    text: '#F4ECE0',
    background: '#1A1613', // 깊은 웜 다크
    backgroundElement: '#262019',
    backgroundSelected: '#322A21',
    textSecondary: '#A89C8C',
    primary: '#E07A5C',
    primaryText: '#1A1613',
    border: '#3A3128',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** 한 테마(light 또는 dark)의 색상 맵. 리터럴이 아닌 string 값이라 light/dark 모두 대입 가능. */
export type ThemeColors = Record<ThemeColor, string>;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
