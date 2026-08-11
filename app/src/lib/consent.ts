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
  /** 민감정보 — 선호 성별은 성적 지향을 드러낸다 (필수) */
  sensitive: boolean;
  /** 마케팅 정보 수신 (선택) */
  marketing: boolean;
};

const KEY = 'prologue.consent';
const isWeb = Platform.OS === 'web';

export async function saveConsent(marketing: boolean): Promise<void> {
  // 필수 항목은 이 화면을 통과했다는 사실 자체가 동의다 — 화면이 그 전엔 버튼을 열어주지 않는다.
  const consent: Consent = {
    legalVersion: LEGAL_VERSION,
    terms: true,
    privacy: true,
    age: true,
    sensitive: true,
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
