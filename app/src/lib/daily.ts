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
  /** 미리 써둔 프로필 문답(질문+답). 자기소개를 대신한다. */
  letters: { questionId: number; question: string; content: string }[];
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
  /** 공개된 상대, 최대 2명. */
  peers: Peer[];
};

/** 오늘의 상대 목록 (매일 정오 공개, 최대 2명, GET /daily/today/peers). */
export async function getPeers(): Promise<TodayPeers> {
  return authedRequest<TodayPeers>('GET', '/daily/today/peers');
}

export type PastAnswer = {
  question: string;
  /** 잠긴 답변은 null — 그날 질문에 내가 답하지 않았다. */
  content: string | null;
  unlocked: boolean;
  revealedAt: string;
};

export type PastPeer = {
  /** 그날의 질문 — 상세 화면 답변 블록의 라벨. */
  question: string;
  revealedAt: string;
  peer: Peer;
  /** 이 상대가 남긴 문답 목록(최신 공개 순) — 같은 상대가 여러 날 공개되면 쌓인다. */
  answers: PastAnswer[];
};

/** 지난 상대 — 최근 3일 동안 공개됐던 상대(오늘 제외, GET /daily/past-peers). */
export async function getPastPeers(): Promise<PastPeer[]> {
  const res = await authedRequest<{ peers: PastPeer[] }>('GET', '/daily/past-peers');
  return res.peers;
}

export type HeartResult = {
  hearted: boolean;
  /** 서로 하트를 보내 대화가 열렸는지. */
  matched: boolean;
  conversationId: string | null;
};

/** 상대 답변에 하트(호감 표시). 서로 하트면 대화가 열린다 (POST /daily/today/heart). */
export async function sendHeart(peerAnswerId: string): Promise<HeartResult> {
  return authedRequest<HeartResult>('POST', '/daily/today/heart', { peerAnswerId });
}

export type ReceivedHeart = {
  nickname: string;
  age: number;
  region: string;
  avatarId: number | null;
  photoUrl: string | null;
  /** 하트를 돌려보낼 상대 답변 id. null이면 되보내기 불가(옛 데이터). */
  peerAnswerId: string | null;
  createdAt: string;
};

/** 나에게 하트를 보낸 사람들 — 아직 상호 아님 (GET /daily/hearts/received). */
export async function getReceivedHearts(): Promise<ReceivedHeart[]> {
  const res = await authedRequest<{ hearts: ReceivedHeart[] }>('GET', '/daily/hearts/received');
  return res.hearts;
}
