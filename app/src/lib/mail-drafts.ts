import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * 편지 임시저장 — 기기에만 남는 초안. 쓰다 나가도 다음에 이어 쓴다.
 * 상대(peerAnswerId)별로 하나, 보내면 지운다. 서버에 둘 만큼 무겁지 않아 로컬로 충분하다.
 */

const KEY_PREFIX = 'prologue.mailDraft.';
const isWeb = Platform.OS === 'web';

// SecureStore 키는 영숫자와 ._- 만 허용 — UUID는 그대로 안전하다.
const keyOf = (peerAnswerId: string) => `${KEY_PREFIX}${peerAnswerId}`;

export async function loadMailDraft(peerAnswerId: string): Promise<string | null> {
  if (isWeb) return localStorage.getItem(keyOf(peerAnswerId));
  return SecureStore.getItemAsync(keyOf(peerAnswerId));
}

/** 빈 내용이면 초안을 지운다 — 지우고 나간 편지가 되살아나지 않게. */
export async function saveMailDraft(peerAnswerId: string, content: string): Promise<void> {
  if (content.trim().length === 0) return clearMailDraft(peerAnswerId);
  if (isWeb) {
    localStorage.setItem(keyOf(peerAnswerId), content);
    return;
  }
  await SecureStore.setItemAsync(keyOf(peerAnswerId), content);
}

export async function clearMailDraft(peerAnswerId: string): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(keyOf(peerAnswerId));
    return;
  }
  await SecureStore.deleteItemAsync(keyOf(peerAnswerId));
}
