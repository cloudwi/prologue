import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { FeedAnswer } from './feed-answer';
import { Colors } from '../constants/theme';

jest.mock('../global.css', () => ({}));
afterEach(() => jest.restoreAllMocks());

it('짧은 글도 실제로 6줄을 넘으면 더보기로 끝까지 읽을 수 있다', async () => {
  await render(<FeedAnswer content="짧지만 작은 화면에서 줄이 많이 생기는 글" c={Colors.dark} />);
  const measure = screen.getByTestId('feed-answer-measure', { includeHiddenElements: true });
  await fireEvent(measure, 'textLayout', { nativeEvent: { lines: Array(7).fill({}) } });
  await fireEvent.press(screen.getByRole('button', { name: '더보기' }));
  expect(screen.getByText('짧지만 작은 화면에서 줄이 많이 생기는 글').props.numberOfLines).toBeUndefined();
  await fireEvent.press(screen.getByRole('button', { name: '접기' }));
  expect(screen.getByText('짧지만 작은 화면에서 줄이 많이 생기는 글')).toHaveProp('numberOfLines', 6);
});

it('화면 폭이 바뀌어 더 이상 잘리지 않으면 더보기를 없앤다', async () => {
  await render(<FeedAnswer content="폭에 따라 줄 수가 바뀌는 글" c={Colors.dark} />);
  const measure = screen.getByTestId('feed-answer-measure', { includeHiddenElements: true });
  await fireEvent(measure, 'textLayout', { nativeEvent: { lines: Array(7).fill({}) } });
  expect(screen.getByText('더보기')).toBeTruthy();
  await fireEvent(measure, 'textLayout', { nativeEvent: { lines: Array(6).fill({}) } });
  expect(screen.queryByText('더보기')).toBeNull();
});

it('웹도 같은 폭에서 측정한 실제 높이로 잘림을 판단한다', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  await render(<FeedAnswer content="웹 테스트" c={Colors.dark} />);
  const measure = screen.getByTestId('feed-answer-measure', { includeHiddenElements: true });
  await fireEvent(measure, 'layout', { nativeEvent: { layout: { height: 189 } } });
  expect(screen.getByText('더보기')).toBeTruthy();
  await fireEvent(measure, 'layout', { nativeEvent: { layout: { height: 162 } } });
  expect(screen.queryByText('더보기')).toBeNull();
});
