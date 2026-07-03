import { ApiError, authedRequest } from './api';

export type Gender = 'MALE' | 'FEMALE';
export type BodyType = 'SLIM' | 'AVERAGE' | 'CHUBBY';

export type OnboardingProfile = {
  nickname: string;
  gender: Gender;
  birthYear: number;
  preferredGender: Gender;
  region: string;
  bio?: string | null;
  heightCm?: number | null;
  bodyType?: BodyType | null;
  hobbies?: string[];
  interests?: string[];
  strengths?: string[];
  avatarId?: number | null;
};

export type MemberProfile = Required<OnboardingProfile> & { accountId: string };

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
