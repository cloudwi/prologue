import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import TasteCardsScreen from '../app/taste-cards';
import { chooseTaste, startTasteSession, getTasteSession, type TasteDeck } from '../lib/taste';

jest.mock('../global.css', () => ({}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
}));
jest.mock('../lib/taste', () => ({ startTasteSession: jest.fn(), getTasteSession: jest.fn(), chooseTaste: jest.fn(), TASTE_NOTE_MAX: 100 }));
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
  sessionId: 'daily-session',
  cards: [
    { id: 1001, prompt: '쉬는 날에는?', optionA: '쉬기', optionB: '산책', options: [
      { id: 'A', label: '쉬기' }, { id: 'B', label: '산책' }, { id: 'C', label: '취미' }, { id: 'D', label: '친구 만나기' },
    ] },
    { id: 1002, prompt: '다음 질문', optionA: '아침', optionB: '밤', options: [
      { id: 'A', label: '아침' }, { id: 'B', label: '밤' }, { id: 'C', label: '오후' },
    ] },
  ],
  answered: 0, total: 10,
  reward: { every: 10, remaining: 10, unclaimed: 0, pending: 0, dailyLimitReached: false },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(startTasteSession).mockResolvedValue(deck);
});

afterEach(() => jest.restoreAllMocks());

it('네 번째 선택지를 저장하고 다음 세 선택지 카드로 넘어간다', async () => {
  jest.mocked(chooseTaste).mockResolvedValue({ answered: 1, total: 10, milestoneReached: false, peerArrived: false, reward: { ...deck.reward!, remaining: 9 } });
  await render(<TasteCardsScreen />);
  await fireEvent.press(await screen.findByText('친구 만나기'));
  await screen.findByText('다음 질문', {}, { timeout: 2000 });
  expect(chooseTaste).toHaveBeenCalledWith(1001, 'D', undefined, 'daily-session');
  expect(screen.getByText('1 / 10')).toBeTruthy();
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
  jest.mocked(startTasteSession).mockResolvedValue({ ...deck, cards: [], reward: { ...deck.reward!, pending: 1, remaining: 0 } });
  await render(<TasteCardsScreen />);
  await screen.findByText('카드를 다 넘겼어요');
  expect(screen.queryByText('추가 소개')).toBeNull();
  expect(screen.getByLabelText('매일 정오에 새 카드 10개')).toBeTruthy();
  expect(screen.queryByText(/소개권/)).toBeNull();
  expect(screen.queryByText(/보유/)).toBeNull();
});

it('선택 후에만 집계된 취향을 조용히 보여준다', async () => {
  jest.mocked(chooseTaste).mockResolvedValue({ answered: 1, total: 10, milestoneReached: false, peerArrived: false, selectedPercentage: 42, optionPercentages: { A: 25, B: 33, C: 42, D: 0 } });
  await render(<TasteCardsScreen />);
  await screen.findByText('취미');
  expect(screen.queryByText('42%')).toBeNull();
  await fireEvent.press(screen.getByText('취미'));
  await screen.findByText('42%');
  expect(screen.getByTestId('taste-card-meta')).toBeTruthy();
  expect(screen.getByText('쉬는 날에는?')).toBeTruthy();
  expect(screen.getByText('25%')).toBeTruthy();
  expect(screen.getByText('33%')).toBeTruthy();
  expect(screen.getByText('0%')).toBeTruthy();
  await fireEvent.press(screen.getByText('취미'));
  expect(chooseTaste).toHaveBeenCalledTimes(1);
  await screen.findByText('다음 질문', {}, { timeout: 2000 });
  expect(startTasteSession).toHaveBeenCalledTimes(1);
});

it('묶음을 다 넘겨도 같은 묶음의 남은 카드만 읽는다', async () => {
  jest.mocked(startTasteSession).mockResolvedValue({ ...deck, cards: [deck.cards[0]] });
  jest.mocked(getTasteSession).mockResolvedValue({ ...deck, cards: [], answered: 10 });
  jest.mocked(chooseTaste).mockResolvedValue({ answered: 10, total: 10, milestoneReached: true, peerArrived: false });
  await render(<TasteCardsScreen />);
  await fireEvent.press(await screen.findByText('취미'));
  await screen.findByText('카드를 다 넘겼어요', {}, { timeout: 2000 });
  expect(getTasteSession).not.toHaveBeenCalled();
  expect(startTasteSession).toHaveBeenCalledTimes(1);
});

it('상단 카드 칸으로 이전 답변을 보고 다른 칸으로 바로 이동한다', async () => {
  jest.mocked(chooseTaste).mockResolvedValue({ answered: 1, total: 10, milestoneReached: false, peerArrived: false, selectedPercentage: 42, optionPercentages: { A: 25, B: 33, C: 42, D: 0 } });
  await render(<TasteCardsScreen />);
  await fireEvent.press(await screen.findByText('취미'));
  await screen.findByText('42%');
  await fireEvent.press(screen.getByLabelText('1번 카드, 답변 완료'));
  expect(screen.queryByText('이어서 답하기')).toBeNull();
  expect(screen.queryByText('완료')).toBeNull();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(screen.getByText('쉬는 날에는?')).toBeTruthy();
  expect(screen.getByText('42%')).toBeTruthy();
  expect(chooseTaste).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByLabelText('2번 카드'));
  await screen.findByText('다음 질문');
});

it('답변 저장 중에도 상단의 다른 카드 칸으로 바로 이동한다', async () => {
  let finishSaving!: (value: Awaited<ReturnType<typeof chooseTaste>>) => void;
  jest.mocked(chooseTaste).mockReturnValue(new Promise((resolve) => { finishSaving = resolve; }));
  await render(<TasteCardsScreen />);
  await fireEvent.press(await screen.findByText('취미'));
  await fireEvent.press(screen.getByLabelText('2번 카드'));
  await screen.findByText('다음 질문');
  finishSaving({ answered: 1, total: 10, milestoneReached: false, peerArrived: false, selectedPercentage: 42, optionPercentages: { A: 25, B: 33, C: 42, D: 0 } });
  await waitFor(() => expect(chooseTaste).toHaveBeenCalledTimes(1));
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(screen.getByText('다음 질문')).toBeTruthy();
});

it('재입장해도 이미 답한 카드를 상단에서 다시 볼 수 있다', async () => {
  jest.mocked(startTasteSession).mockResolvedValue({ ...deck, cards: [deck.cards[1]], answered: 1,
    sessionCards: [{ ...deck.cards[0], myOption: 'C', optionPercentages: { A: 25, B: 33, C: 42, D: 0 } }, deck.cards[1]],
    reward: { ...deck.reward!, remaining: 9 } });
  await render(<TasteCardsScreen />);
  await screen.findByText('다음 질문');
  await fireEvent.press(screen.getByLabelText('1번 카드, 답변 완료'));
  await screen.findByText('쉬는 날에는?');
  expect(screen.getByText('42%')).toBeTruthy();
  expect(chooseTaste).not.toHaveBeenCalled();
});
