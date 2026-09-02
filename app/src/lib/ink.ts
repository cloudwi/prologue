import { Platform } from 'react-native';

import { authedRequest } from './api';

/**
 * 잉크 — 편지·프로필 열람 같은 유료 행동의 재화.
 * 값은 서버(InkPrice)가 단일 소스이고, 여기 상수는 화면 문구를 위한 사본이다.
 * 지갑은 서버에서 첫 접근에 환영 잉크와 함께 열린다.
 */
/**
 * 충전 상품 — 스토어에 등록한 상품 id와 지급되는 잉크 양.
 * 서버(InkProduct)가 단일 소스이고, 여기 표는 화면이 목록을 그리기 위한 사본이다.
 * 실제 가격은 스토어에서 받아 온다(나라마다 다르므로 앱이 정할 수 없다).
 *
 * iOS만 id가 다른 이유: App Store의 제품 id는 개발자 팀 전체에서 유일해야 해서,
 * 구 앱(com.juyoung.prologue)이 점유한 ink_50 계열을 새 앱(day.prologue.app)이 쓸 수 없다.
 * 그래서 iOS는 언더스코어 없는 ink50 계열로 등록했다. Android(Play)는 앱 단위 스코프라 그대로.
 */
export const INK_PRODUCTS = [
  { productId: Platform.OS === 'ios' ? 'ink50' : 'ink_50', ink: 50, savingPercent: 0 },
  { productId: Platform.OS === 'ios' ? 'ink150' : 'ink_150', ink: 150, savingPercent: 9 },
  { productId: Platform.OS === 'ios' ? 'ink250' : 'ink_250', ink: 250, savingPercent: 20 },
] as const;

export const INK_PRICE = {
  /** 편지 한 통을 부치는 값. */
  MAIL: 50,
  /** 서로 하트를 주고받은 상대에게 부치는 값 — 30% 할인. 실제 값은 견적(GET /mails/quote)이 준다. */
  MAIL_MUTUAL: 35,
  /** 받은 편지에 답장하는 값 — 50% 할인. 상대가 이미 값을 치른 마음에 답하는 편지라 가장 가볍다. */
  MAIL_REPLY: 25,
  /** 사흘이 지나 닫힌 프로필을 다시 여는 값. */
  PROFILE_UNLOCK: 8,
  /**
   * 내가 답하지 않은 날의 상대 답을 여는 값 — 그날 문답 하루치.
   * 답변 보상(2)보다 무겁고 프로필 열기(8)보다 가볍다: 쓰면 고이고 안 쓰면 나간다.
   */
  ANSWER_UNLOCK: 5,
  /** 오늘의 질문에 답을 남기면 하루 한 번 고이는 잉크. */
  DAILY_ANSWER: 2,
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
    case 'ANSWER':
      return '오늘의 답변';
    case 'WEEKLY':
      return '주간 지급';
    case 'EVENT':
      return '이벤트 지급';
    case 'PURCHASE':
      return '잉크 충전';
    case 'PROFILE_UNLOCK':
      return '프로필 다시 보기';
    case 'ANSWER_UNLOCK':
      return '잠긴 답 열기';
    case 'MAIL_RECALL':
      return '편지 회수 환급';
    case 'REFERRAL':
      return '친구 초대';
    default:
      // 취향 카드 이정표는 사유에 장수가 붙는다(TASTE_10). 몇 장째였는지는 알릴 이유가 없어 뭉갠다.
      if (reason.startsWith('TASTE_')) return '취향 카드';
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

/**
 * 스토어 결제를 서버에 확인시키고 잉크를 받는다 (POST /ink/purchase).
 *
 * 지급의 근거는 스토어가 확인해 준 거래뿐이라, 앱은 증표만 전달한다.
 * 이미 처리된 거래를 다시 보내도 성공으로 답한다(alreadyProcessed=true) —
 * 실패로 답하면 앱이 거래를 소비하지 못해 영원히 재시도한다.
 */
export async function redeemPurchase(input: {
  platform: 'IOS' | 'ANDROID';
  productId: string;
  token: string;
}): Promise<{ granted: number; balance: number; alreadyProcessed: boolean }> {
  return authedRequest('POST', '/ink/purchase', input);
}
