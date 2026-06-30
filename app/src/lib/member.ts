import { authedRequest } from './api';

export type Gender = 'MALE' | 'FEMALE';

export type OnboardingProfile = {
  nickname: string;
  gender: Gender;
  birthYear: number;
  preferredGender: Gender;
  region: string;
};

export type MemberProfile = OnboardingProfile & { accountId: string };

/** 온보딩 프로필 생성/수정 (PUT /members/me, 인증 필요). */
export async function completeOnboarding(profile: OnboardingProfile): Promise<MemberProfile> {
  return authedRequest<MemberProfile>('PUT', '/members/me', profile);
}
