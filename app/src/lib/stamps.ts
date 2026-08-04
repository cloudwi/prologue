import { authedRequest } from './api';

/**
 * 우표 — 편지 같은 유료 행동의 재화. 편지 한 통 = 우표 1장.
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
      return '대화 신청'; // 편지 도입 전의 내역 — 라벨은 남긴다
    case 'MAIL':
      return '편지 보내기';
    case 'EVENT':
      return '이벤트 지급';
    default:
      return '우표 변동';
  }
}

export type StampEventSubmission = {
  id: string;
  url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | (string & {});
  /** 승인 시 지급된 우표 수. 그 외엔 null. */
  grantedAmount: number | null;
  createdAt: string;
};

/** 내 이벤트 제출 이력, 최신순 (GET /stamps/events). */
export async function getStampEvents(): Promise<StampEventSubmission[]> {
  const res = await authedRequest<{ submissions: StampEventSubmission[] }>('GET', '/stamps/events');
  return res.submissions;
}

/** 블로그 후기 링크 제출 (POST /stamps/events). 갱신된 제출 이력을 돌려준다. */
export async function submitStampEvent(url: string): Promise<StampEventSubmission[]> {
  const res = await authedRequest<{ submissions: StampEventSubmission[] }>('POST', '/stamps/events', { url });
  return res.submissions;
}
