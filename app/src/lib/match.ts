import { authedRequest } from './api';
import type { Gender } from './member';

export type Match = {
  peerAccountId: string;
  nickname: string;
  gender: Gender;
  birthYear: number;
  region: string;
  matchedAt: string;
};

/** 매칭된 상대 목록 (프로필 공개, GET /matches). */
export async function getMatches(): Promise<Match[]> {
  return authedRequest<Match[]>('GET', '/matches');
}
