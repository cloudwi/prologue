import { authedRequest } from './api';

/**
 * 직장 인증 — 회사 이메일로 코드를 받아 확인한다.
 * 서버는 도메인만 저장한다(이메일 전체는 남지 않는다).
 */

export type JobStatus = { verified: boolean; domain: string | null };

/** 내 직장 인증 상태 (GET /members/me/job). */
export async function getJobStatus(): Promise<JobStatus> {
  return authedRequest('GET', '/members/me/job');
}

/** 회사 이메일로 인증코드 발송 (POST /members/me/job/request). */
export async function requestJobCode(email: string): Promise<void> {
  await authedRequest('POST', '/members/me/job/request', { email });
}

/** 코드 확인 → 인증 완료 (POST /members/me/job/verify). */
export async function verifyJobCode(email: string, code: string): Promise<JobStatus> {
  return authedRequest('POST', '/members/me/job/verify', { email, code });
}
