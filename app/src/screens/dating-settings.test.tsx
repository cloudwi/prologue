import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import PreferencesScreen from '../app/my/preferences';
import StartDatingScreen from '../app/my/start-dating';
import { getMyProfile, pauseDating } from '../lib/member';
import { SESSION_QUERY_KEY } from '../lib/session';

const mockRouter = { replace: jest.fn(), back: jest.fn(), push: jest.fn() };
const mockClient = { setQueryData: jest.fn(), invalidateQueries: jest.fn(), removeQueries: jest.fn() };
let mockFocus: (() => (() => void) | void) | undefined;
jest.mock('../global.css', () => ({}));
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useFocusEffect: (callback: () => (() => void) | void) => {
  mockFocus = callback;
  jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]);
} }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => mockClient }));
jest.mock('../hooks/use-theme', () => ({ useTheme: () => jest.requireActual('../constants/theme').Colors.dark }));
jest.mock('../lib/member', () => ({ getMyProfile: jest.fn(), pauseDating: jest.fn(), completeOnboarding: jest.fn() }));
jest.mock('../lib/analytics', () => ({ track: jest.fn() }));
jest.mock('../components/sub-screen', () => {
  const { View, Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SubScreen: ({ children, onSave, saveLabel = '저장', saveDisabled }: { children: React.ReactNode; onSave: () => void; saveLabel: string; saveDisabled: boolean }) => <View>{children}<Pressable accessibilityRole="button" disabled={saveDisabled} onPress={onSave}><Text>{saveLabel}</Text></Pressable></View> };
});

const profile = { accountId: 'test-account', preferredGender: 'FEMALE', gender: 'MALE', minAge: null, maxAge: null, birthDate: '1995-01-01', photoUrls: ['https://cdn/photo.jpg'] } as unknown as NonNullable<Awaited<ReturnType<typeof getMyProfile>>>;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getMyProfile).mockResolvedValue(profile);
  jest.mocked(pauseDating).mockResolvedValue({ ...profile, preferredGender: null });
});

it('소개 중지를 취소하면 아무것도 저장하지 않는다', async () => {
  await render(<PreferencesScreen />);
  await fireEvent.press(await screen.findByText('소개팅 중지하기'));
  await fireEvent.press(screen.getByText('계속 소개받기'));
  expect(pauseDating).not.toHaveBeenCalled();
});

it('소개를 중지하면 세션과 MY를 즉시 갱신하고 모임 전용 상태로 돌아간다', async () => {
  await render(<PreferencesScreen />);
  await fireEvent.press(await screen.findByText('소개팅 중지하기'));
  await fireEvent.press(screen.getByText('중지하기'));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/my'));
  expect(pauseDating).toHaveBeenCalledTimes(1);
  expect(mockClient.setQueryData).toHaveBeenCalledWith(SESSION_QUERY_KEY, { signedIn: true, profile: { ...profile, preferredGender: null } });
  const updateMy = mockClient.setQueryData.mock.calls.find(([key]) => key[0] === 'me')?.[1];
  expect(updateMy).toEqual(expect.any(Function));
  const oldMy = { profile, job: { verified: true }, notifyOn: true };
  expect(updateMy(oldMy)).toEqual({ ...oldMy, profile: { ...profile, preferredGender: null } });
  expect(updateMy(undefined)).toBeUndefined();
  expect(mockClient.removeQueries).toHaveBeenCalledWith({ queryKey: ['daily'] });
});

it('중지 요청이 실패하면 현재 소개 상태를 유지하고 재시도할 수 있다', async () => {
  jest.mocked(pauseDating).mockRejectedValueOnce(new Error('연결이 끊겼어요'));
  await render(<PreferencesScreen />);
  await fireEvent.press(await screen.findByText('소개팅 중지하기'));
  await fireEvent.press(screen.getByText('중지하기'));
  await screen.findByText('연결이 끊겼어요');
  expect(mockClient.setQueryData).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('중지하기'));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/my'));
});

it('사진이 없으면 동의해도 소개 시작을 먼저 사진 등록으로 안내한다', async () => {
  jest.mocked(getMyProfile).mockResolvedValue({ ...profile, preferredGender: null, photoUrls: [] });
  await render(<StartDatingScreen />);
  await fireEvent.press(await screen.findByText(/민감정보 수집·이용에 동의합니다/));
  expect(screen.getByRole('button', { name: '시작' })).toBeDisabled();
  await fireEvent.press(screen.getByText(/지금 0장이에요/));
  expect(mockRouter.push).toHaveBeenCalledWith('/my/edit-photos');
  jest.mocked(getMyProfile).mockResolvedValue({ ...profile, preferredGender: null });
  await act(async () => { mockFocus?.(); });
  expect(screen.getByRole('button', { name: '시작' })).toBeEnabled();
  expect(screen.queryByText(/지금 0장이에요/)).toBeNull();
});
