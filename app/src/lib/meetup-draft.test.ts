import { draftInput, draftPreview, koreanDateParts, meetupDraft, type MeetupDraft } from './meetup-draft';

const now = Date.parse('2026-10-06T00:00:00Z');
const basic = (): MeetupDraft => ({ ...meetupDraft(), title: '과자 모임', date: '2026-10-17', time: '18:00', place: '서로서가' });

it('필수 정보만으로 무료 모임을 작성하고 선택값은 비워둔다', () => {
  expect(draftInput(basic(), now)).toEqual({ title: '과자 모임', meetAt: '2026-10-17T09:00:00.000Z', place: '서로서가', capacity: 8, fee: 0, description: null, placeAddress: null, durationMinutes: null, kakaoLink: '', coverUrls: [] });
});
it('한국 시각을 UTC와 정확하게 왕복한다', () => {
  expect(koreanDateParts('2026-10-17T15:30:00Z')).toEqual({ date: '2026-10-18', time: '00:30' });
});
it('밤을 넘기는 종료 시각도 소요 시간 하나로 저장한다', () => {
  expect(draftInput({ ...basic(), time: '23:00', endTime: '01:00' }, now).durationMinutes).toBe(120);
});
it.each([{ title: '' }, { date: '2026-02-30' }, { date: '2026-01-01' }, { capacity: '1' }, { capacity: '2.5' }, { fee: '-1' }, { time: '25:00' }, { endTime: '18:00' }, { endTime: '18:15' }, { kakaoLink: 'http://example.com' }])('잘못된 입력은 저장 전에 알려준다: %j', (over) => {
  expect(() => draftInput({ ...basic(), ...over }, now)).toThrow();
});
it('미리보기는 아직 업로드하지 않은 로컬 사진도 그대로 보여준다', () => {
  const preview = draftPreview(draftInput({ ...basic(), photos: ['file:///photo.jpg'] }, now));
  expect(preview.coverUrls).toEqual(['file:///photo.jpg']);
  expect(preview.status).toBe('PENDING');
  expect(preview.description).toBeNull();
});
