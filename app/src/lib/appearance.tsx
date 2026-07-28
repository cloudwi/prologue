import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform, useColorScheme as useSystemColorScheme } from 'react-native';

/**
 * 화면 테마(라이트/다크) 취향.
 *
 * 기본은 시스템을 따라가되, 앱 안에서 직접 고를 수도 있게 한다.
 * 화면들은 OS의 useColorScheme() 대신 여기서 결정된 scheme을 봐야 선택이 실제로 반영된다.
 */
export type AppearanceMode = 'system' | 'light' | 'dark';

export const APPEARANCE_MODES: AppearanceMode[] = ['system', 'light', 'dark'];

export const APPEARANCE_LABEL: Record<AppearanceMode, string> = {
  system: '시스템 설정',
  light: '라이트',
  dark: '다크',
};

export const APPEARANCE_DESC: Record<AppearanceMode, string> = {
  system: '기기 설정이 바뀌면 함께 바뀌어요',
  light: '항상 밝은 화면으로 보여요',
  dark: '항상 어두운 화면으로 보여요',
};

const KEY = 'prologue.appearance';
const isWeb = Platform.OS === 'web';

async function readMode(): Promise<AppearanceMode> {
  try {
    const raw = isWeb ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return APPEARANCE_MODES.includes(raw as AppearanceMode) ? (raw as AppearanceMode) : 'system';
  } catch {
    return 'system'; // 저장소를 못 읽어도 앱은 떠야 한다
  }
}

async function writeMode(mode: AppearanceMode): Promise<void> {
  try {
    if (isWeb) {
      localStorage.setItem(KEY, mode);
      return;
    }
    await SecureStore.setItemAsync(KEY, mode);
  } catch {
    // 저장에 실패해도 이번 실행에는 이미 반영돼 있다
  }
}

type Appearance = {
  /** 사용자가 고른 값 */
  mode: AppearanceMode;
  /** 실제로 그릴 때 쓰는 값 — mode가 system이면 기기 설정을 따른다 */
  scheme: 'light' | 'dark';
  setMode: (mode: AppearanceMode) => void;
};

const AppearanceContext = createContext<Appearance>({
  mode: 'system',
  scheme: 'light',
  setMode: () => {},
});

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void readMode().then((saved) => {
      if (!active) return;
      setModeState(saved);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: AppearanceMode) => {
    setModeState(next);
    void writeMode(next);
  }, []);

  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo<Appearance>(() => ({ mode, scheme, setMode }), [mode, scheme, setMode]);

  // 저장된 취향을 읽기 전에 그리면 라이트로 한 번 번쩍인 뒤 다크로 바뀐다.
  if (!hydrated) return null;

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): Appearance {
  return useContext(AppearanceContext);
}
