import { useFocusEffect } from 'expo-router';
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { useCallback } from 'react';

/**
 * 화면 캡처 차단의 열쇠 — 앱 전체에 거는 자물쇠 하나의 이름.
 *
 * expo-screen-capture는 열쇠를 쥔 곳이 하나라도 있으면 캡처를 막는다. 뿌리(_layout)가
 * 이 열쇠로 잠그고, 풀어야 하는 화면이 같은 열쇠를 잠시 반납한다. 기본값('default')에
 * 기대지 않고 이름을 지어 둔 이유는, 잠근 쪽과 푸는 쪽이 서로를 알아볼 수 있어야 해서다.
 */
export const APP_CAPTURE_KEY = 'app';

/**
 * 이 화면에서만 스크린샷을 허용한다 — 화면을 벗어나면 곧바로 다시 잠근다.
 *
 * 앱은 상대의 사진·답변·연락처를 늘 띄우고 있어서 캡처를 통째로 막아 두었다. 다만
 * **모임 초대장은 정반대의 물건**이다: 퍼뜨리라고 만든 화면이라, 캡처가 막히면 유저는
 * 앱이 고장 났다고 여긴다. 그래서 예외는 '초대장처럼 공개해도 되는 화면'에만 준다.
 */
export function useAllowScreenCapture() {
  useFocusEffect(
    useCallback(() => {
      // 실패해도 화면이 멈출 이유는 없다 — 잠금이 그대로일 뿐이다.
      void allowScreenCaptureAsync(APP_CAPTURE_KEY).catch(() => {});
      return () => {
        void preventScreenCaptureAsync(APP_CAPTURE_KEY).catch(() => {});
      };
    }, []),
  );
}
