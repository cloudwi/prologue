import { getAccessToken } from './auth-storage';

/**
 * 백엔드 API 클라이언트.
 * 기본 URL은 EXPO_PUBLIC_API_URL 환경변수로 덮어쓸 수 있다(로컬 개발 등).
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://prologue-backend.onrender.com';

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

/** 저장된 access token을 Authorization 헤더로 붙여 보내는 인증 요청. */
export async function authedRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code, data?.message);
  }
  return data as T;
}
