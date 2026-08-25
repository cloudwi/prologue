import { authedRequest } from './api';

export type Today = {
  questionId: number;
  content: string;
  answered: boolean;
  myAnswer: string | null;
  /** 이번 요청으로 고인 잉크 — 답변 저장 응답에서 하루 한 번 0보다 크다. 조회는 늘 0. */
  inkEarned: number;
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
  /** 상대가 답한 질문. 후보를 최근 며칠치로 넓혀서 오늘 질문이 아닐 수 있다. */
  question: string | null;
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
  /** 내가 이 상대에게 이미 편지를 보냈는지 — true면 편지 쓰기 대신 보낸 편지 확인. */
  mailSent: boolean;
  /** 내가 이 상대에게 이미 하트를 보냈는지. 하트는 한 사람에게 한 번뿐이다. */
  hearted: boolean;
  /** 최근 접속 버킷. 기록 없음·한 달 초과는 null(미표시) — 정확한 시각은 서버가 내리지 않는다. */
  lastActive: LastActive | null;
  /** 직장 인증 여부. 구버전 서버 응답에는 없다 — 없으면 미표시. */
  jobVerified?: boolean;
  /** 인증한 회사 이메일 도메인 — 배지에 그대로 보여준다. 미인증이면 null. */
  jobDomain?: string | null;
  /**
   * 이어진 지 사흘이 지나 닫힌 프로필. true면 사진·답변·상세가 비어 온다(서버가 지운다).
   * 닉네임·나이·지역은 남는다 — 잉크를 쓸지 정하려면 누구인지는 알아야 하니까.
   */
  locked: boolean;
};

export type LastActive = 'TODAY' | 'THIS_WEEK' | 'WEEKS_AGO';

export type TodayPeers = {
  /**
   * 공개 시각이 사라진 뒤로는 언제나 true(2026-08-25).
   * 정오 카운트다운을 그리던 시절의 필드라 서버가 아직 내려주지만, 앱은 더 보지 않는다.
   */
  open: boolean;
  answerUnlocked: boolean;
  /**
   * peers가 오늘 도착한 사람이 아니라 지난번에 만난 사람이라는 표시 —
   * 아직 오늘 답하지 않았다는 뜻. 답을 남기면 새 사람으로 바뀐다.
   * 구버전 서버는 안 내려주므로 없으면 false로 본다.
   */
  carriedOver?: boolean;
  /** 소개된 상대, 최대 2명. */
  peers: Peer[];
};

/** 오늘의 상대 목록 (답을 남기면 도착, 최대 2명, GET /daily/today/peers). */
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
  /**
   * 프로필이 닫히는 시각. 이미 닫혔거나 잉크로 열어둬 다시 닫히지 않는 상대는 null.
   * 창은 하트·편지로 연장되므로 소개 시각만 보고 앱이 계산하면 실제 잠금과 어긋난다.
   */
  closesAt: string | null;
  peer: Peer;
  /** 이 상대가 남긴 문답 목록(최신 공개 순) — 같은 상대가 여러 날 공개되면 쌓인다. */
  answers: PastAnswer[];
};

/**
 * 지난 상대 — 최근 30일 안에 소개됐던 상대(오늘 제외, GET /daily/past-peers).
 * 사흘이 지난 상대는 목록에는 남되 `peer.locked`로 잠겨서 온다.
 */
export async function getPastPeers(): Promise<PastPeer[]> {
  const res = await authedRequest<{ peers: PastPeer[] }>('GET', '/daily/past-peers');
  return res.peers;
}

export type PeerProfile = {
  /** 그 답변의 질문 — 상세 화면 문답 라벨. */
  question: string;
  peer: Peer;
};

/** 답변 id로 상대 프로필 상세 — 편지함(받은 하트)에서 프로필로 들어갈 때 (GET /daily/peers/{id}). */
export async function getPeerProfile(peerAnswerId: string): Promise<PeerProfile> {
  return authedRequest<PeerProfile>('GET', `/daily/peers/${peerAnswerId}`);
}

export type MyAnswer = {
  questionId: number;
  question: string;
  content: string;
  answeredAt: string;
};

/** 내가 남긴 답 — 역대 답변 전부(질문 포함), 최신순. 본인 전용 (GET /daily/my-answers). */
export async function getMyAnswers(): Promise<MyAnswer[]> {
  const res = await authedRequest<{ answers: MyAnswer[] }>('GET', '/daily/my-answers');
  return res.answers;
}

export type HeartResult = {
  hearted: boolean;
  /** 서로 하트 — 편지를 잉크 없이 보낼 수 있다. */
  matched: boolean;
};

/** 상대 답변에 하트(호감 표시). 서로 하트면 편지가 무료가 된다 (POST /daily/today/heart). */
export async function sendHeart(peerAnswerId: string): Promise<HeartResult> {
  return authedRequest<HeartResult>('POST', '/daily/today/heart', { peerAnswerId });
}

export type ReceivedHeart = {
  nickname: string;
  age: number;
  region: string;
  avatarId: number | null;
  photoUrl: string | null;
  /** 행동 대상 상대 답변 id. null이면 버튼을 숨긴다(옛 데이터). */
  peerAnswerId: string | null;
  /** 서로 하트 — true면 하트 되보내기 대신 편지 쓰기 차례. */
  mutual: boolean;
  /** 내가 이미 편지를 보냈는지 — true면 편지 쓰기 대신 보낸 편지 확인. */
  mailSent: boolean;
  /** 하트가 오간 지 사흘이 지나 프로필이 닫혔는지. true면 photoUrl이 비어 오고 행동도 닫힌다. */
  locked: boolean;
  createdAt: string;
};

/** 나에게 하트를 보낸 사람들 — 상호가 된 상대도 남는다 (GET /daily/hearts/received). */
export async function getReceivedHearts(): Promise<ReceivedHeart[]> {
  const res = await authedRequest<{ hearts: ReceivedHeart[] }>('GET', '/daily/hearts/received');
  return res.hearts;
}

/** 내가 하트를 보낸 사람들 — 답이 온 사람(mutual)도, 아직인 사람도. 받은 하트와 같은 모양 (GET /daily/hearts/sent). */
export async function getSentHearts(): Promise<ReceivedHeart[]> {
  const res = await authedRequest<{ hearts: ReceivedHeart[] }>('GET', '/daily/hearts/sent');
  return res.hearts;
}

export type UnlockResult = {
  /** false면 이미 열려 있어 잉크를 쓰지 않았다는 뜻(멱등). */
  spent: boolean;
  /** 차감 후 잔액 — 지갑을 다시 묻지 않아도 되게 서버가 함께 준다. */
  balance: number;
  /** 열린 프로필 — 그대로 화면에 꽂으면 된다. */
  peer: Peer;
};

/**
 * 잉크 한 장으로 닫힌 프로필을 다시 연다 (POST /daily/peers/{id}/unlock).
 * 한 번 열면 다시 닫히지 않는다. 이미 열려 있으면 잉크를 쓰지 않고 성공한다.
 */
export async function unlockPeer(peerAnswerId: string): Promise<UnlockResult> {
  return authedRequest<UnlockResult>('POST', `/daily/peers/${peerAnswerId}/unlock`);
}
