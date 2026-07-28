import { ApiError, authedRequest } from './api';

export type Gender = 'MALE' | 'FEMALE';

export type OnboardingProfile = {
  nickname: string;
  gender: Gender;
  /** 생년월일, ISO 형식("1999-05-14"). */
  birthDate: string;
  preferredGender: Gender;
  region: string;
  bio?: string | null;
  heightCm?: number | null;
  hobbies?: string[];
  interests?: string[];
  strengths?: string[];
  avatarId?: number | null;
};

/**
 * 프로필 조회 응답. 사진은 프로필 수정(PUT)이 아니라 사진 전용 엔드포인트로 관리하므로
 * 요청 타입(OnboardingProfile)에는 없고 응답에만 있다.
 */
export type MemberProfile = Required<OnboardingProfile> & {
  accountId: string;
  /** 프로필 사진 URL 목록(등록 순). 첫 장이 대표. */
  photoUrls: string[];
};

/** 온보딩 프로필 생성/수정 (PUT /members/me, 인증 필요). */
export async function completeOnboarding(profile: OnboardingProfile): Promise<MemberProfile> {
  return authedRequest<MemberProfile>('PUT', '/members/me', profile);
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
