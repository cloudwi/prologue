import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';

import { isSessionExpired } from './api';

/**
 * 서버 데이터를 읽는 방식 — 화면마다 손으로 하지 않는다.
 *
 * 예전에는 화면마다 `useState` + `useFocusEffect`로 직접 읽었고, 그래서 **탭을 옮길 때마다
 * 화면이 통째로 비고 스피너가 떴다**. 이미 본 내용이 있는데도 매번 처음부터 그리는 셈이라,
 * 앱이 느리게 느껴지는 가장 큰 원인이었다(2026-08-25).
 *
 * 여기서는 **이전 내용을 남겨두고 조용히 갱신한다**(stale-while-revalidate).
 * 탭 전환은 즉각적으로 느껴지고, 새 값이 오면 그 자리에서 바뀐다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * 이 시간 안에는 다시 묻지 않는다. 탭을 빠르게 오갈 때 같은 요청이 연달아 나가지 않게.
       * 30초는 "방금 본 것"과 "다시 봐야 할 것"의 경계로 잡은 값이다 —
       * 하루 단위로 도는 서비스라 초 단위 신선도는 필요 없다.
       */
      staleTime: 30_000,
      /** 화면을 떠나도 5분은 들고 있는다 — 돌아왔을 때 즉시 그릴 밑천. */
      gcTime: 5 * 60_000,
      /**
       * 한 번만 재시도. 무료 티어라 콜드스타트가 있어 한 번은 값이 있지만,
       * 여러 번 물면 "느린 화면"이 "멈춘 화면"이 된다.
       */
      retry: 1,
      refetchOnReconnect: true,
    },
  },
});

/** 앱이 배경에서 돌아오거나 네트워크가 복구되면 React Query가 알도록 잇는다(RN에는 window 이벤트가 없다). */
export function wireAppStateToQueryClient() {
  const onChange = (status: AppStateStatus) => focusManager.setFocused(status === 'active');
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}

/**
 * 탭으로 돌아올 때 조용히 다시 읽는다 — **화면은 이전 내용을 유지한 채로**.
 *
 * 탭 화면은 한 번 뜨면 계속 살아 있어서, 마운트 때만 읽으면 앱을 켜둔 동안 화면이 굳는다.
 * 자정을 넘겨 질문이 바뀌어도, 하트나 편지로 지난 상대의 남은 기간이 달라져도 알 수 없다.
 * 첫 포커스는 건너뛴다 — 그때는 useQuery가 이미 읽고 있다.
 */
export function useRefreshOnFocus(refetch: () => void) {
  const firstFocus = useRef(true);

  /*
   * 넘겨받은 함수는 ref에 담아 두고, 포커스 이펙트는 **빈 의존성**으로 건다.
   *
   * 이게 핵심이다: 예전에는 [refetch]를 의존성에 뒀는데, 부르는 쪽이 쿼리 객체를 의존성으로
   * 잡으면(useCallback(..., [someQuery])) 매 렌더 새 함수가 되고 —
   * 이펙트가 매 렌더 다시 걸리며 **다시 읽기 → 리렌더 → 다시 읽기**로 무한히 돈다.
   * 2026-08-25에 편지함이 그렇게 터졌다. 훅이 부르는 쪽의 메모이제이션에 기대지 않게 만든다.
   */
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  });

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false; // 마운트 직후 — 그때는 useQuery가 이미 읽고 있다
        return;
      }
      latest.current();
    }, []),
  );
}

/**
 * 세션이 만료됐으면 로그인으로 보낸다 — "HTTP 403" 알림 대신.
 * 화면마다 반복하던 판단을 한 곳에 모은다.
 */
export function useSessionGuard(error: unknown, onExpired: () => void) {
  useEffect(() => {
    if (!error) return;
    if (isSessionExpired(error)) onExpired();
  }, [error, onExpired]);
}

/** 네트워크 상태는 기본 감지에 맡긴다 — 별도 라이브러리를 들이지 않는다. */
export { onlineManager };
