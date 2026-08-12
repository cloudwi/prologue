import { authedRequest } from './api';

/**
 * 편지 — 인앱 채팅 대신 연락처를 건네는 한 통.
 * 300자 메시지에 전화번호/카카오톡 ID 중 하나 이상을 실어 보내고, 그 뒤는 앱 밖에서 이어진다.
 */

export type SendMailResult = {
  mailId: string;
};

/** 편지 보내기 (POST /mails). 한 통에 잉크 1장. 전화번호는 서버가 내 프로필에서 읽는다. */
export async function sendMail(
  peerAnswerId: string,
  content: string,
  includePhone: boolean,
  kakaoId: string | null,
): Promise<SendMailResult> {
  return authedRequest<SendMailResult>('POST', '/mails', { peerAnswerId, content, includePhone, kakaoId });
}

/** 받은 편지에 답장 (POST /mails/{mailId}/reply). 답장도 한 통의 편지 — 잉크 1장. */
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
  /** PENDING = 봉투(내용·연락처 null), OPENED = 열어본 편지. 거절한 편지는 목록에 안 온다. */
  status: 'PENDING' | 'OPENED';
  content: string | null;
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

/** 봉투 열기 (POST /mails/{id}/open) — 내용·연락처가 채워진 편지를 돌려받는다. */
export async function openMail(mailId: string): Promise<ReceivedMail> {
  return authedRequest<ReceivedMail>('POST', `/mails/${mailId}/open`);
}

/** 조용히 거절 (POST /mails/{id}/decline) — 목록에서 사라지고 상대에겐 알리지 않는다. */
export async function declineMail(mailId: string): Promise<void> {
  await authedRequest<void>('POST', `/mails/${mailId}/decline`);
}

export type SentMail = {
  mailId: string;
  recipientNickname: string | null;
  content: string;
  phone: string | null;
  kakaoId: string | null;
  /** PENDING이면 상대가 아직 봉투를 열지 않았다. */
  status: 'PENDING' | 'OPENED' | 'DECLINED' | 'RECALLED' | (string & {});
  /** 지금 회수할 수 있는지 — 안 읽힌 채 사흘이 지났을 때만 true. */
  recallable: boolean;
  createdAt: string;
};

/**
 * 읽히지 않은 편지를 되찾아간다 (POST /mails/{id}/recall).
 * 부친 잉크의 절반이 돌아온다. 회수해도 같은 상대에게 다시 보낼 수는 없다.
 */
export async function recallMail(mailId: string): Promise<void> {
  await authedRequest('POST', `/mails/${mailId}/recall`);
}

/** 내가 이 상대(답변 주인)에게 보낸 편지 — 없으면 null (GET /mails/sent-to/{peerAnswerId}). */
export async function getSentMailTo(peerAnswerId: string): Promise<SentMail | null> {
  const res = await authedRequest<{ mail: SentMail | null }>('GET', `/mails/sent-to/${peerAnswerId}`);
  return res.mail;
}
