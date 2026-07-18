import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** JWT를 기기 보안 저장소(Keychain/Keystore)에 보관. 웹은 SecureStore 미지원이라 localStorage 사용. */
const ACCESS_KEY = 'prologue.accessToken';
const REFRESH_KEY = 'prologue.refreshToken';

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

export async function clearTokens(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
