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
