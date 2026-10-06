import { koreanMeetupWhen } from './meetup-format';

it('관리 화면에 한국 시각의 시작과 종료를 함께 표시한다', () => {
  expect(koreanMeetupWhen({ meetAt: '2026-10-17T09:00:00Z', durationMinutes: 180 })).toBe('10월 17일 (토) 오후 6:00 – 9시');
});
it('자정을 넘기는 종료는 다음 날이라고 구분한다', () => {
  expect(koreanMeetupWhen({ meetAt: '2026-10-17T14:00:00Z', durationMinutes: 120 })).toBe('10월 17일 (토) 오후 11:00 – 다음 날 오전 1시');
});
it('종료를 정하지 않으면 시작 시각만 표시한다', () => {
  expect(koreanMeetupWhen({ meetAt: '2026-10-17T09:00:00Z', durationMinutes: null })).toBe('10월 17일 (토) 오후 6:00');
});
