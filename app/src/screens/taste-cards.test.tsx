import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import TasteCardsScreen from '../app/taste-cards';
import { chooseTaste, getTasteDeck, type TasteDeck } from '../lib/taste';

jest.mock('../global.css', () => ({}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
}));
jest.mock('../lib/taste', () => ({ getTasteDeck: jest.fn(), chooseTaste: jest.fn(), TASTE_NOTE_MAX: 100 }));
jest.mock('../lib/analytics', () => ({ track: jest.fn() }));
jest.mock('../lib/haptics', () => ({ haptics: { select: jest.fn(), success: jest.fn() } }));
jest.mock('../hooks/use-theme', () => ({ useTheme: () => ({ text: '#111111', primary: '#aa5544' }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View }));
jest.mock('react-native-reanimated', () => {
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const transition = { duration: () => transition };
  return { __esModule: true, default: { View, Text }, FadeIn: transition, FadeInDown: transition, FadeOut: transition, ZoomIn: transition };
});

const deck: TasteDeck = {
  cards: [
    { id: 1001, prompt: '쉬는 날에는?', optionA: '쉬기', optionB: '산책', options: [
      { id: 'A', label: '쉬기' }, { id: 'B', label: '산책' }, { id: 'C', label: '취미' }, { id: 'D', label: '친구 만나기' },
    ] },
    { id: 1002, prompt: '다음 질문', optionA: '아침', optionB: '밤', options: [
      { id: 'A', label: '아침' }, { id: 'B', label: '밤' }, { id: 'C', label: '오후' },
    ] },
  ],
  answered: 0, total: 100,
  reward: { every: 10, remaining: 10, unclaimed: 0, pending: 0, dailyLimitReached: false },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getTasteDeck).mockResolvedValue(deck);
});

afterEach(() => jest.restoreAllMocks());

it('네 번째 선택지를 저장하고 다음 세 선택지 카드로 넘어간다', async () => {
  jest.mocked(chooseTaste).mockResolvedValue({ answered: 1, total: 100, milestoneReached: false, peerArrived: false, reward: { ...deck.reward!, remaining: 9 } });
  await render(<TasteCardsScreen />);
  await fireEvent.press(await screen.findByText('친구 만나기'));
  await screen.findByText('다음 질문');
  expect(chooseTaste).toHaveBeenCalledWith(1001, 'D', undefined);
  expect(screen.getByText('9장 더 답하면 한 명 더 소개해 드려요')).toBeTruthy();
  expect(screen.getByText('오후')).toBeTruthy();
});

it('저장 실패 시 같은 카드에 남아 다시 시도할 수 있다', async () => {
  jest.mocked(chooseTaste).mockRejectedValue(new Error('offline'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<TasteCardsScreen />);
  await fireEvent.press(await screen.findByText('취미'));
  await waitFor(() => expect(alert).toHaveBeenCalled());
  expect(screen.getByText('쉬는 날에는?')).toBeTruthy();
  expect(screen.queryByText('다음 질문')).toBeNull();
  await fireEvent.press(screen.getByText('취미'));
  expect(chooseTaste).toHaveBeenCalledTimes(2);
});

it('소개할 후보가 없으면 자동 소개 안내만 보이고 수령 버튼이나 보유 수량은 없다', async () => {
  jest.mocked(getTasteDeck).mockResolvedValue({ ...deck, cards: [], reward: { ...deck.reward!, pending: 1 } });
  await render(<TasteCardsScreen />);
  await screen.findByText('지금은 소개할 상대를 찾고 있어요. 인연이 닿으면 자동으로 소개해 드릴게요.');
  expect(screen.getByText('매일 정오에 한 명 · 카드 10개마다 추가 한 명')).toBeTruthy();
  expect(screen.queryByText(/소개권/)).toBeNull();
  expect(screen.queryByText(/보유/)).toBeNull();
});
