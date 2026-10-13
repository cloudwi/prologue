import { fireEvent, render, screen } from '@testing-library/react-native';
import { MeetupInvitation } from './meetup-invitation';
import { Colors } from '../constants/theme';
import { draftInput, draftPreview, meetupDraft } from '../lib/meetup-draft';
import type { Meetup } from '../lib/meetups';

jest.mock('../global.css', () => ({}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));

function fixture(overrides: Partial<Meetup> = {}): Meetup {
  return {
    ...draftPreview(draftInput({
      ...meetupDraft(), title: '봉지 뜯는 사이', date: '2030-10-17', time: '18:00', endTime: '21:00',
      place: '서로서가', placeAddress: '서울 테스트로 123', fee: '10000', kakaoLink: 'https://example.com/contact',
      description: '좋아하는 과자 한 봉지로 시작하는 편한 대화.',
    })),
    status: 'OPEN', isMine: false, hostNickname: '프롤로그', ...overrides,
  };
}

it('모임 소개보다 먼저 일정 장소 비용 인원을 모아 보여준다', async () => {
  await render(<MeetupInvitation meetup={fixture()} c={Colors.light} onApply={jest.fn()} />);
  const texts = screen.container.queryAll((node) => node.type === 'Text' && typeof node.props.children === 'string');
  const values = texts.map((node) => node.props.children as string);
  expect(values.indexOf('일시')).toBeLessThan(values.indexOf('모임 소개'));
  expect(values.indexOf('참가비')).toBeLessThan(values.indexOf('모임 소개'));
  expect(screen.getByText(/정원 8명 · 확정 0명/)).toBeTruthy();
  expect(screen.getByRole('header', { name: '봉지 뜯는 사이' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '참가 신청' })).toBeTruthy();
  expect(screen.queryByText('INVITATION')).toBeNull();
  expect(screen.queryByText('GREETING')).toBeNull();
});

it('짧은 첫 문단 뒤 사진과 마지막 안내를 더보기 없이 보여준다', async () => {
  const last = '준비물은 과자 한 봉지뿐이에요. 혼자 오셔도 괜찮아요.';
  const photo = 'https://example.com/snacks.jpg';
  await render(<MeetupInvitation meetup={fixture({
    descriptionRich: `반가워요.\n[사진1]\n${last}`, bodyImageUrls: [photo],
  })} c={Colors.dark} />);
  expect(screen.getByText(last).props.numberOfLines).toBeUndefined();
  expect(screen.container.queryAll((node) => {
    const sources = Array.isArray(node.props.source) ? node.props.source : [node.props.source];
    return sources.some((source: { uri?: string } | undefined) => source?.uri === photo);
  }).length).toBeGreaterThan(0);
  expect(screen.queryByText(/더 읽기/)).toBeNull();
});

it('달력은 선택해서 펼치고 다시 접을 수 있다', async () => {
  await render(<MeetupInvitation meetup={fixture()} c={Colors.light} />);
  expect(screen.queryByText('일')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '달력 보기' }));
  expect(screen.getByText('일')).toBeTruthy();
  expect(screen.getByRole('button', { name: '달력 접기' })).toHaveProp('accessibilityState', { expanded: true });
  await fireEvent.press(screen.getByRole('button', { name: '달력 접기' }));
  expect(screen.queryByText('일')).toBeNull();
});

it('신청과 연락 동작은 유지하고 처리 중에는 누를 수 없다', async () => {
  const apply = jest.fn();
  const contact = jest.fn();
  const meetup = fixture();
  await render(<MeetupInvitation meetup={meetup} c={Colors.light} onApply={apply} />);
  await fireEvent.press(screen.getByRole('button', { name: '참가 신청' }));
  expect(apply).toHaveBeenCalledTimes(1);
  await screen.rerender(<MeetupInvitation meetup={meetup} c={Colors.light} busy onApply={apply} />);
  expect(screen.getByRole('button', { name: '참가 신청' })).toBeDisabled();
  await screen.rerender(<MeetupInvitation meetup={{ ...meetup, myStatus: 'CONFIRMED', kakaoLink: 'https://example.com/contact' }} c={Colors.dark} onOpenKakao={contact} />);
  expect(screen.getByText('참석 확정')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '연락하기' }));
  expect(contact).toHaveBeenCalledWith('https://example.com/contact');
});

it('미리보기에서는 정보만 보이고 신청 버튼이나 가짜 프로필 이동이 없다', async () => {
  await render(<MeetupInvitation meetup={fixture({ isMine: true })} c={Colors.light} preview />);
  expect(screen.getByText('참가비')).toBeTruthy();
  expect(screen.getByText('신청을 받을 예정이에요')).toBeTruthy();
  expect(screen.queryByText('모집이 끝났어요')).toBeNull();
  expect(screen.queryByRole('button', { name: '참가 신청' })).toBeNull();
  expect(screen.queryByText(/프로필 보기/)).toBeNull();
});
