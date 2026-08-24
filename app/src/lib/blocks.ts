import { authedRequest } from './api';

/**
 * 지인 차단 — 아는 사람이 "오늘의 상대"로 오가지 않게 한다.
 * 전화번호는 서버에 해시로만 저장된다(원문은 남지 않는다). 차단은 양방향이고,
 * 상대는 차단 사실을 알 수 없다. 변경 요청은 갱신된 전체 상태를 돌려준다.
 */

export type PhoneBlock = { phoneHash: string; phoneMasked: string };

export type Blocks = {
  /** 같은 회사(직장 인증 도메인) 서로 숨기기 스위치. */
  sameCompany: boolean;
  /** 내가 인증한 도메인 — 없으면 같은 회사 차단을 켤 수 없다. */
  jobDomain: string | null;
  phones: PhoneBlock[];
};

/** 내 차단 상태 (GET /members/me/blocks). */
export async function getBlocks(): Promise<Blocks> {
  return authedRequest('GET', '/members/me/blocks');
}

/** 전화번호 차단 추가 (POST /members/me/blocks/phones). */
export async function addPhoneBlock(phone: string): Promise<Blocks> {
  return authedRequest('POST', '/members/me/blocks/phones', { phone });
}

/** 전화번호 차단 해제 (DELETE /members/me/blocks/phones/{hash}). */
export async function removePhoneBlock(phoneHash: string): Promise<Blocks> {
  return authedRequest('DELETE', `/members/me/blocks/phones/${phoneHash}`);
}

/** 같은 회사 차단 켜기/끄기 (PUT /members/me/blocks/same-company). */
export async function setSameCompanyBlock(enabled: boolean): Promise<Blocks> {
  return authedRequest('PUT', '/members/me/blocks/same-company', { enabled });
}
