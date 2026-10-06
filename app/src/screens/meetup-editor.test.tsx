import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import MeetupEditor from '../app/meetup-host/edit';
import { saveMeetup, uploadMeetupCover } from '../lib/meetups';
import { pickPhotos } from '../components/photo-grid';
import { useHostMeetups } from '../hooks/use-host-meetups';

jest.mock('../global.css', () => ({}));
jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: () => ({}) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('../hooks/use-theme', () => ({ useTheme: () => ({ text: '#111', textSecondary: '#555' }) }));
jest.mock('../hooks/use-host-meetups', () => ({ useHostMeetups: jest.fn() }));
jest.mock('../lib/meetups', () => ({ ...jest.requireActual('../lib/meetups'), saveMeetup: jest.fn(), uploadMeetupCover: jest.fn() }));
jest.mock('../components/photo-grid', () => ({ pickPhotos: jest.fn() }));
jest.mock('../components/sub-screen', () => {
  const { View, Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SubScreen: ({ children, onSave, saveLabel }: { children: React.ReactNode; onSave: () => void; saveLabel: string }) => <View>{children}<Pressable onPress={onSave}><Text>{saveLabel}</Text></Pressable></View> };
});
jest.mock('../components/meetup-time-picker', () => {
  const { TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
  return { MeetupTimePicker: ({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) => <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} /> };
});
jest.mock('../components/meetup-invitation', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return { MeetupInvitation: () => <Text>초대장 미리보기</Text> };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({ replace: jest.fn() } as unknown as ReturnType<typeof useRouter>);
  jest.mocked(useHostMeetups).mockReturnValue({ data: { meetups: [], canCreate: true }, session: { loading: false, signedIn: true }, isPending: false } as unknown as ReturnType<typeof useHostMeetups>);
  jest.mocked(saveMeetup).mockResolvedValue('created-id');
});

async function fillBasic() {
  await fireEvent.changeText(screen.getByLabelText('모임 이름'), '과자 모임');
  await fireEvent.changeText(screen.getByLabelText('모임 날짜'), '2030-10-17');
  await fireEvent.changeText(screen.getByLabelText('만날 장소'), '서로서가');
}

it('별도 개설 권한 응답 없이 로그인한 회원이면 작성할 수 있다', async () => {
  jest.mocked(useHostMeetups).mockReturnValue({ data: { meetups: [], canCreate: false }, session: { loading: false, signedIn: true }, isPending: false } as unknown as ReturnType<typeof useHostMeetups>);
  await render(<MeetupEditor />);
  await fillBasic();
  await fireEvent.press(screen.getByText('미리보기'));
  await fireEvent.press(screen.getByText('이대로 제출하기'));
  await waitFor(() => expect(saveMeetup).toHaveBeenCalledWith(expect.objectContaining({ title: '과자 모임' }), undefined));
});

it('로그인하지 않은 사람에게는 작성 대신 로그인 안내를 보여준다', async () => {
  jest.mocked(useHostMeetups).mockReturnValue({ session: { loading: false, signedIn: false }, isPending: false } as unknown as ReturnType<typeof useHostMeetups>);
  await render(<MeetupEditor />);
  expect(screen.getByText('모임을 만들려면 로그인해주세요.')).toBeTruthy();
  expect(screen.queryByLabelText('모임 이름')).toBeNull();
  expect(saveMeetup).not.toHaveBeenCalled();
});

it('세부 조건 없이 미리보기하고 최종 제출할 때만 저장한다', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  await render(<MeetupEditor />);
  expect(screen.queryByLabelText('연락 링크 · 선택')).toBeNull();
  expect(screen.queryByText('키 제한')).toBeNull();
  await fillBasic();
  await fireEvent.press(screen.getByText('미리보기'));
  await screen.findByText('초대장 미리보기');
  expect(dismiss).toHaveBeenCalled();
  dismiss.mockRestore();
  expect(saveMeetup).not.toHaveBeenCalled();
  expect(uploadMeetupCover).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('이대로 제출하기'));
  await waitFor(() => expect(saveMeetup).toHaveBeenCalledWith(expect.objectContaining({ title: '과자 모임', capacity: 8, fee: 0, coverUrls: [], kakaoLink: '' }), undefined));
  expect(useRouter().replace).toHaveBeenCalledWith('/meetup-host/created-id');
});

it('긴 폼의 입력 오류는 스크롤 밖에 표시하고 입력은 유지한다', async () => {
  await render(<MeetupEditor />);
  await fillBasic();
  await fireEvent.press(screen.getByText('사진·소개·참가비 더하기 · 선택'));
  await fireEvent.changeText(screen.getByLabelText('정원'), '1');
  await fireEvent.press(screen.getByText('미리보기'));
  const error = screen.getByRole('alert');
  expect(error).toHaveTextContent(/정원/);
  const form = screen.container.queryAll((node) => node.type.endsWith('ScrollView'))[0];
  expect(form).toBeDefined();
  expect(within(form).queryByRole('alert')).toBeNull();
  expect(screen.getByLabelText('모임 이름')).toHaveProp('value', '과자 모임');
  expect(saveMeetup).not.toHaveBeenCalled();
});

it('사진을 골라도 미리보기까지는 업로드하지 않는다', async () => {
  jest.mocked(pickPhotos).mockResolvedValue(['file:///snack.jpg']);
  jest.mocked(uploadMeetupCover).mockResolvedValue('https://cdn/snack.jpg');
  await render(<MeetupEditor />);
  await fillBasic();
  await fireEvent.press(screen.getByText('사진·소개·참가비 더하기 · 선택'));
  await fireEvent.press(screen.getByText('사진 고르기'));
  await screen.findByLabelText('사진 1 삭제');
  await fireEvent.press(screen.getByText('미리보기'));
  expect(uploadMeetupCover).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('이대로 제출하기'));
  await waitFor(() => expect(saveMeetup).toHaveBeenCalledWith(expect.objectContaining({ coverUrls: ['https://cdn/snack.jpg'] }), undefined));
  expect(uploadMeetupCover).toHaveBeenCalledTimes(1);
});

it('저장 실패 시 입력을 유지하고 다시 제출할 수 있다', async () => {
  jest.mocked(saveMeetup).mockRejectedValueOnce(new Error('네트워크 연결을 확인해주세요'));
  await render(<MeetupEditor />); await fillBasic();
  await fireEvent.press(screen.getByText('미리보기'));
  await fireEvent.press(screen.getByText('이대로 제출하기'));
  await screen.findByText(/네트워크 연결을 확인해주세요/);
  expect(screen.getByRole('alert')).toHaveTextContent(/입력 내용과 사진은 그대로예요/);
  expect(screen.getByLabelText('모임 이름').props.value).toBe('과자 모임');
  await fireEvent.press(screen.getByText('미리보기'));
  await fireEvent.press(screen.getByText('이대로 제출하기'));
  await waitFor(() => expect(saveMeetup).toHaveBeenCalledTimes(2));
});
