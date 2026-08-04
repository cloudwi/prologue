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
  /** 보낸 사람 프로필 상세로 들어갈 답변 id. null이면 진입 불가(답이 없는 옛 데이터). */
  peerAnswerId: string | null;
  /** 내가 이미 답장(편지)을 보냈는지 — true면 답장 버튼 대신 보낸 편지 확인. */
  replied: boolean;
  createdAt: string;
};

/** 받은 편지 목록, 최신순 (GET /mails/received). 연락처는 바로 보인다. */
export async function getReceivedMails(): Promise<ReceivedMail[]> {
  const res = await authedRequest<{ mails: ReceivedMail[] }>('GET', '/mails/received');
  return res.mails;
}

export type SentMail = {
  mailId: string;
  recipientNickname: string | null;
  content: string;
  phone: string | null;
  kakaoId: string | null;
  createdAt: string;
};

/** 내가 이 상대(답변 주인)에게 보낸 편지 — 없으면 null (GET /mails/sent-to/{peerAnswerId}). */
export async function getSentMailTo(peerAnswerId: string): Promise<SentMail | null> {
  const res = await authedRequest<{ mail: SentMail | null }>('GET', `/mails/sent-to/${peerAnswerId}`);
  return res.mail;
}
