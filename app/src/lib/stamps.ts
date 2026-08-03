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

export type StampHistoryItem = {
  amount: number;
  reason: 'WELCOME' | 'CONVERSATION_REQUEST' | (string & {});
  createdAt: string;
};

export type StampWallet = {
  balance: number;
  /** 최근 증감 내역, 최신순(최대 50건). */
  history: StampHistoryItem[];
};

/** 지갑 화면 — 잔액 + 사용 내역 (GET /stamps/wallet). */
export async function getStampWallet(): Promise<StampWallet> {
  return authedRequest('GET', '/stamps/wallet');
}

/** 내역 사유 → 사용자 문구. 모르는 사유는 그대로 보여주기보다 중립 문구로. */
export function stampReasonLabel(reason: string): string {
  switch (reason) {
    case 'WELCOME':
      return '환영 우표';
    case 'CONVERSATION_REQUEST':
      return '대화 신청';
    default:
      return '우표 변동';
  }
}
