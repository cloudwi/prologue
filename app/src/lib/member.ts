import { ApiError, authedRequest } from './api';
import type { Consent } from './consent';

export type Gender = 'MALE' | 'FEMALE';

export type OnboardingProfile = {
  nickname: string;
  gender: Gender;
  /** 생년월일, ISO 형식("1999-05-14"). */
  birthDate: string;
  preferredGender: Gender;
  region: string;
  /** 전화번호(숫자만). 프로필에 공개되지 않고, 편지에 실을 때만 상대에게 전해진다. */
  phone: string;
  bio?: string | null;
  heightCm?: number | null;
  hobbies?: string[];
  interests?: string[];
  strengths?: string[];
  avatarId?: number | null;
  /** 카카오톡 ID(선택) — 편지에 전화번호 대신 실을 수 있다. */
  kakaoId?: string | null;
  /** 가입 동의. 최초 가입에서만 보낸다 — 프로필 수정에는 없다. */
  consent?: Consent;
};

/**
 * 프로필 조회 응답. 사진은 프로필 수정(PUT)이 아니라 사진 전용 엔드포인트로 관리하므로
 * 요청 타입(OnboardingProfile)에는 없고 응답에만 있다.
 */
export type MemberProfile = Required<Omit<OnboardingProfile, 'phone'>> & {
  accountId: string;
  /** 프로필 사진 URL 목록(등록 순). 첫 장이 대표. */
  photoUrls: string[];
  /** 전화번호 필수 도입 이전 회원은 아직 없을 수 있다 — 기본 정보에서 등록. */
  phone: string | null;
};

/** 온보딩 프로필 생성/수정 (PUT /members/me, 인증 필요). */
export async function completeOnboarding(profile: OnboardingProfile): Promise<MemberProfile> {
  return authedRequest<MemberProfile>('PUT', '/members/me', profile);
}

/** 회원 탈퇴 — 계정과 모든 데이터를 되돌릴 수 없게 지운다 (DELETE /members/me). */
export async function deleteAccount(): Promise<void> {
  await authedRequest<void>('DELETE', '/members/me');
}

/** 내 프로필 조회. 아직 온보딩 전이면 null. (GET /members/me, 404 → null) */
export async function getMyProfile(): Promise<MemberProfile | null> {
  try {
    return await authedRequest<MemberProfile>('GET', '/members/me');
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
