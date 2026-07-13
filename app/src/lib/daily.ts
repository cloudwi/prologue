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
  hasPeer: boolean;
  peerAnswerId: string | null;
  peerAnswer: string | null;
  answerUnlocked: boolean;
  gender: 'MALE' | 'FEMALE' | null;
  /** 만 나이(서버 계산). */
  age: number | null;
  region: string | null;
  bio: string | null;
  heightCm: number | null;
  bodyType: 'SLIM' | 'AVERAGE' | 'CHUBBY' | null;
  hobbies: string[];
  interests: string[];
  strengths: string[];
  avatarId: number | null;
};

/** 블라인드 상대 답변 (내가 답해야 열람 가능, GET /daily/today/peer). */
export async function getPeer(): Promise<Peer> {
  return authedRequest<Peer>('GET', '/daily/today/peer');
}

export type HeartResult = {
  hearted: boolean;
};

/** 익명 상대 답변에 하트(호감 표시) (POST /daily/today/heart). */
export async function sendHeart(peerAnswerId: string): Promise<HeartResult> {
  return authedRequest<HeartResult>('POST', '/daily/today/heart', { peerAnswerId });
}
