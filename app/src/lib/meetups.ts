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
  /** 지도 링크(구버전 데이터) — 새 데이터는 placeAddress로 링크를 만든다. */
  placeUrl: string | null;
  /** 도로명 주소 — 네이버·카카오 지도 버튼의 원료. */
  placeAddress: string | null;
  capacity: number;
  fee: number;
  /** 여성 참가비 — null이면 fee와 동일. */
  feeFemale: number | null;
  /** 참가 조건 — null이면 제한 없음. 남/녀 기준이 달라 성별별로 내려온다. */
  genderLimit: 'MALE' | 'FEMALE' | null;
  minAgeMale: number | null;
  maxAgeMale: number | null;
  minAgeFemale: number | null;
  maxAgeFemale: number | null;
  minHeightMaleCm: number | null;
  minHeightFemaleCm: number | null;
  requireJobVerified: boolean;
  /** 커버 — 사진 여러 장(첫 장이 메인). 없으면 이모지+색 폴백. */
  emoji: string | null;
  color: string | null;
  coverUrls: string[];
  status: 'OPEN' | 'CLOSED' | string;
  hostNickname: string | null;
  /** 이 모임장이 지금까지 개최를 완료한 횟수 — 신뢰 신호. */
  hostDoneCount: number;
  confirmedCount: number;
  /** 내 신청 상태. 신청 전·취소 후엔 null. */
  myStatus: 'APPLIED' | 'CONFIRMED' | 'DECLINED' | null;
  /** 신청(APPLIED/CONFIRMED)한 사람에게만 담긴다. */
  kakaoLink: string | null;
  /** 확정된 참가자 — 탭하면 모임 프로필로. */
  participants: MeetupParticipant[];
  /** 모임장 프로필로 가는 열쇠. */
  hostAccountId: string;
  /** 내가 여는 모임인지. */
  isMine: boolean;
  /**
   * 회차 묶음 — 같은 모임이 다시 열리면 같은 값('밑줄 모임 3번째 만남').
   * '다음 회차 열기'가 이 값을 그대로 돌려보내 회차를 잇는다. 구버전 서버는 안 내려준다.
   */
  seriesId?: string | null;
  /** 이 모임이 몇 번째 만남인지(1부터). */
  occurrence?: number;
  /** 이 회차 묶음의 전체 만남 수 — 2 이상일 때만 "N번째 만남"을 그린다. */
  occurrenceTotal?: number;
  /** 내가 이 모임을 따라가는지 — 다음 회차가 열리면 알림을 받는다. */
  following?: boolean;
};

export type MeetupParticipant = { accountId: string; nickname: string | null; jobVerified?: boolean };

/** 모임 멤버의 모임 이력 한 줄. */
export type MeetupMemberHistoryRow = { title: string; meetAt: string; confirmedCount: number };

/**
 * 모임 멤버 프로필 — 모임 세계의 평판.
 * 프로필과 모임 이력까지만 온다. 문답 답변·편지는 서버가 아예 싣지 않는다.
 */
export type MeetupMemberProfile = {
  nickname: string | null;
  gender: 'MALE' | 'FEMALE' | string | null;
  age: number | null;
  region: string | null;
  avatarId: number | null;
  /** 대표 사진 한 장. 구버전 서버면 없다 — 그때는 아바타로 그린다. */
  photoUrl?: string | null;
  bio: string | null;
  /** 직장 인증 여부. */
  jobVerified: boolean;
  /** 인증한 회사 이메일 도메인 — 배지에 그대로 보여준다. 미인증·구버전 서버면 없다. */
  jobDomain?: string | null;
  hostedCount: number;
  hostedRecent: MeetupMemberHistoryRow[];
  participatedCount: number;
  participatedRecent: MeetupMemberHistoryRow[];
};

/** 모임 멤버 프로필 (GET /meetups/members/{accountId}). */
export async function getMeetupMemberProfile(accountId: string): Promise<MeetupMemberProfile> {
  return authedRequest('GET', `/meetups/members/${accountId}`);
}

export type MeetupHistory = {
  title: string;
  meetAt: string;
  place: string;
  confirmedCount: number;
  hostNickname: string | null;
};

export type MeetupBoard = {
  meetups: Meetup[];
  /**
   * 내가 모임을 열 수 있는지 — 모임은 아직 운영자만 연다(2026-08-25).
   * 서버가 판정해 내려주므로 앱은 이메일을 알 필요도, 알 방법도 없다.
   * 구버전 서버는 안 내려주므로 없으면 false — 못 여는 쪽이 안전한 기본값이다.
   */
  canCreate: boolean;
};

/** 다가오는 모임 — 가까운 날짜순 + 내가 열 수 있는지 (GET /meetups). */
export async function getMeetups(): Promise<MeetupBoard> {
  const res = await authedRequest<{ meetups: Meetup[]; canCreate?: boolean }>('GET', '/meetups');
  // 서버가 앱보다 구버전일 수 있다(배포 시차) — 새 필드는 기본값으로 메워 화면이 죽지 않게 한다.
  return {
    canCreate: res.canCreate ?? false,
    meetups: res.meetups.map((m) => ({
      ...m,
      coverUrls: m.coverUrls ?? [],
      participants: m.participants ?? [],
      requireJobVerified: m.requireJobVerified ?? false,
    })),
  };
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
/**
 * 모임 따라가기 — 다음 회차가 열리면 알림을 받는다.
 * 따라가는 건 이 회차가 아니라 모임 자체라, 오늘 모임이 끝나도 구독은 남는다.
 */
export async function followMeetup(meetupId: string, on: boolean): Promise<void> {
  await authedRequest('POST', `/meetups/${meetupId}/${on ? 'follow' : 'unfollow'}`);
}

export async function cancelMeetup(meetupId: string): Promise<void> {
  await authedRequest('POST', `/meetups/${meetupId}/cancel`);
}

// ── 표시 헬퍼 — 목록 카드와 상세가 같은 문구를 쓴다 ──

/** 참가비 표시 — 성별별 요금이 있으면 나눠서 보여준다. */
export function feeLabel(m: Pick<Meetup, 'fee' | 'feeFemale'>): string {
  const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
  if (m.feeFemale != null && m.feeFemale !== m.fee) {
    return `남 ${m.fee > 0 ? won(m.fee) : '무료'} · 여 ${m.feeFemale > 0 ? won(m.feeFemale) : '무료'}`;
  }
  return m.fee > 0 ? `참가비 ${won(m.fee)}` : '무료';
}

/** 한 성별의 조건 요약 — "25~39세·175cm+" 꼴. 없으면 null. */
function genderConditions(minAge: number | null, maxAge: number | null, minHeight: number | null): string | null {
  const parts: string[] = [];
  if (minAge != null || maxAge != null) {
    parts.push(minAge != null && maxAge != null ? `${minAge}~${maxAge}세` : minAge != null ? `${minAge}세+` : `~${maxAge}세`);
  }
  if (minHeight != null) parts.push(`${minHeight}cm+`);
  return parts.length > 0 ? parts.join('·') : null;
}

/** 참가 조건 요약 — 성별별 기준을 나눠 보여준다. 없으면 null. */
export function conditionLabel(
  m: Pick<
    Meetup,
    'genderLimit' | 'minAgeMale' | 'maxAgeMale' | 'minAgeFemale' | 'maxAgeFemale' | 'minHeightMaleCm' | 'minHeightFemaleCm' | 'requireJobVerified'
  >,
): string | null {
  const male = m.genderLimit !== 'FEMALE' ? genderConditions(m.minAgeMale, m.maxAgeMale, m.minHeightMaleCm) : null;
  const female = m.genderLimit !== 'MALE' ? genderConditions(m.minAgeFemale, m.maxAgeFemale, m.minHeightFemaleCm) : null;
  const parts: string[] = [];
  if (m.genderLimit) parts.push(m.genderLimit === 'MALE' ? '남성만' : '여성만');
  if (male && female) parts.push(`남 ${male} · 여 ${female}`);
  else if (male) parts.push(m.genderLimit === 'MALE' ? male : `남 ${male}`);
  else if (female) parts.push(m.genderLimit === 'FEMALE' ? female : `여 ${female}`);
  if (m.requireJobVerified) parts.push('직장인증');
  return parts.length > 0 ? parts.join(' · ') : null;
}

// ── 모임장으로서 ──

/*
 * 모임장이 쓰던 것들(개설·수정·신청자 확정·개최 관리)은 여기서 걷어냈다.
 * 그 일은 웹 콘솔(prologue.day/host)이 맡는다 — V37 마이그레이션이 처음부터 그렇게 적고 있었고,
 * 개설은 커버 사진과 긴 소개와 주소를 다루는 폼 작업이라 큰 화면이 맞다.
 * 앱은 모임을 보고 신청하는 쪽만 남긴다. 서버 API는 그대로 있으니 웹이 같은 것을 부른다.
 */
