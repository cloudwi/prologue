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
};

export type FeedSort = 'latest' | 'hearts';
export const getFeed = async (sort: FeedSort = 'latest') => (await authedRequest<{ posts: FeedPost[] }>('GET', `/feed?sort=${sort}`)).posts;
export const publishDailyToFeed = (questionId: number) => authedRequest<void>('POST', `/feed/daily/${questionId}`);
export const publishTasteToFeed = (cardId: number) => authedRequest<void>('POST', `/feed/taste/${cardId}`);
export const setFeedHeart = (postId: string, liked: boolean) => authedRequest<void>('POST', `/feed/${postId}/heart`, { liked });
export const deleteFeedPost = (postId: string) => authedRequest<void>('DELETE', `/feed/${postId}`);
export const unlockFeedProfile = (postId: string) => authedRequest<{ spent: boolean; balance: number; peer: Peer }>('POST', `/feed/${postId}/profile/unlock`);
