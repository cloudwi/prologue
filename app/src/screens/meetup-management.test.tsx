import { render, screen } from '@testing-library/react-native';
import HostMeetupDetail from '../app/meetup-host/[id]';
import { useHostMeetups } from '../hooks/use-host-meetups';
import { meetupDraft, draftInput, draftPreview } from '../lib/meetup-draft';

jest.mock('../global.css', () => ({}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), useLocalSearchParams: () => ({ id: 'local-meetup' }) }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('../hooks/use-theme', () => ({ useTheme: () => ({ text: '#111', textSecondary: '#555' }) }));
jest.mock('../hooks/use-host-meetups', () => ({ useHostMeetups: jest.fn() }));
jest.mock('../components/sub-screen', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SubScreen: ({ children }: { children: React.ReactNode }) => <View>{children}</View> };
});

it('연락 링크와 수정 안내가 빈 문자열이어도 View에 텍스트 노드를 만들지 않는다', async () => {
  const preview = draftPreview(draftInput({ ...meetupDraft(), title: '과자 모임', place: '테스트 공간', date: '2030-10-17', time: '18:00', endTime: '21:00' }));
  jest.mocked(useHostMeetups).mockReturnValue({
    data: { meetups: [{ ...preview, meetupId: 'local-meetup', kakaoLink: '', reviewNote: '', applications: [] }] },
    session: { signedIn: true, loading: false }, isPending: false,
  } as unknown as ReturnType<typeof useHostMeetups>);
  await render(<HostMeetupDetail />);
  expect(screen.queryByText('연락 링크 열기')).toBeNull();
  expect(screen.getByText(/10월 17일.*오후 6:00 – 9시/)).toBeTruthy();
  const views = screen.container.queryAll((node) => node.type === 'View' || node.type === 'RCTView');
  expect(views.length).toBeGreaterThan(0);
  for (const view of views) {
    expect([view.props.children].flat(Infinity).some((child: unknown) => typeof child === 'string')).toBe(false);
  }
});
