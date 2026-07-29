import { authedRequest } from './api';

export type Today = {
  questionId: number;
  content: string;
  answered: boolean;
  myAnswer: string | null;
};

/** 오늘의 질문 + 내 답변 여부 (GET /daily/today). */
export async function getToday(): Promise<Today> {
  return authedRequest<Today>('GET', '/daily/today');
}

/** 오늘의 질문에 답변(작성/수정) (POST /daily/today/answer). */
export async function answerToday(content: string): Promise<Today> {
  return authedRequest<Today>('POST', '/daily/today/answer', { content });
}

export type Peer = {
  peerAnswerId: string | null;
  peerAnswer: string | null;
  answerUnlocked: boolean;
  /** 노출 순서대로의 프로필 사진. 가입 시 2장 필수라 비어 있는 건 옛 데이터뿐. */
  photoUrls: string[];
  nickname: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  /** 만 나이(서버 계산). */
  age: number | null;
  region: string | null;
  bio: string | null;
  heightCm: number | null;
  hobbies: string[];
  interests: string[];
  strengths: string[];
  avatarId: number | null;
};

export type TodayPeers = {
  /** 정오(KST) 전에는 false — 아직 공개 전. */
  open: boolean;
  answerUnlocked: boolean;
  /** 공개된 상대, 최대 3명. */
  peers: Peer[];
};

/** 오늘의 상대 목록 (매일 정오 공개, 최대 3명, GET /daily/today/peers). */
export async function getPeers(): Promise<TodayPeers> {
  return authedRequest<TodayPeers>('GET', '/daily/today/peers');
}

export type HeartResult = {
  hearted: boolean;
};

/** 익명 상대 답변에 하트(호감 표시) (POST /daily/today/heart). */
export async function sendHeart(peerAnswerId: string): Promise<HeartResult> {
  return authedRequest<HeartResult>('POST', '/daily/today/heart', { peerAnswerId });
}
