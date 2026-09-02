import { authedRequest } from './api';

/**
 * 취향 카드 — 둘 중 하나를 고르는 가벼운 문답.
 *
 * 오늘의 문답과 **다른 더미**다. 날짜에 매이지 않아 언제든 몇 장이든 넘길 수 있고,
 * 잉크는 주지 않는다(잉크는 글에 대한 보상이다). 돌려주는 것은 더 맞는 상대다 —
 * 겹치는 선택이 매칭 점수에 실리고, 상대 카드에 "둘 다 이걸 골랐어요"로 걸린다.
 */
export type TasteCard = {
  id: number;
  prompt: string;
  optionA: string;
  optionB: string;
};

export type TasteOption = 'A' | 'B';

export type TasteDeck = {
  /** 아직 안 고른 카드. 다 넘기면 빈 배열이 온다. */
  cards: TasteCard[];
  answered: number;
  total: number;
};

/** 아직 안 고른 카드 한 묶음 (GET /taste-cards). */
export async function getTasteDeck(limit?: number): Promise<TasteDeck> {
  return authedRequest<TasteDeck>('GET', limit ? `/taste-cards?limit=${limit}` : '/taste-cards');
}

export type TasteProgress = { answered: number; total: number };

/**
 * 카드 한 장을 고른다 (POST /taste-cards/{id}/choice).
 * [note]는 선택지 뒤에 덧붙이는 한 줄 — 없어도 된다.
 */
export async function chooseTaste(cardId: number, option: TasteOption, note?: string): Promise<TasteProgress> {
  return authedRequest<TasteProgress>('POST', `/taste-cards/${cardId}/choice`, { option, note: note || null });
}

export type MyTaste = {
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
