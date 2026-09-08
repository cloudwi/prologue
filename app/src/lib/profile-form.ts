import {
  CONTACT_FREQUENCY_TAGS,
  DRINKING_LABELS,
  DRINKING_TAGS,
  MEET_FREQUENCY_TAGS,
  POLITICAL_LABELS,
  POLITICAL_TAGS,
  RELIGION_LABELS,
  SMOKING_LABELS,
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
 * 프로필에 붙는 작은 태그들 — 흡연·음주·만남 빈도·연락 빈도·종교·정치 성향.
 *
 * 여섯 항목을 편지 본문처럼 늘어놓으면 프로필이 설문지가 된다. 한 줄짜리 사실은 한 줄짜리
 * 태그로 보여주고, 지면은 그 사람이 직접 쓴 글에 내준다.
 *
 * 안 고른 항목은 아예 빠진다 — "무응답" 태그를 만들면 비워둔 것 자체가 정보가 되고,
 * 비워둔 사람에게 빈칸을 들이대는 꼴이 된다. 모르는 값도 조용히 버린다(서버에 새 값이 생겨도
 * 구버전 앱이 빈 태그를 그리지 않게).
 *
 * 순서는 자리 잡기 쉬운 것부터: 생활 습관 → 관계 리듬 → 신념. 신념은 따로 동의하고 적은 값이라
 * 가장 뒤에 두되 빠지지는 않는다.
 */
export function profileTags(p: {
  smoking?: string | null;
  drinking?: string | null;
  meetFrequency?: string | null;
  contactFrequency?: string | null;
  religion?: string | null;
  politicalLeaning?: string | null;
}): string[] {
  return [
    p.smoking ? SMOKING_TAGS[p.smoking] : null,
    p.drinking ? DRINKING_TAGS[p.drinking] : null,
    p.meetFrequency ? MEET_FREQUENCY_TAGS[p.meetFrequency] : null,
    p.contactFrequency ? CONTACT_FREQUENCY_TAGS[p.contactFrequency] : null,
    p.religion ? RELIGION_LABELS[p.religion] : null,
    p.politicalLeaning ? POLITICAL_TAGS[p.politicalLeaning] : null,
  ].filter((tag): tag is string => !!tag);
}

export type ProfileFactGroup = {
  key: 'lifestyle' | 'rhythm' | 'values';
  label: string;
  values: string[];
};

const MEETING_PROFILE_LABELS: Record<string, string> = {
  ONCE: '만남 · 주 1회',
  TWO_TO_THREE: '만남 · 주 2~3회',
  FOUR_PLUS: '만남 · 주 4회 이상',
  FLEXIBLE: '만남 · 일정에 맞춰서',
};

const CONTACT_PROFILE_LABELS: Record<string, string> = {
  FREQUENT: '연락 · 틈틈이 자주',
  DAILY: '연락 · 하루에 한두 번',
  FEW_TIMES_WEEK: '연락 · 일주일에 몇 번',
  FLEXIBLE: '연락 · 서로 편한 대로',
};

/** 상세 프로필용 사실 묶음 — 생활 습관, 만남의 리듬, 가치관을 서로 섞지 않는다. */
export function profileFactGroups(p: {
  smoking?: string | null;
  drinking?: string | null;
  meetFrequency?: string | null;
  contactFrequency?: string | null;
  religion?: string | null;
  politicalLeaning?: string | null;
}): ProfileFactGroup[] {
  const groups: ProfileFactGroup[] = [
    {
      key: 'lifestyle',
      label: '생활',
      values: [
        p.smoking && SMOKING_LABELS[p.smoking] ? `흡연 · ${SMOKING_LABELS[p.smoking]}` : null,
        p.drinking && DRINKING_LABELS[p.drinking] ? `음주 · ${DRINKING_LABELS[p.drinking]}` : null,
      ].filter((value): value is string => !!value),
    },
    {
      key: 'rhythm',
      label: '관계 리듬',
      values: [
        p.meetFrequency ? MEETING_PROFILE_LABELS[p.meetFrequency] : null,
        p.contactFrequency ? CONTACT_PROFILE_LABELS[p.contactFrequency] : null,
      ].filter((value): value is string => !!value),
    },
    {
      key: 'values',
      label: '가치관',
      values: [
        p.religion && RELIGION_LABELS[p.religion] ? `종교 · ${RELIGION_LABELS[p.religion]}` : null,
        p.politicalLeaning && POLITICAL_LABELS[p.politicalLeaning]
          ? `정치 · ${POLITICAL_LABELS[p.politicalLeaning]}`
          : null,
      ].filter((value): value is string => !!value),
    },
  ];

  return groups.filter((group) => group.values.length > 0);
}

export type NextStep = { label: string; hint: string; href: string };

/** 프로필 체크리스트의 한 줄. [done]이면 이미 채운 것. */
export type ChecklistItem = NextStep & { key: string; done: boolean };

/**
 * 프로필을 채우는 일의 전부 — 완성도와 "다음 할 일"이 같은 표에서 나온다.
 *
 * 두 곳에서 따로 세면 언젠가 "완성도 100%인데 할 일이 남았다"가 된다. 순서는 **노출 효과가
 * 큰 순서**다 — 위에서부터 하나씩 하면 가장 빨리 소개가 잘 된다.
 *
 * 종교·정치는 넣지 않는다. 민감정보라 안 적는 것도 온전한 선택인데, 완성도에 넣으면
 * "덜 채운 사람"이 되어 적으라는 압력이 된다.
 *
 * @param letters 미리 써둔 프로필 문답 수. 모르면(안 불러왔으면) 그 줄은 빠진다.
 */
export function profileChecklist(p: MemberProfile, letters?: number): ChecklistItem[] {
  const photos = p.photoUrls?.length ?? 0;
  const tags = (p.hobbies?.length ?? 0) + (p.interests?.length ?? 0) + (p.strengths?.length ?? 0);
  const items: ChecklistItem[] = [
    {
      key: 'phone',
      label: '전화번호 등록하기',
      hint: '편지에 연락처를 실으려면 필요해요',
      href: '/my/edit-basic',
      done: !!p.phone,
    },
    {
      key: 'photos2',
      label: '사진 2장 이상 올리기',
      hint: '사진이 있어야 상대에게 소개돼요',
      href: '/my/edit-photos',
      done: photos >= 2,
    },
    {
      key: 'bio',
      label: '자기소개 한 문단 쓰기',
      hint: '프로필을 열면 가장 먼저 읽는 글이에요',
      href: '/my/edit-bio',
      done: !!p.bio?.trim(),
    },
    {
      // 사진 권유는 여기서 멈춘다(유저 결정 2026-09-02) — 세 장이면 충분히 보여준 것이고,
      // 그 뒤로도 계속 사진을 조르면 다른 빈칸이 영영 뒤로 밀린다.
      key: 'photos3',
      label: '사진 한 장 더 올리기',
      hint: '여러 장일수록 대화로 이어질 확률이 높아요',
      href: '/my/edit-photos',
      done: photos >= 3,
    },
    {
      key: 'tags',
      label: '나를 설명하는 태그 고르기',
      hint: '대화가 시작되는 지점이 돼요',
      href: '/my/edit-detail',
      done: tags >= 3,
    },
    {
      key: 'lifestyle',
      label: '생활과 관계 리듬 알려주기',
      hint: '흡연과 음주, 만남과 연락 빈도를 알려주세요',
      href: '/my/edit-detail',
      done: !!(p.smoking || p.drinking || p.meetFrequency || p.contactFrequency),
    },
    {
      key: 'avatar',
      label: '나를 닮은 아바타 고르기',
      hint: '사진 없이 보이는 화면에서 쓰여요',
      href: '/my/edit-detail',
      done: p.avatarId != null,
    },
  ];
  if (letters != null) {
    items.push({
      key: 'letters',
      label: '프로필 문답 써두기',
      hint: '자기소개를 대신하는 미리 써둔 답이에요',
      href: '/my/letters',
      done: letters > 0,
    });
  }
  return items;
}

/** 채운 비율(0~1). 완성도 막대가 쓰는 값. */
export function completionRate(items: ChecklistItem[]): number {
  if (items.length === 0) return 1;
  return items.filter((i) => i.done).length / items.length;
}

/**
 * 지금 채우면 가장 도움이 되는 항목 하나 — 체크리스트에서 아직 안 한 첫 줄.
 * 진행률 막대는 "무엇을 해야 하는지"를 알려주지 않아서, 다음 행동 하나만 제안한다.
 */
export function nextStep(p: MemberProfile, letters?: number): NextStep | null {
  const todo = profileChecklist(p, letters).find((i) => !i.done);
  return todo ? { label: todo.label, hint: todo.hint, href: todo.href } : null;
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
