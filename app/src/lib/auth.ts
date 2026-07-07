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

/** 백엔드 인증 응답을 저장소에 반영. 토큰을 SecureStore에 보관한다. */
async function persist(result: LoginResult): Promise<LoginResult> {
  await saveTokens(result.accessToken, result.refreshToken);
  return result;
}

/**
 * 이메일 가입. (POST /auth/signup)
 * 성공 시 신규 계정이 생성되고 토큰이 발급된다(isNewUser=true).
 * 이미 가입된 이메일이면 ApiError(status 409, code EMAIL_ALREADY_REGISTERED).
 */
export async function signup(email: string, password: string): Promise<LoginResult> {
  const result = await apiPost<LoginResult>('/auth/signup', { email, password });
  return persist(result);
}

/**
 * 이메일 로그인. (POST /auth/login)
 * 자격 불일치면 ApiError(status 401, code INVALID_CREDENTIALS).
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await apiPost<LoginResult>('/auth/login', { email, password });
  return persist(result);
}
