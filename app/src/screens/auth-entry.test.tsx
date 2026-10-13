import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from '../app/index';
import EmailAuthScreen from '../app/email-auth';
import ConsentScreen from '../app/consent';
import { SignupGate } from '../components/signup-gate';
import { getAccessToken, clearTokens } from '../lib/auth-storage';
import { getMyProfile } from '../lib/member';
import { verifyCode, requestCode } from '../lib/auth';
import { clearConsent, getConsent, saveConsent } from '../lib/consent';
import { ApiError } from '../lib/api';

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
const mockQueryClient = { clear: jest.fn(), setQueryData: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('../global.css', () => ({}));
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => mockQueryClient }));
jest.mock('../lib/auth-storage', () => ({ getAccessToken: jest.fn(), clearTokens: jest.fn(), getPendingEmail: jest.fn(), savePendingEmail: jest.fn(), clearPendingEmail: jest.fn() }));
jest.mock('../lib/member', () => ({ getMyProfile: jest.fn() }));
jest.mock('../lib/auth', () => ({ verifyCode: jest.fn(), requestCode: jest.fn() }));
jest.mock('../lib/consent', () => ({ getConsent: jest.fn(), clearConsent: jest.fn(), saveConsent: jest.fn() }));
jest.mock('../lib/analytics', () => ({ track: jest.fn(), identify: jest.fn() }));
jest.mock('../lib/appearance', () => ({ useAppearance: () => ({ scheme: 'dark' }) }));
jest.mock('../hooks/use-theme', () => ({ useTheme: () => jest.requireActual('../constants/theme').Colors.dark }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View, useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const transition = { duration: () => transition, delay: () => transition };
  return { __esModule: true, default: { View }, FadeInDown: transition, FadeInUp: transition };
});

beforeEach(() => {
  jest.clearAllMocks(); mockParams = {};
  jest.mocked(getAccessToken).mockResolvedValue(null);
  jest.mocked(getConsent).mockResolvedValue(null);
  jest.mocked(getMyProfile).mockResolvedValue({ preferredGender: null } as unknown as Awaited<ReturnType<typeof getMyProfile>>);
  jest.mocked(verifyCode).mockResolvedValue({ accountId: 'test-account' } as Awaited<ReturnType<typeof verifyCode>>);
});

async function authenticate() {
  await fireEvent.changeText(screen.getByLabelText('이메일'), 'test@example.test');
  await fireEvent.press(screen.getByText('인증코드 받기'));
  await fireEvent.changeText(await screen.findByLabelText('인증코드'), '741930');
}

it('기존 회원은 가입 동의 없이 로그인으로 들어간다', async () => {
  await render(<LoginScreen />);
  await fireEvent.press(await screen.findByText('이미 가입했어요 · 로그인'));
  expect(mockRouter.push).toHaveBeenCalledWith('/email-auth?mode=login');
});

it('모임에서 MY로 들어온 손님은 모임 전용 가입·로그인으로 이어진다', async () => {
  await render(<SignupGate icon="person-outline" title="내 자리" lines={[]} mode="guest" intent="meetup" />);
  await fireEvent.press(screen.getByText('프롤로그 시작하기'));
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/consent', params: { intent: 'meetup' } });
  await fireEvent.press(screen.getByText('이미 가입했어요 · 로그인'));
  expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/email-auth', params: { mode: 'login', intent: 'meetup' } });
});

it('기존 프로필이 있으면 바로 보던 모임으로 돌아가고 동의 초안은 비운다', async () => {
  mockParams = { mode: 'login', intent: 'meetup', next: '/meetup/test' };
  await render(<EmailAuthScreen />); await authenticate();
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/meetup/test'));
  expect(getConsent).not.toHaveBeenCalled();
  expect(clearConsent).toHaveBeenCalled();
});

it('로그인으로 들어온 신규 계정은 인증 후 동의를 받고 가입을 이어간다', async () => {
  mockParams = { mode: 'login', intent: 'meetup', next: '/meetup/test' };
  jest.mocked(getMyProfile).mockResolvedValue(null);
  await render(<EmailAuthScreen />); await authenticate();
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/consent', params: { authenticated: '1', intent: 'meetup', next: '/meetup/test' } }));
  expect(requestCode).toHaveBeenCalledTimes(1);
});

it('통신 실패를 로그인 해제로 보이지 않게 하고 같은 자리에서 재시도한다', async () => {
  jest.mocked(getAccessToken).mockResolvedValue('existing-token');
  jest.mocked(getMyProfile).mockRejectedValueOnce(new TypeError('Network request failed'))
    .mockResolvedValue({ preferredGender: null } as unknown as Awaited<ReturnType<typeof getMyProfile>>);
  await render(<LoginScreen />);
  await screen.findByText('로그인 정보를 확인하지 못했어요');
  expect(screen.queryByText('문답으로 인연 만나기')).toBeNull();
  expect(clearTokens).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/meetups'));
});

it('실제로 인증이 만료됐을 때만 로그인 화면으로 돌아간다', async () => {
  jest.mocked(getAccessToken).mockResolvedValue('expired-token');
  jest.mocked(getMyProfile).mockRejectedValue(new ApiError(401));
  await render(<LoginScreen />);
  await screen.findByText('이미 가입했어요 · 로그인');
  expect(clearTokens).toHaveBeenCalled();
  expect(screen.queryByText('로그인 정보를 확인하지 못했어요')).toBeNull();
});

it('이미 인증한 신규 회원은 모임용 동의 후 재인증 없이 프로필을 만든다', async () => {
  mockParams = { authenticated: '1', intent: 'meetup', next: '/meetup/test' };
  await render(<ConsentScreen />);
  expect(screen.queryByText(/민감정보 수집에 동의합니다/)).toBeNull();
  await fireEvent.press(screen.getByText(/만 19세 이상입니다/));
  await fireEvent.press(screen.getByText(/이용약관에 동의합니다/));
  await fireEvent.press(screen.getByText(/개인정보 수집·이용에 동의합니다/));
  await fireEvent.press(screen.getByText('동의하고 계속하기'));
  expect(saveConsent).toHaveBeenCalledWith({ marketing: false, sensitive: false });
  expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/onboarding', params: { intent: 'meetup', next: '/meetup/test' } });
  expect(requestCode).not.toHaveBeenCalled();
});

it.each(['성공', '인증 오류'])('확인이 너무 오래 걸리면 재시도를 보여주고 늦은 %s 응답을 무시한다', async (result) => {
  jest.useFakeTimers();
  try {
    let finish!: (profile: Awaited<ReturnType<typeof getMyProfile>>) => void;
    let fail!: (error: Error) => void;
    jest.mocked(getAccessToken).mockResolvedValue('existing-token');
    jest.mocked(getMyProfile).mockReturnValue(new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
    await render(<LoginScreen />);
    await act(async () => { jest.advanceTimersByTime(20000); });
    expect(screen.getByText('로그인 정보를 확인하지 못했어요')).toBeTruthy();
    await act(async () => {
      if (result === '인증 오류') fail(new ApiError(401));
      else finish({ preferredGender: null } as unknown as Awaited<ReturnType<typeof getMyProfile>>);
    });
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(clearTokens).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
});
