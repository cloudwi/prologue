import { render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { useRefreshOnFocus } from './query';

/**
 * 포커스 갱신 훅 — **다시 읽기가 무한히 도는지**를 본다.
 *
 * 2026-08-25에 편지함이 이걸로 터졌다. 훅이 `[refetch]`를 의존성에 두고 있었는데,
 * 부르는 쪽이 쿼리 객체를 의존성으로 잡아(`useCallback(..., [someQuery])`) 매 렌더 새 함수가 됐고 —
 * 포커스 이펙트가 매 렌더 다시 걸리며 다시 읽기 → 리렌더 → 다시 읽기로 끝없이 돌았다.
 * 타입 검사·린트·순수 로직 테스트가 전부 초록이었다. **렌더를 돌려야만 드러나는 종류**다.
 *
 * expo-router의 useFocusEffect는 네비게이션 컨텍스트를 요구하므로,
 * "콜백 identity가 바뀌면 이펙트가 다시 걸린다"는 실제 계약만 남기고 흉내 낸다 —
 * 훅이 불안정한 콜백에 흔들리면 여기서 그대로 드러난다.
 */
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});

/** 매 렌더 새 함수를 넘기는 화면 — 사고 당시의 잘못된 사용법 그대로. */
function Screen({ onRefresh }: { onRefresh: () => void }) {
  const [tick, setTick] = useState(0);
  useRefreshOnFocus(() => onRefresh()); // ← 매 렌더 새 함수(메모이제이션 없음)
  return <Text onPress={() => setTick((t) => t + 1)}>{`tick ${tick}`}</Text>;
}

describe('포커스 갱신', () => {
  it('첫 마운트에는 다시 읽지 않는다 — 그때는 useQuery가 이미 읽고 있다', async () => {
    const onRefresh = jest.fn();
    await render(<Screen onRefresh={onRefresh} />);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('리렌더가 반복돼도 다시 읽기가 쌓이지 않는다 — 콜백이 매번 새로 만들어져도', async () => {
    const onRefresh = jest.fn();
    const view = await render(<Screen onRefresh={onRefresh} />);

    // 화면이 여러 번 다시 그려지는 상황. 예전 구현이면 그릴 때마다 한 번씩 더 읽었다.
    for (let i = 0; i < 10; i += 1) await view.rerender(<Screen onRefresh={onRefresh} />);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByText('tick 0')).toBeTruthy();
  });
});
