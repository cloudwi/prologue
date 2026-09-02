import {
  DRINKING_TAGS,
  MEET_FREQUENCY_TAGS,
  POLITICAL_TAGS,
  RELIGION_LABELS,
  SMOKING_TAGS,
} from '@/constants/profile';

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
    minAge: p.minAge,
    maxAge: p.maxAge,
    region: p.region,
    // 이전 회원은 아직 전화번호가 없을 수 있다 — 그 상태로 저장하면 서버가 등록을 요구한다(기본 정보에서 채움).
    phone: p.phone ?? '',
    kakaoId: p.kakaoId,
    bio: p.bio,
    heightCm: p.heightCm,
    hobbies: p.hobbies,
    interests: p.interests,
    strengths: p.strengths,
    avatarId: p.avatarId,
    ...patch,
  };
}

/**
 * 프로필에 붙는 작은 태그들 — 흡연·음주·만나는 빈도·종교·정치 성향.
 *
 * 다섯 항목을 편지 본문처럼 늘어놓으면 프로필이 설문지가 된다. 한 줄짜리 사실은 한 줄짜리
 * 태그로 보여주고, 지면은 그 사람이 직접 쓴 글에 내준다.
 *
 * 안 고른 항목은 아예 빠진다 — "무응답" 태그를 만들면 비워둔 것 자체가 정보가 되고,
 * 비워둔 사람에게 빈칸을 들이대는 꼴이 된다. 모르는 값도 조용히 버린다(서버에 새 값이 생겨도
 * 구버전 앱이 빈 태그를 그리지 않게).
 *
 * 순서는 자리 잡기 쉬운 것부터: 생활 습관 셋 → 신념 둘. 신념은 따로 동의하고 적은 값이라
 * 가장 뒤에 두되 빠지지는 않는다.
 */
export function profileTags(p: {
  smoking?: string | null;
  drinking?: string | null;
  meetFrequency?: string | null;
  religion?: string | null;
  politicalLeaning?: string | null;
}): string[] {
  return [
    p.smoking ? SMOKING_TAGS[p.smoking] : null,
    p.drinking ? DRINKING_TAGS[p.drinking] : null,
    p.meetFrequency ? MEET_FREQUENCY_TAGS[p.meetFrequency] : null,
    p.religion ? RELIGION_LABELS[p.religion] : null,
    p.politicalLeaning ? POLITICAL_TAGS[p.politicalLeaning] : null,
  ].filter((tag): tag is string => !!tag);
}

export type NextStep = { label: string; hint: string; href: string };

/**
 * 프로필에서 지금 채우면 가장 도움이 되는 항목 하나.
 * 진행률 막대는 "무엇을 해야 하는지"를 알려주지 않아서, 다음 행동 하나만 제안한다.
 * 노출 효과가 큰 순서(사진 → 자기소개 → 관심사 → 취미 → 강점 → 아바타)로 검사한다.
 * 자기소개는 프로필 편지의 첫 문단이라 사진 다음에 묻는다(2026-08-19) — 나머지 소개는 매일의 문답으로 쌓인다.
 */
export function nextStep(p: MemberProfile): NextStep | null {
  // 전화번호는 편지(연락처 교환)의 재료라 가장 먼저 챈다 — 필수 도입 이전 회원만 해당.
  if (!p.phone) {
    return { label: '전화번호를 등록해주세요', hint: '편지에 연락처를 실으려면 필요해요', href: '/my/edit-basic' };
  }
  const photos = p.photoUrls?.length ?? 0;
  if (photos < 2) {
    return { label: '사진을 2장 이상 올려주세요', hint: '사진이 있어야 상대에게 소개돼요', href: '/my/edit-photos' };
  }
  if (!p.bio?.trim()) {
    return { label: '자기소개를 한 문단 써보세요', hint: '상대가 프로필을 열면 가장 먼저 읽는 글이에요', href: '/my/edit-bio' };
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
