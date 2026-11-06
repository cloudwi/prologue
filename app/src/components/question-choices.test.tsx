import { useState } from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Colors } from '../constants/theme';
import { QuestionChoices } from './question-choices';
import type { QuestionInputType } from '../lib/daily';

jest.mock('../global.css', () => ({}));

function Editor({ type, disabled = false }: { type: QuestionInputType; disabled?: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  return <QuestionChoices inputType={type} options={type === 'OX'
    ? [{ id: 'O', label: '맞아요' }, { id: 'X', label: '아니에요' }]
    : [{ id: 'A', label: '산책' }, { id: 'B', label: '영화' }]}
    selected={selected} onChange={setSelected} disabled={disabled} c={Colors.light} />;
}

it('단일 선택에서 새 선택을 누르면 이전 선택이 해제된다', async () => {
  await render(<Editor type="SINGLE_CHOICE" />);
  await fireEvent.press(screen.getByRole('radio', { name: '산책' }));
  await fireEvent.press(screen.getByRole('radio', { name: '영화' }));
  expect(screen.getByRole('radio', { name: '산책' })).toHaveProp('accessibilityState', { checked: false, disabled: false });
  expect(screen.getByRole('radio', { name: '영화' })).toHaveProp('accessibilityState', { checked: true, disabled: false });
});

it('복수 선택은 여러 개를 고르고 다시 눌러 하나만 해제할 수 있다', async () => {
  await render(<Editor type="MULTIPLE_CHOICE" />);
  await fireEvent.press(screen.getByRole('checkbox', { name: '산책' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: '영화' }));
  expect(screen.getByRole('checkbox', { name: '산책' })).toHaveProp('accessibilityState', { checked: true, disabled: false });
  expect(screen.getByRole('checkbox', { name: '영화' })).toHaveProp('accessibilityState', { checked: true, disabled: false });
  await fireEvent.press(screen.getByRole('checkbox', { name: '산책' }));
  expect(screen.getByRole('checkbox', { name: '산책' })).toHaveProp('accessibilityState', { checked: false, disabled: false });
  expect(screen.getByRole('checkbox', { name: '영화' })).toHaveProp('accessibilityState', { checked: true, disabled: false });
});

it('OX도 한 가지를 고르며 저장 중에는 바꿀 수 없다', async () => {
  await render(<Editor type="OX" disabled />);
  await fireEvent.press(screen.getByRole('radio', { name: 'O, 맞아요' }));
  expect(screen.getByRole('radio', { name: 'O, 맞아요' })).toHaveProp('accessibilityState', { checked: false, disabled: true });
});

it('웹은 Space로 고르고 방향키로 선택과 포커스를 함께 옮긴다', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  try {
    await render(<Editor type="SINGLE_CHOICE" />);
    const focus = [jest.fn(), jest.fn()];
    const key = (name: string) => ({ key: name, preventDefault: jest.fn(), currentTarget: { parentElement: { querySelectorAll: () => focus.map((f) => ({ focus: f })) } } });
    await fireEvent(screen.getByRole('radio', { name: '산책' }), 'keyDown', key(' '));
    expect(screen.getByRole('radio', { name: '산책', checked: true })).toBeTruthy();
    await fireEvent(screen.getByRole('radio', { name: '산책' }), 'keyDown', key('ArrowDown'));
    expect(screen.getByRole('radio', { name: '영화', checked: true })).toBeTruthy();
    expect(focus[1]).toHaveBeenCalledTimes(1);
    await fireEvent(screen.getByRole('radio', { name: '영화' }), 'keyDown', key('ArrowDown'));
    expect(screen.getByRole('radio', { name: '산책', checked: true })).toBeTruthy();
    expect(focus[0]).toHaveBeenCalledTimes(1);
  } finally { jest.restoreAllMocks(); }
});
