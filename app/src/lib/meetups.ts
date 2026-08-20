import { authedRequest } from './api';

/**
 * 오프라인 모임 클라이언트.
 *
 * 앱은 신청·취소만 한다. 참가비 입금과 대화는 모임장의 카카오 오픈채팅에서 이뤄지고
 * (링크는 신청해야 열린다), 모임장이 입금을 확인해 웹 콘솔에서 확정한다.
 */

export type Meetup = {
  meetupId: string;
  title: string;
  description: string | null;
  meetAt: string;
  place: string;
  capacity: number;
  fee: number;
  status: 'OPEN' | 'CLOSED' | string;
  hostNickname: string | null;
  /** 이 모임장이 지금까지 개최를 완료한 횟수 — 신뢰 신호. */
  hostDoneCount: number;
  confirmedCount: number;
  /** 내 신청 상태. 신청 전·취소 후엔 null. */
  myStatus: 'APPLIED' | 'CONFIRMED' | 'DECLINED' | null;
  /** 신청(APPLIED/CONFIRMED)한 사람에게만 담긴다. */
  kakaoLink: string | null;
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
