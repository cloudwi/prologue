import { apiPost } from './api';
import { saveTokens } from './auth-storage';

// 인증(가입/로그인) 결과(토큰 묶음).
export type LoginResult = {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
};

/**
 * 인증코드 발송 요청. (POST /auth/email/request-code)
 * 성공 시 이메일로 6자리 코드가 발송되고, 코드 유효시간(초)을 돌려준다.
 * 재발송 간격 위반이면 ApiError(status 429, code TOO_MANY_REQUESTS).
 */
export async function requestCode(email: string): Promise<{ expiresInSeconds: number }> {
  return apiPost<{ expiresInSeconds: number }>('/auth/email/request-code', { email });
}

/**
 * 인증코드 검증(=로그인/가입). (POST /auth/email/verify)
 * 성공 시 토큰을 SecureStore에 저장하고 결과를 돌려준다.
 * 코드 불일치/만료면 ApiError(status 401, code INVALID_CODE).
 */
export async function verifyCode(email: string, code: string): Promise<LoginResult> {
  const result = await apiPost<LoginResult>('/auth/email/verify', { email, code });
  await saveTokens(result.accessToken, result.refreshToken);
  return result;
}
