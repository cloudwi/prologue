import { authedRequest } from './api';

/**
 * 오프라인 모임 클라이언트.
 *
 * 누구나 앱에서 모임을 열 수 있다(모임장 = 만든 사람). 참가비 입금과 대화는
 * 모임장의 카카오 오픈채팅에서 이뤄지고(링크는 신청해야 열린다),
 * 모임장이 입금을 확인해 앱에서 확정한다.
 */

export type Meetup = {
  meetupId: string;
  title: string;
  description: string | null;
  meetAt: string;
  place: string;
  capacity: number;
  fee: number;
  /** 여성 참가비 — null이면 fee와 동일. */
  feeFemale: number | null;
  /** 참가 조건 — null이면 제한 없음. */
  genderLimit: 'MALE' | 'FEMALE' | null;
  minAge: number | null;
  maxAge: number | null;
  minHeightCm: number | null;
  status: 'OPEN' | 'CLOSED' | string;
  hostNickname: string | null;
  /** 이 모임장이 지금까지 개최를 완료한 횟수 — 신뢰 신호. */
  hostDoneCount: number;
  confirmedCount: number;
  /** 내 신청 상태. 신청 전·취소 후엔 null. */
  myStatus: 'APPLIED' | 'CONFIRMED' | 'DECLINED' | null;
  /** 신청(APPLIED/CONFIRMED)한 사람에게만 담긴다. */
  kakaoLink: string | null;
  /** 확정된 참가자 닉네임 — 누가 오는지. */
  participants: string[];
  /** 내가 여는 모임인지. */
  isMine: boolean;
};

export type MeetupHistory = {
  title: string;
  meetAt: string;
  place: string;
  confirmedCount: number;
  hostNickname: string | null;
};

/** 다가오는 모임 — 가까운 날짜순 (GET /meetups). */
export async function getMeetups(): Promise<Meetup[]> {
  const res = await authedRequest<{ meetups: Meetup[] }>('GET', '/meetups');
  return res.meetups;
}

/** 지난 모임 — 개최 완료 기록 (GET /meetups/history). */
export async function getMeetupHistory(): Promise<MeetupHistory[]> {
  const res = await authedRequest<{ meetups: MeetupHistory[] }>('GET', '/meetups/history');
  return res.meetups;
}

/** 손들기 (POST /meetups/{id}/apply). */
export async function applyMeetup(meetupId: string): Promise<void> {
  await authedRequest('POST', `/meetups/${meetupId}/apply`);
}

/** 신청 취소 (POST /meetups/{id}/cancel). */
export async function cancelMeetup(meetupId: string): Promise<void> {
  await authedRequest('POST', `/meetups/${meetupId}/cancel`);
}

// ── 모임장으로서 ──

export type HostApplication = {
  applicationId: string;
  nickname: string | null;
  gender: string | null;
  age: number | null;
  region: string | null;
  status: 'APPLIED' | 'CONFIRMED' | 'DECLINED' | 'CANCELED' | string;
  appliedAt: string;
};

export type HostMeetup = {
  meetupId: string;
  title: string;
  description: string | null;
  meetAt: string;
  place: string;
  capacity: number;
  fee: number;
  feeFemale: number | null;
  genderLimit: 'MALE' | 'FEMALE' | null;
  minAge: number | null;
  maxAge: number | null;
  minHeightCm: number | null;
  kakaoLink: string;
  status: 'OPEN' | 'CLOSED' | 'DONE' | 'CANCELED' | string;
  confirmedCount: number;
  applications: HostApplication[];
};

export type CreateMeetupInput = {
  title: string;
  description?: string;
  /** ISO-8601 (예: 2026-09-05T19:00:00+09:00). */
  meetAt: string;
  place: string;
  capacity: number;
  fee: number;
  feeFemale: number | null;
  genderLimit: 'MALE' | 'FEMALE' | null;
  minAge: number | null;
  maxAge: number | null;
  minHeightCm: number | null;
  kakaoLink: string;
};

/** 모임 열기 — 누구나 (POST /meetups). */
export async function createMeetup(input: CreateMeetupInput): Promise<string> {
  const res = await authedRequest<{ meetupId: string }>('POST', '/meetups', input);
  return res.meetupId;
}

/** 내가 여는 모임 전부 — 신청자 목록까지 (GET /meetups/mine). */
export async function getMyMeetups(): Promise<HostMeetup[]> {
  const res = await authedRequest<{ meetups: HostMeetup[] }>('GET', '/meetups/mine');
  return res.meetups;
}

/** 입금 확인 후 확정 — 신청자에게 푸시가 간다. */
export async function confirmApplication(applicationId: string): Promise<void> {
  await authedRequest('POST', `/meetups/applications/${applicationId}/confirm`);
}

export async function declineApplication(applicationId: string): Promise<void> {
  await authedRequest('POST', `/meetups/applications/${applicationId}/decline`);
}

/** 모집 마감 — 신청만 막히고 확정은 계속할 수 있다. */
export async function closeHosting(meetupId: string): Promise<void> {
  await authedRequest('POST', `/meetups/${meetupId}/hosting/close`);
}

export async function reopenHosting(meetupId: string): Promise<void> {
  await authedRequest('POST', `/meetups/${meetupId}/hosting/reopen`);
}

/** 개최 완료 — 히스토리(신뢰 신호)에 남는다. */
export async function completeHosting(meetupId: string): Promise<void> {
  await authedRequest('POST', `/meetups/${meetupId}/hosting/complete`);
}

/** 모임 취소 — 신청자에게 취소 푸시가 간다. */
export async function cancelHosting(meetupId: string): Promise<void> {
  await authedRequest('POST', `/meetups/${meetupId}/hosting/cancel`);
}
