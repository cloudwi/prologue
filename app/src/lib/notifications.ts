import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { authedRequest } from './api';

/**
 * expo-notifications는 게을리 읽는다. 네이티브 모듈이 없는 환경(Expo Go, 이 모듈이 추가되기 전에 만든
 * 개발 빌드)에서는 import 자체가 던져서 탭 레이아웃 전체가 못 뜬다 — 푸시는 없어도 앱은 돌아야 한다.
 */
type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null | undefined;
function loadNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

/**
 * 푸시 알림 — 등록과 해제.
 *
 * 서버는 "보낼 곳이 있으면 보낸다"만 안다. 그래서 알림 끄기는 설정 플래그가 아니라
 * 토큰을 지우는 것으로 표현한다 — 껐는데 오는 사고가 구조적으로 불가능해진다.
 *
 * 기기에도 껐다는 사실을 남긴다. 남기지 않으면 다음 실행 때 자동 등록이 다시 켜버린다.
 */
const DISABLED_KEY = 'prologue.notificationsDisabled';
const isWeb = Platform.OS === 'web';

async function readDisabled(): Promise<boolean> {
  const v = isWeb ? localStorage.getItem(DISABLED_KEY) : await SecureStore.getItemAsync(DISABLED_KEY);
  return v === 'true';
}

async function writeDisabled(disabled: boolean): Promise<void> {
  const v = String(disabled);
  if (isWeb) {
    localStorage.setItem(DISABLED_KEY, v);
    return;
  }
  await SecureStore.setItemAsync(DISABLED_KEY, v);
}

/** 이 기기의 푸시 토큰. 시뮬레이터·웹처럼 받을 수 없는 환경이면 null. */
async function pushToken(): Promise<string | null> {
  if (isWeb || !Device.isDevice) return null;
  const Notifications = loadNotifications();
  if (!Notifications) return null;
  const existing = await Notifications.getPermissionsAsync();
  const granted =
    existing.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync();
    return data;
  } catch {
    return null; // 프로젝트 설정이 없거나 네트워크 실패 — 알림이 없을 뿐 앱은 돈다
  }
}

/** 로그인 후 호출. 유저가 끈 적이 있으면 아무것도 하지 않는다. */
export async function enableNotifications(): Promise<boolean> {
  if (await readDisabled()) return false;
  const token = await pushToken();
  if (!token) return false;
  try {
    await authedRequest<void>('POST', '/notifications/devices', {
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
    return true;
  } catch {
    return false;
  }
}

/** 알림 끄기 — 서버에서 이 기기를 지우고, 기기에도 껐다고 남긴다. */
export async function disableNotifications(): Promise<void> {
  await writeDisabled(true);
  const token = await pushToken();
  if (!token) return;
  try {
    await authedRequest<void>('DELETE', '/notifications/devices', { token });
  } catch {
    // 서버에 못 닿아도 기기 플래그는 남았다 — 다음 실행에서 재등록하지 않는다
  }
}

/** 알림 다시 켜기. */
export async function reenableNotifications(): Promise<boolean> {
  await writeDisabled(false);
  return enableNotifications();
}

export async function notificationsEnabled(): Promise<boolean> {
  return !(await readDisabled());
}
