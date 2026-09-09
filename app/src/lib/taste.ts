import { authedRequest } from './api';

/** 정오마다 10개. 시작한 묶음은 새 묶음을 받을 때까지 이어서 답할 수 있다. */
export type TasteCard = {
  id: number;
  prompt: string;
  optionA: string;
  optionB: string;
  options?: { id: TasteOption; label: string }[];
  myOption?: TasteOption | null;
  optionPercentages?: Partial<Record<TasteOption, number>> | null;
  /** 이 카드의 답을 이미 피드에 올렸는지. 구버전 서버는 안 내려주므로 옵셔널. */
  feedPublished?: boolean;
};

export type TasteOption = 'A' | 'B' | 'C' | 'D';

export type TasteReward = {
  every: number;
  remaining: number;
  unclaimed: number;
  pending: number;
  dailyLimitReached: boolean;
};

export type TasteDeck = {
  /** 아직 안 고른 카드. 다 넘기면 빈 배열이 온다. */
  cards: TasteCard[];
  sessionCards?: TasteCard[];
  sessionId?: string;
  resetsAt?: string;
  answered: number;
  total: number;
  reward?: TasteReward;
};

/** 아직 안 고른 카드 한 묶음 (GET /taste-cards). */
export async function getTasteDeck(limit?: number): Promise<TasteDeck> {
  return authedRequest<TasteDeck>('GET', `/taste-cards?version=3${limit ? `&limit=${limit}` : ''}`);
}

export async function startTasteSession(): Promise<TasteDeck> {
  return authedRequest<TasteDeck>('POST', '/taste-cards/sessions');
}

export async function getTasteSession(id: string): Promise<TasteDeck> {
  return authedRequest<TasteDeck>('GET', `/taste-cards/sessions/${id}`);
}

export type TasteProgress = {
  selectedPercentage?: number | null;
  optionPercentages?: Partial<Record<TasteOption, number>> | null;
  answered: number;
  total: number;
  reward?: TasteReward;
  /** 이번 장으로 이정표를 밟았는지 — 추가 한 명의 소개 조건을 달성했다는 뜻. */
  milestoneReached: boolean;
  /** 추가 상대가 실제로 도착했는지. 후보가 없으면 나중에 자동으로 소개한다. */
  peerArrived: boolean;
};

/**
 * 카드 한 장을 고른다 (POST /taste-cards/{id}/choice).
 * [note]는 선택지 뒤에 덧붙이는 한 줄 — 없어도 된다.
 */
export async function chooseTaste(cardId: number, option: TasteOption, note?: string, sessionId?: string): Promise<TasteProgress> {
  return authedRequest<TasteProgress>('POST', `/taste-cards/${cardId}/choice`, { option, note: note || null, sessionId });
}

export type MyTaste = {
  version?: number;
  cardId: number;
  prompt: string;
  /** 내가 고른 쪽의 문구(선택지 A/B가 아니라 사람이 읽는 값). */
  choice: string;
  note: string | null;
  chosenAt: string;
};

/** 내가 고른 카드 전부 (GET /taste-cards/mine). 최근 순, 본인 전용. */
export async function getMyTastes(): Promise<MyTaste[]> {
  const res = await authedRequest<{ tastes: MyTaste[] }>('GET', '/taste-cards/mine');
  return res.tastes;
}

/** 한 줄의 최대 길이 — 서버와 같은 값. 길게 쓰고 싶어진 사람의 자리는 오늘의 문답이다. */
export const TASTE_NOTE_MAX = 100;
