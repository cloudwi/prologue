import { authedRequest } from './api';

/**
 * 잉크 — 편지·프로필 열람 같은 유료 행동의 재화.
 * 값은 서버(InkPrice)가 단일 소스이고, 여기 상수는 화면 문구를 위한 사본이다.
 * 지갑은 서버에서 첫 접근에 환영 잉크와 함께 열린다.
 */
export const INK_PRICE = {
  /** 편지 한 통을 부치는 값. */
  MAIL: 50,
  /** 사흘이 지나 닫힌 프로필을 다시 여는 값. */
  PROFILE_UNLOCK: 8,
  /** 읽히지 않은 편지를 회수했을 때 돌아오는 잉크 — 부친 값의 절반. */
  MAIL_RECALL_REFUND: 25,
} as const;

/** 내 잉크 잔액 (GET /ink). */
export async function getInkBalance(): Promise<number> {
  const res = await authedRequest<{ balance: number }>('GET', '/ink');
  return res.balance;
}

export type InkHistoryItem = {
  amount: number;
  reason: 'WELCOME' | 'CONVERSATION_REQUEST' | (string & {});
  createdAt: string;
};

export type InkWallet = {
  balance: number;
  /** 최근 증감 내역, 최신순(최대 50건). */
  history: InkHistoryItem[];
};

/** 지갑 화면 — 잔액 + 사용 내역 (GET /ink/wallet). */
export async function getInkWallet(): Promise<InkWallet> {
  return authedRequest('GET', '/ink/wallet');
}

/** 내역 사유 → 사용자 문구. 모르는 사유는 그대로 보여주기보다 중립 문구로. */
export function inkReasonLabel(reason: string): string {
  switch (reason) {
    case 'WELCOME':
      return '환영 잉크';
    case 'CONVERSATION_REQUEST':
      return '대화 신청'; // 편지 도입 전의 내역 — 라벨은 남긴다
    case 'MAIL':
      return '편지 보내기';
    case 'WEEKLY':
      return '주간 지급';
    case 'EVENT':
      return '이벤트 지급';
    case 'PURCHASE':
      return '잉크 충전';
    case 'PROFILE_UNLOCK':
      return '프로필 다시 보기';
    case 'MAIL_RECALL':
      return '편지 회수 환급';
    default:
      return '잉크 변동';
  }
}

export type InkEventSubmission = {
  id: string;
  url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | (string & {});
  /** 승인 시 지급된 잉크 양. 그 외엔 null. */
  grantedAmount: number | null;
  createdAt: string;
};

/** 내 이벤트 제출 이력, 최신순 (GET /ink/events). */
export async function getInkEvents(): Promise<InkEventSubmission[]> {
  const res = await authedRequest<{ submissions: InkEventSubmission[] }>('GET', '/ink/events');
  return res.submissions;
}

/** 블로그 후기 링크 제출 (POST /ink/events). 갱신된 제출 이력을 돌려준다. */
export async function submitInkEvent(url: string): Promise<InkEventSubmission[]> {
  const res = await authedRequest<{ submissions: InkEventSubmission[] }>('POST', '/ink/events', { url });
  return res.submissions;
}
