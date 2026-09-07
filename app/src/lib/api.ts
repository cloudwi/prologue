import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './auth-storage';

/**
 * 백엔드 API 클라이언트.
 * 기본 URL은 EXPO_PUBLIC_API_URL 환경변수로 덮어쓸 수 있다(로컬 개발 등).
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.prologue.day';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = 'ApiError';
  }
}

/**
 * 재발급까지 실패한 인증 실패(=세션 만료) 판정.
 * 이 시점엔 authedFetch가 죽은 토큰을 이미 지웠다 — 화면은 에러 알림 대신 로그인으로 보내야 한다.
 */
export function isSessionExpired(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 401 || e.status === 403);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code, data?.message);
  }
  return data as T;
}

/** 인증이 필요 없는 GET. 로그인 전에 부르는 것들(부팅 설정 등)이 쓴다. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code, data?.message);
  }
  return data as T;
}

// ── 토큰 자동 재발급 ─────────────────────────────────────────────
// 액세스 토큰은 30분짜리라 쓰다 보면 반드시 만료된다. 만료(401/403)를 만나면
// refresh token으로 한 번 재발급하고 원래 요청을 다시 보낸다.

/** 진행 중인 재발급. 여러 요청이 동시에 만료를 만나도 재발급은 한 번만 나간다. */
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      // 인증 거절만 세션 만료다. 서버 장애·요청 제한은 토큰을 지울 근거가 아니다.
      if (res.status === 401 || res.status === 403) return false;
      if (!res.ok) {
        throw new ApiError(res.status, undefined, '로그인을 확인하지 못했어요. 잠시 후 다시 시도해주세요.');
      }
      const data = await res.json();
      if (typeof data?.accessToken !== 'string' || !data.accessToken ||
          typeof data?.refreshToken !== 'string' || !data.refreshToken) {
        throw new Error('로그인을 확인하지 못했어요. 잠시 후 다시 시도해주세요.');
      }
      await saveTokens(data.accessToken, data.refreshToken);
      return true;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * 인증 헤더를 붙여 보내는 fetch. 만료(401/403)를 만나면 재발급 후 한 번 재시도한다.
 * 재발급이 인증 거절되면 저장된 토큰을 지운다. 통신 실패·서버 장애는 그대로 던져
 * 화면에서 재시도하게 한다 — 연결이 끊겼다는 이유로 다시 가입하러 보내지 않는다.
 */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = async () => {
    const token = await getAccessToken();
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  let res = await send();
  if (res.status === 401 || res.status === 403) {
    if (await refreshTokens()) {
      res = await send();
    }
    if (res.status === 401 || res.status === 403) {
      await clearTokens();
    }
  }
  return res;
}

/** JSON 본문을 주고받는 인증 요청. */
export async function authedRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await authedFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code, data?.message);
  }
  return data as T;
}
