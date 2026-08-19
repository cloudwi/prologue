import { authedRequest } from './api';

/**
 * 친구 초대 — 내 코드를 건네고, 친구가 그 코드를 쓰면 둘 다 잉크를 받는다.
 * 보상 액수·상한은 서버가 내려준다(INK_PRICE에 복제하지 않는다 — 바뀌면 화면이 거짓말한다).
 */
export type Referral = {
  code: string;
  invitedCount: number;
  rewardInk: number;
  maxRewardedInvites: number;
  shareUrl: string;
  /** 내가 이미 누군가의 코드를 썼는지 — 썼으면 입력칸을 숨긴다. */
  redeemed: boolean;
};

export type RedeemResult = { inkGranted: number; balance: number };

/** 내 초대 현황 (GET /referral). 코드는 처음 부를 때 만들어진다. */
export async function getReferral(): Promise<Referral> {
  return authedRequest('GET', '/referral');
}

/** 친구의 초대 코드 쓰기 (POST /referral/redeem). 조건에 안 맞으면 서버가 이유를 message에 담아 거절한다. */
export async function redeemReferral(code: string): Promise<RedeemResult> {
  return authedRequest('POST', '/referral/redeem', { code });
}
