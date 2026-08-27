import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { LEGAL_VERSION } from '@/constants/legal';

/**
 * 가입 동의 — 이메일을 입력하기 전에 받고, 프로필을 만들 때 서버로 보낸다.
 *
 * 동의 화면과 온보딩 사이에 이메일 인증이 끼어 있어서 화면 간 파라미터로는 들고 가기 어렵다.
 * 그래서 기기에 잠깐 적어두고 온보딩 제출 때 꺼내 쓴다. 제출이 끝나면 지운다.
 */
export type Consent = {
  legalVersion: string;
  /** 이용약관 (필수) */
  terms: boolean;
  /** 개인정보 수집·이용 (필수) */
  privacy: boolean;
  /** 만 19세 이상 (필수) */
  age: boolean;
  /** 민감정보 — 선호 성별은 성적 지향을 드러낸다. 소개팅을 쓸 때만 받는다. */
  sensitive: boolean;
  /** 마케팅 정보 수신 (선택) */
  marketing: boolean;
};

const KEY = 'prologue.consent';
const isWeb = Platform.OS === 'web';

/**
 * 동의 화면을 통과한 사실을 적어둔다.
 *
 * 필수 항목(약관·개인정보·연령)은 이 화면을 통과했다는 사실 자체가 동의다 —
 * 화면이 그 전엔 버튼을 열어주지 않는다. 민감정보만은 다르다: 모임만 하러 온 사람에게는
 * 항목 자체를 보여주지 않으므로, 실제로 체크했는지를 그대로 실어 보낸다.
 */
export async function saveConsent({
  marketing,
  sensitive,
}: {
  marketing: boolean;
  /** 민감정보(선호 성별) 동의. 모임 전용 가입에서는 false로 남고, 소개팅을 켤 때 따로 받는다. */
  sensitive: boolean;
}): Promise<void> {
  const consent: Consent = {
    legalVersion: LEGAL_VERSION,
    terms: true,
    privacy: true,
    age: true,
    sensitive,
    marketing,
  };
  const value = JSON.stringify(consent);
  if (isWeb) {
    localStorage.setItem(KEY, value);
    return;
  }
  await SecureStore.setItemAsync(KEY, value);
}

/** 저장해 둔 동의. 없거나 깨졌으면 null. */
export async function getConsent(): Promise<Consent | null> {
  const raw = isWeb ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Consent;
  } catch {
    return null;
  }
}

export async function clearConsent(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
