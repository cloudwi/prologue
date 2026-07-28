import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** JWT를 기기 보안 저장소(Keychain/Keystore)에 보관. 웹은 SecureStore 미지원이라 localStorage 사용. */
const ACCESS_KEY = 'prologue.accessToken';
const REFRESH_KEY = 'prologue.refreshToken';
/** 인증코드를 요청한 이메일. 메일의 딥링크는 코드만 담으므로 이메일은 기기에 남겨 둔다. */
const PENDING_EMAIL_KEY = 'prologue.pendingEmail';

const isWeb = Platform.OS === 'web';

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(ACCESS_KEY);
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(REFRESH_KEY);
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function savePendingEmail(email: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(PENDING_EMAIL_KEY, email);
    return;
  }
  await SecureStore.setItemAsync(PENDING_EMAIL_KEY, email);
}

export async function getPendingEmail(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(PENDING_EMAIL_KEY);
  return SecureStore.getItemAsync(PENDING_EMAIL_KEY);
}

export async function clearPendingEmail(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(PENDING_EMAIL_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PENDING_EMAIL_KEY);
}

export async function clearTokens(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
