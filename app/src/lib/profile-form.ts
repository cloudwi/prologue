import type { MemberProfile, OnboardingProfile } from './member';

/**
 * PUT /members/me는 프로필 전체를 덮어쓴다(부분 수정 없음).
 * 그래서 편집 화면은 항상 "현재 프로필 + 내가 바꾼 부분"을 함께 보내야 한다.
 * 한 화면이 자기 항목만 보내면 나머지가 지워지므로 이 헬퍼를 거치도록 한다.
 */
export function toRequest(p: MemberProfile, patch: Partial<OnboardingProfile> = {}): OnboardingProfile {
  return {
    nickname: p.nickname,
    gender: p.gender,
    birthDate: p.birthDate,
    preferredGender: p.preferredGender,
    region: p.region,
    bio: p.bio,
    heightCm: p.heightCm,
    hobbies: p.hobbies,
    interests: p.interests,
    strengths: p.strengths,
    avatarId: p.avatarId,
    ...patch,
  };
}

export type NextStep = { label: string; hint: string; href: string };

/**
 * 프로필에서 지금 채우면 가장 도움이 되는 항목 하나.
 * 진행률 막대는 "무엇을 해야 하는지"를 알려주지 않아서, 다음 행동 하나만 제안한다.
 * 노출 효과가 큰 순서(사진 → 관심사 → 취미 → 강점 → 아바타)로 검사한다.
 * 자기소개 항목은 없다 — 소개는 매일의 문답으로 쌓인다.
 */
export function nextStep(p: MemberProfile): NextStep | null {
  const photos = p.photoUrls?.length ?? 0;
  if (photos < 2) {
    return { label: '사진을 2장 이상 올려주세요', hint: '사진이 있어야 상대에게 소개돼요', href: '/my/edit-photos' };
  }
  if (photos < 4) {
    return { label: '사진을 한 장 더 올려보세요', hint: '여러 장일수록 대화로 이어질 확률이 높아요', href: '/my/edit-photos' };
  }
  if ((p.interests?.length ?? 0) === 0) {
    return { label: '관심사를 골라보세요', hint: '대화가 시작되는 지점이 돼요', href: '/my/edit-detail' };
  }
  if ((p.hobbies?.length ?? 0) === 0) {
    return { label: '취미를 골라보세요', hint: '주말을 어떻게 보내는지 보여줄 수 있어요', href: '/my/edit-detail' };
  }
  if ((p.strengths?.length ?? 0) === 0) {
    return { label: '나의 강점을 골라보세요', hint: '어떤 사람인지 짐작하게 해줘요', href: '/my/edit-detail' };
  }
  if (p.avatarId == null) {
    return { label: '나를 닮은 아바타를 골라보세요', hint: '사진 없이 보이는 화면에서 쓰여요', href: '/my/edit-detail' };
  }
  return null;
}

/** 생년월일(ISO) → 만 나이. */
export function ageFrom(isoBirthDate: string): number | null {
  const birth = new Date(isoBirthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}
