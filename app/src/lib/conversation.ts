import { authedRequest } from './api';
import type { Gender } from './member';

/** 상대 답변을 보고 대화 신청 (POST /conversations/requests). */
export async function sendConversationRequest(peerAnswerId: string): Promise<{ requestId: string }> {
  return authedRequest('POST', '/conversations/requests', { peerAnswerId });
}

export type ReceivedRequest = {
  requestId: string;
  questionContent: string;
  requesterAnswer: string;
  createdAt: string;
};

/** 내가 받은 대기 중 대화 신청 (GET /conversations/requests/received). */
export async function getReceivedRequests(): Promise<ReceivedRequest[]> {
  return authedRequest('GET', '/conversations/requests/received');
}

/** 대화 신청 수락 → 대화 생성. */
export async function acceptRequest(id: string): Promise<{ conversationId: string }> {
  return authedRequest('POST', `/conversations/requests/${id}/accept`);
}

/** 대화 신청 거절. */
export async function rejectRequest(id: string): Promise<void> {
  await authedRequest('POST', `/conversations/requests/${id}/reject`);
}

export type Conversation = {
  conversationId: string;
  peerAccountId: string;
  nickname: string;
  gender: Gender;
  birthYear: number;
  region: string;
};

/** 내 대화 목록 (GET /conversations). */
export async function getConversations(): Promise<Conversation[]> {
  return authedRequest('GET', '/conversations');
}
