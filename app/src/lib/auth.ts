import { apiPost } from './api';
import { saveTokens } from './auth-storage';

export type LoginResult = {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
};

/** 소셜 토큰을 백엔드로 보내 우리 JWT로 교환하고 저장. */
async function exchangeWithBackend(provider: string, token: string): Promise<LoginResult> {
  const result = await apiPost<LoginResult>(`/auth/login/${provider}`, { token });
  await saveTokens(result.accessToken, result.refreshToken);
  return result;
}

/**
 * 카카오 로그인.
 * 네이티브 SDK가 필요 → Expo Go 불가, dev build에서만 동작.
 * (require로 지연 로딩하여 화면 자체는 Expo Go에서도 뜨게 함)
 */
export async function loginWithKakao(): Promise<LoginResult> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const KakaoLogin = require('@react-native-seoul/kakao-login');
  const { accessToken } = await KakaoLogin.login();
  return exchangeWithBackend('kakao', accessToken);
}

// TODO: 네이버/구글/애플 — 각 SDK 연동 후 exchangeWithBackend 호출
export async function loginWithNaver(): Promise<LoginResult> {
  throw new Error('네이버 로그인 준비 중입니다');
}
export async function loginWithGoogle(): Promise<LoginResult> {
  throw new Error('구글 로그인 준비 중입니다');
}
export async function loginWithApple(): Promise<LoginResult> {
  throw new Error('애플 로그인 준비 중입니다');
}
