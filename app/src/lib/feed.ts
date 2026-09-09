import { authedRequest } from './api';
import type { Peer } from './daily';

export type FeedPost = {
  id: string;
  sourceType: 'DAILY' | 'TASTE';
  nickname: string;
  gender: 'MALE' | 'FEMALE';
  prompt: string;
  content: string;
  createdAt: string;
  heartCount: number;
  hearted: boolean;
  mine: boolean;
  profileUnlocked: boolean;
  /** 아직 열지 않은 프로필의 흐린 미리보기. 연 프로필에는 null. */
  photoPreview: string | null;
  /** 잉크로 연(또는 내) 프로필의 선명한 사진. 잠긴 프로필에는 null. */
  photoUrl: string | null;
};

export type FeedSort = 'latest' | 'hearts';
export const getFeed = async (sort: FeedSort = 'latest') => (await authedRequest<{ posts: FeedPost[] }>('GET', `/feed?sort=${sort}`)).posts;
export const publishDailyToFeed = (questionId: number) => authedRequest<void>('POST', `/feed/daily/${questionId}`);
export const publishTasteToFeed = (cardId: number) => authedRequest<void>('POST', `/feed/taste/${cardId}`);
export const setFeedHeart = (postId: string, liked: boolean) => authedRequest<void>('POST', `/feed/${postId}/heart`, { liked });
export const deleteFeedPost = (postId: string) => authedRequest<void>('DELETE', `/feed/${postId}`);
export const unlockFeedProfile = (postId: string) => authedRequest<{ spent: boolean; balance: number; peer: Peer }>('POST', `/feed/${postId}/profile/unlock`);
