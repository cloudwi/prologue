import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { apiGet } from './api';

/**
 * 부팅 설정 — 서버가 "이 버전 미만은 못 쓴다"고 알려주는 통로.
 *
 * 앱은 웹과 달리 강제로 새 코드를 밀어넣을 수 없어서, 업데이트하지 않는 유저의 폰에는
 * 옛 바이너리가 계속 남는다. 서버가 하위 호환을 깰 수밖에 없을 때를 위한 안전장치다.
 *
 * 원칙은 fail-open — 네트워크 실패, 서버 장애, 버전 미상은 모두 통과시킨다.
 * 서버가 명시적으로 "낮다"고 답할 때만 막는다. 그렇지 않으면 서버가 잠깐 흔들리는 동안
 * 세상의 모든 프롤로그가 열리지 않는 앱이 된다.
 */

type AppConfig = {
  minSupportedVersion: string;
  latestVersion: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
};

/** 지금 설치된 앱 버전(app.json의 version). 알아낼 수 없으면 null. */
function currentAppVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

/** 점으로 나뉜 버전 비교. a<b면 음수, 같으면 0, a>b면 양수. */
function compareVersions(a: string, b: string): number {
  const left = a.split('.');
  const right = b.split('.');
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const l = Number.parseInt(left[i] ?? '0', 10) || 0;
    const r = Number.parseInt(right[i] ?? '0', 10) || 0;
    if (l !== r) return l - r;
  }
  return 0;
}

/** 강제 업데이트가 필요하면 보낼 스토어 주소를, 필요 없으면 null을 준다. */
export async function requiredUpdateStoreUrl(): Promise<string | null> {
  const current = currentAppVersion();
  if (!current) return null;

  try {
    const config = await apiGet<AppConfig>('/app-config');
    if (compareVersions(current, config.minSupportedVersion) >= 0) return null;
    return Platform.OS === 'ios' ? config.iosStoreUrl : config.androidStoreUrl;
  } catch {
    return null;
  }
}
