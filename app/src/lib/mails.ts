import { authedRequest } from './api';

/**
 * 편지 — 인앱 채팅 대신 연락처를 건네는 한 통.
 * 300자 메시지에 전화번호/카카오톡 ID 중 하나 이상을 실어 보내고, 그 뒤는 앱 밖에서 이어진다.
 */

export type SendMailResult = {
  mailId: string;
};

/** 편지 보내기 (POST /mails). 한 통에 우표 1장. 전화번호는 서버가 내 프로필에서 읽는다. */
export async function sendMail(
  peerAnswerId: string,
  content: string,
  includePhone: boolean,
  kakaoId: string | null,
): Promise<SendMailResult> {
  return authedRequest<SendMailResult>('POST', '/mails', { peerAnswerId, content, includePhone, kakaoId });
}

/** 받은 편지에 답장 (POST /mails/{mailId}/reply). 답장도 한 통의 편지 — 우표 1장. */
export async function sendMailReply(
  mailId: string,
  content: string,
  includePhone: boolean,
  kakaoId: string | null,
): Promise<SendMailResult> {
  return authedRequest<SendMailResult>('POST', `/mails/${mailId}/reply`, { content, includePhone, kakaoId });
}

export type ReceivedMail = {
  mailId: string;
  nickname: string;
  age: number;
  region: string;
  avatarId: number | null;
  photoUrl: string | null;
  content: string;
  phone: string | null;
  kakaoId: string | null;
  createdAt: string;
};

/** 받은 편지 목록, 최신순 (GET /mails/received). 연락처는 바로 보인다. */
export async function getReceivedMails(): Promise<ReceivedMail[]> {
  const res = await authedRequest<{ mails: ReceivedMail[] }>('GET', '/mails/received');
  return res.mails;
}
