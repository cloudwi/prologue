import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import OnboardingScreen from '../app/onboarding';
import { completeOnboarding, finishOnboarding, getMyProfile } from '../lib/member';
import { uploadPhoto } from '../lib/photo';
import { getMyLetters, writeLetter } from '../lib/letters';
import { track } from '../lib/analytics';

const mockRouter = { replace: jest.fn() };
const mockQueryClient = { invalidateQueries: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('../global.css', () => ({}));
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => mockQueryClient }));
jest.mock('../hooks/use-theme', () => ({ useTheme: () => jest.requireActual('../constants/theme').Colors.light }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View }));
jest.mock('../lib/analytics', () => ({ track: jest.fn() }));
jest.mock('../lib/member', () => ({ completeOnboarding: jest.fn(), finishOnboarding: jest.fn(), getMyProfile: jest.fn(), updateBeliefs: jest.fn(), updateLifestyle: jest.fn(), updateContactFrequency: jest.fn() }));
jest.mock('../lib/photo', () => ({ uploadPhoto: jest.fn() }));
jest.mock('../lib/consent', () => ({ getConsent: jest.fn().mockResolvedValue({ marketing: false, sensitive: true }), clearConsent: jest.fn() }));
jest.mock('../lib/letters', () => ({ getMyLetters: jest.fn().mockResolvedValue([]), getLetterQuestions: jest.fn().mockResolvedValue([{ questionId: 1, content: '어떤 하루를 좋아하나요?' }]), writeLetter: jest.fn(), LETTER_MIN_LENGTH: 1, LETTER_MAX_LENGTH: 300 }));
jest.mock('../components/birth-date-picker', () => ({
  BirthDatePicker: ({ onChange }: { onChange: (value: string) => void }) => {
    const { Button } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Button title="생일 선택" onPress={() => onChange('19950101')} />;
  },
}));
jest.mock('../components/region-picker', () => ({
  RegionPicker: ({ onChange }: { onChange: (value: string) => void }) => {
    const { Button } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Button title="지역 선택" onPress={() => onChange('서울 마포구')} />;
  },
}));
jest.mock('../components/photo-grid', () => ({
  MIN_PHOTOS: 1, MAX_PHOTOS: 5, pickPhotos: jest.fn().mockResolvedValue(['file:///synthetic-photo.jpg']),
  PhotoGrid: ({ onAdd }: { onAdd: () => void }) => {
    const { Button } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Button title="사진 선택" onPress={onAdd} />;
  },
}));
jest.mock('../components/photo-crop', () => ({
  PhotoCropModal: ({ onDone }: { onDone: (value: string) => void }) => {
    const { Button } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Button title="사진 자르기 완료" onPress={() => onDone('file:///synthetic-crop.jpg')} />;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  jest.mocked(completeOnboarding).mockResolvedValue({ onboardingComplete: false } as never);
  jest.mocked(finishOnboarding).mockResolvedValue({ onboardingComplete: true } as never);
  jest.mocked(uploadPhoto).mockResolvedValue({ photoUrls: ['https://example.test/synthetic-photo'] } as Awaited<ReturnType<typeof uploadPhoto>>);
  jest.mocked(writeLetter).mockResolvedValue(undefined as never);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function fillRequired(meetup = false) {
  await render(<OnboardingScreen />);
  expect(screen.getByText(meetup ? '1/4' : '1/5')).toBeTruthy();
  const next = () => screen.getByRole('button', { name: '다음' });
  await fireEvent.changeText(screen.getByLabelText('닉네임'), '테스트참여자');
  expect(next()).toBeDisabled();
  await fireEvent.press(screen.getByText('생일 선택'));
  await fireEvent.press(next());
  if (meetup) expect(screen.queryByText('어떤 분을 만나고 싶으세요?')).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: '나의 성별 남성' }));
  await fireEvent.press(next());
  await fireEvent.press(screen.getByText('지역 선택'));
  expect(next()).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('전화번호'), '01012345678');
  await fireEvent.press(next());
  const finishPhoto = screen.getByRole('button', { name: meetup ? '가입 완료' : '다음' });
  expect(finishPhoto).toBeDisabled();
  await fireEvent.press(screen.getByText('사진 선택'));
  await fireEvent.press(await screen.findByText('사진 자르기 완료'));
  if (!meetup) {
    await fireEvent.press(next());
    expect(screen.getByText('5/5')).toBeTruthy();
    await screen.findByText('어떤 하루를 좋아하나요?');
    await fireEvent.changeText(screen.getByLabelText('프로필 첫 문답'), '함께 산책하는 하루');
  }
}

it('5단계에서 필수 정보를 모두 받고 첫 활동으로 바로 이어진다', async () => {
  await fillRequired();
  expect(completeOnboarding).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '가입 완료' }));
  await screen.findByText('가입이 완료됐어요!');
  expect(completeOnboarding).toHaveBeenCalledWith(expect.objectContaining({ nickname: '테스트참여자', birthDate: '1995-01-01', gender: 'MALE', preferredGender: 'FEMALE', region: '서울 마포구', phone: '01012345678' }));
  expect(uploadPhoto).toHaveBeenCalledWith('file:///synthetic-crop.jpg');
  expect(writeLetter).toHaveBeenCalledWith(1, '함께 산책하는 하루');
  expect(track).toHaveBeenCalledWith('onboarding_completed');
  await fireEvent.press(screen.getByText('취향 카드로 시작하기'));
  expect(mockRouter.replace).toHaveBeenCalledWith('/taste-cards?intro=1');
});

it('문답 저장까지 성공하기 전에는 가입 완료로 집계하지 않는다', async () => {
  let finish!: () => void;
  jest.mocked(writeLetter).mockReturnValue(new Promise((resolve) => { finish = () => resolve(undefined as never); }));
  await fillRequired();
  await fireEvent.press(screen.getByRole('button', { name: '가입 완료' }));
  await waitFor(() => expect(writeLetter).toHaveBeenCalled());
  expect(track).not.toHaveBeenCalled();
  await act(async () => finish());
  await screen.findByText('가입이 완료됐어요!');
  expect(track).toHaveBeenCalledTimes(1);
});

it('사진 업로드 실패 시 가입 완료를 표시하거나 집계하지 않는다', async () => {
  jest.mocked(uploadPhoto).mockRejectedValue(new Error('synthetic upload failure'));
  await fillRequired();
  await fireEvent.press(screen.getByRole('button', { name: '가입 완료' }));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('사진 업로드 실패', expect.any(String)));
  expect(track).not.toHaveBeenCalled();
  expect(writeLetter).not.toHaveBeenCalled();
  expect(screen.queryByText('가입이 완료됐어요!')).toBeNull();
});

it('모임 가입은 4단계로 마치고 소개팅 선호나 문답을 저장하지 않는다', async () => {
  mockParams = { intent: 'meetup', next: '/meetup/synthetic' };
  await fillRequired(true);
  await fireEvent.press(screen.getByRole('button', { name: '가입 완료' }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/meetup/synthetic'));
  expect(completeOnboarding).toHaveBeenCalledWith(expect.objectContaining({ preferredGender: null }));
  expect(writeLetter).not.toHaveBeenCalled();
  expect(track).toHaveBeenCalledTimes(1);
});

it('가입 완료 요청이 실패하면 완료 화면을 띄우지 않고 사진 재업로드 없이 재시도한다', async () => {
  jest.mocked(finishOnboarding).mockRejectedValueOnce(new Error('synthetic completion failure'))
    .mockResolvedValueOnce({ onboardingComplete: true } as never);
  await fillRequired();
  await fireEvent.press(screen.getByRole('button', { name: '가입 완료' }));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('가입 마무리 실패', 'synthetic completion failure'));
  expect(screen.queryByText('가입이 완료됐어요!')).toBeNull();
  expect(track).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '가입 완료' }));
  await screen.findByText('가입이 완료됐어요!');
  expect(uploadPhoto).toHaveBeenCalledTimes(1);
  expect(finishOnboarding).toHaveBeenCalledTimes(2);
});

it('앱을 다시 열면 저장된 사진과 문답을 불러와 가입을 마무리한다', async () => {
  mockParams = { resume: '1' };
  jest.mocked(getMyProfile).mockResolvedValue({
    onboardingComplete: false, nickname: '이어가는사람', gender: 'MALE', preferredGender: 'FEMALE',
    birthDate: '1995-01-01', region: '서울 마포구', phone: '01012345678',
    photoUrls: ['https://example.test/saved-photo'], bio: null, avatarId: null, heightCm: null,
    hobbies: [], interests: [], strengths: [],
  } as never);
  jest.mocked(getMyLetters).mockResolvedValue([{ questionId: 1, question: '어떤 하루를 좋아하나요?', content: '이미 저장된 답변' }]);
  await render(<OnboardingScreen />);
  await screen.findByDisplayValue('이미 저장된 답변');
  expect(screen.getByText('5/5')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '가입 완료' }));
  await screen.findByText('가입이 완료됐어요!');
  expect(uploadPhoto).not.toHaveBeenCalled();
  expect(finishOnboarding).toHaveBeenCalledTimes(1);
  expect(completeOnboarding).toHaveBeenCalledWith(expect.objectContaining({ nickname: '이어가는사람', birthDate: '1995-01-01' }));
});

it('이어갈 가입 정보를 불러오지 못하면 빈 가입 폼 대신 재시도한다', async () => {
  mockParams = { resume: '1' };
  jest.mocked(getMyProfile).mockRejectedValue(new Error('synthetic network failure'));
  await render(<OnboardingScreen />);
  await screen.findByText('가입 정보를 불러오지 못했어요');
  expect(screen.queryByLabelText('닉네임')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '다시 시도' }));
  await waitFor(() => expect(getMyProfile).toHaveBeenCalledTimes(2));
});

it('모임 가입을 이어갈 때 문답 API 없이 저장된 사진으로 마무리한다', async () => {
  mockParams = { resume: '1', intent: 'meetup', next: '/meetup/synthetic' };
  jest.mocked(getMyProfile).mockResolvedValue({
    onboardingComplete: false, nickname: '모임참여자', gender: 'MALE', preferredGender: null,
    birthDate: '1995-01-01', region: '서울 마포구', phone: '01012345678',
    photoUrls: ['https://example.test/saved-photo'], bio: null, avatarId: null, heightCm: null,
    hobbies: [], interests: [], strengths: [],
  } as never);
  await render(<OnboardingScreen />);
  await screen.findByText('사진 1장은 이미 저장됐어요.');
  expect(screen.getByText('4/4')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '가입 완료' }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/meetup/synthetic'));
  expect(getMyLetters).not.toHaveBeenCalled();
  expect(writeLetter).not.toHaveBeenCalled();
  expect(uploadPhoto).not.toHaveBeenCalled();
  expect(finishOnboarding).toHaveBeenCalledTimes(1);
});

it('구버전 서버의 응답에는 새 완료 요청을 보내지 않아 기존 가입과 호환된다', async () => {
  jest.mocked(completeOnboarding).mockResolvedValue({} as never);
  await fillRequired();
  await fireEvent.press(screen.getByRole('button', { name: '가입 완료' }));
  await screen.findByText('가입이 완료됐어요!');
  expect(finishOnboarding).not.toHaveBeenCalled();
});
