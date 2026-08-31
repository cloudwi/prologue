/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * 프롤로그 디자인 시스템 — "하루 한 문답, 편지 같은 무드".
 *
 * 바탕은 차갑고 담백한 중성 회색, 온기는 테라코타 포인트 하나로만 낸다.
 * (예전에는 배경까지 크림이라 화면 전체가 따뜻해 포인트 컬러가 묻혔다)
 * 면은 세 단계뿐 — 바탕 / 카드 / 눌린 상태. 색을 늘리는 대신 여백과 라운드로 위계를 만든다.
 *
 * 값을 바꿀 때는 design/README.md의 팔레트 표와 web/src/styles/global.css를 함께 고쳐야 한다.
 */
export const Colors = {
  light: {
    text: '#1B2126', // 차가운 잉크
    background: '#F6F8FA', // 페이퍼 (바탕)
    backgroundElement: '#FFFFFF', // 카드/표면 — 흰 면이라 경계가 또렷하다
    backgroundSelected: '#EDF1F5',
    textSecondary: '#69747E',
    primary: '#D9694C', // 테라코타 (CTA·하트) — 유일한 온기
    /** 작은 글자에 쓰는 진한 테라코타. primary는 흰 배경에서 4.5:1을 못 넘어 본문 텍스트로는 쓰지 않는다. */
    primaryStrong: '#C25539',
    primaryText: '#FFFFFF',
    border: '#E3E8EE',
  },
  dark: {
    text: '#EAEFF4',
    background: '#101418', // 깊은 쿨 다크
    backgroundElement: '#181D22',
    backgroundSelected: '#222932',
    textSecondary: '#96A1AC',
    primary: '#E07A5C',
    primaryStrong: '#E07A5C', // 어두운 면 위에서는 primary가 이미 5.7:1이라 따로 진하게 하지 않는다
    primaryText: '#101418',
    border: '#28303A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** 한 테마(light 또는 dark)의 색상 맵. 리터럴이 아닌 string 값이라 light/dark 모두 대입 가능. */
export type ThemeColors = Record<ThemeColor, string>;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /**
     * 2026-08-03 결정: 세리프 조판(New York)을 접고 기본 글씨체로 통일 — design/README.md '글씨체'.
     * 참조하는 화면이 많아 키는 남기고 값만 기본체로 둔다. 세리프로 되돌리려면 'ui-serif'.
     */
    serif: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'normal', // 2026-08-03: 기본 글씨체 통일 (위 ios.serif 주석 참고)
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-display)', // 2026-08-03: 기본 글씨체 통일 (위 ios.serif 주석 참고)
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * 타이포 스케일 — 화면마다 글자 크기를 새로 정하지 않기 위한 일곱 단계.
 *
 * 예전에는 12.5·13·13.5·14·14.5·15·15.5·16·17·17.5·18·19가 한 화면에 섞여 있었다.
 * 반 픽셀씩 다른 크기는 "다른 글자"가 아니라 "어긋난 글자"로 읽혀, 카드와 카드가
 * 서로 다른 앱에서 온 것처럼 보이게 한다. 굵기도 같은 이유로 셋만 쓴다 —
 * 700은 화면에 하나(display)뿐이고, 강조는 600, 나머지는 기본 굵기다.
 * (800은 쓰지 않는다. 굵기 차가 크면 화면이 소리를 지른다.)
 *
 * 쓰는 법: `title: { ...Type.title }`처럼 펼쳐 쓰고, 색은 그 자리에서 얹는다.
 */
export const Type = {
  /** 화면 제목·오늘의 질문 — 한 화면에 하나. */
  display: { fontSize: 26, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4 },
  /** 카드 제목·시트 제목. */
  title: { fontSize: 18, lineHeight: 25, fontWeight: '600', letterSpacing: -0.2 },
  /** 문단으로 읽는 글 — 답변·후기처럼 글이 주인공인 자리. */
  read: { fontSize: 17, lineHeight: 27 },
  /** 본문·입력칸. */
  body: { fontSize: 15, lineHeight: 22 },
  /** 버튼 글자. */
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  /** 링크·라벨. */
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  /** 보조 정보·눈썹·칩. */
  caption: { fontSize: 13, lineHeight: 18 },
} as const;

/**
 * 라운드 스케일. 각진 사각형이 투박해 보여 네 단계로 통일한다.
 * (아직 예전 숫자를 직접 쓰는 화면이 남아 있다 — 손대는 파일부터 이 토큰으로 옮긴다)
 */
export const Radius = {
  /** 칩·작은 썸네일 */
  sm: 12,
  /** 입력·버튼 */
  md: 18,
  /** 카드·시트 */
  lg: 24,
  /** 알약 버튼·배지 */
  pill: 999,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * 하단 탭바에서 아이콘·라벨이 차지하는 높이(제스처 바 몫 제외).
 * 탭바가 실제로 쓰는 값이자((tabs)/_layout.tsx), 화면들이 스크롤 바닥 여백을 잡는 기준이다 —
 * 두 값이 갈라지면 콘텐츠가 탭바에 가리거나 헛돈다.
 */
export const BottomTabInset = 60;
export const MaxContentWidth = 800;
