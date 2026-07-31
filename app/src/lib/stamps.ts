import { authedRequest } from './api';

/**
 * 우표 — 대화 신청 같은 유료 행동의 재화. 대화 신청 1건 = 우표 1장.
 * 지갑은 서버에서 첫 접근에 환영 3장과 함께 열린다. 충전(IAP)은 출시 직전에 붙는다.
 */

/** 내 우표 잔액 (GET /stamps). */
export async function getStampBalance(): Promise<number> {
  const res = await authedRequest<{ balance: number }>('GET', '/stamps');
  return res.balance;
}
