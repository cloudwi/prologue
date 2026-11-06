import { fireEvent, render, screen } from '@testing-library/react-native';
import PreviewScreen from '../app/preview';

const mockRouter = { push: jest.fn() };
jest.mock('../global.css', () => ({}));
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('../components/sub-screen', () => ({ SubScreen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../hooks/use-theme', () => ({ useTheme: () => jest.requireActual('../constants/theme').Colors.light }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));

beforeEach(() => jest.clearAllMocks());

it('선택을 바꾸고 초기화한 뒤 다시 체험할 수 있다', async () => {
  await render(<PreviewScreen />);
  expect(screen.getByText('같은 질문, 다른 생각')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: '밖에서 새로운 곳을 찾아요' }));
  expect(screen.getByText('오후의산책')).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: '집에서 좋아하는 일을 해요' }));
  expect(screen.getByText('목요일의부엌')).toBeTruthy();
  expect(screen.queryByText('오후의산책')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '체험 선택 초기화' }));
  expect(screen.getByText('같은 질문, 다른 생각')).toBeTruthy();
  expect(screen.queryByText('목요일의부엌')).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: '밖에서 새로운 곳을 찾아요' }));
  expect(screen.getByText('오후의산책')).toBeTruthy();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

it('선택한 예시 프로필과 가입으로 각각 연결한다', async () => {
  await render(<PreviewScreen />);
  await fireEvent.press(screen.getByRole('radio', { name: '집에서 좋아하는 일을 해요' }));
  await fireEvent.press(screen.getByRole('button', { name: '프로필 보기' }));
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/demo-profile', params: { id: 'thursday-kitchen' } });
  await fireEvent.press(screen.getByRole('button', { name: '가입하고 문답 시작하기' }));
  expect(mockRouter.push).toHaveBeenLastCalledWith('/consent');
});
