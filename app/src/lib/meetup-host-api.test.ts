import { authedRequest } from './api';
import { getHostMeetups, manageApplication, manageMeetup, saveMeetup, uploadMeetupCover } from './meetups';
import { uploadImage } from './photo';

jest.mock('./api', () => ({ authedRequest: jest.fn() }));
jest.mock('./photo', () => ({ uploadImage: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
const input = { title: '과자 모임', meetAt: '2030-10-17T09:00:00Z', place: '서로서가', capacity: 8 };

it('짧은 폼은 전용 개설 API만 호출한다', async () => {
  jest.mocked(authedRequest).mockResolvedValue({ meetupId: 'new-id' });
  await expect(saveMeetup(input)).resolves.toBe('new-id');
  expect(authedRequest).toHaveBeenCalledWith('POST', '/meetups/simple', input);
});
it('기존 모임 수정은 새 모임을 만들지 않는다', async () => {
  await expect(saveMeetup(input, 'old-id')).resolves.toBe('old-id');
  expect(authedRequest).toHaveBeenCalledWith('PUT', '/meetups/old-id/simple', input);
});
it('관리 목록과 확정·취소는 인증된 API로만 보낸다', async () => {
  await getHostMeetups(); await manageApplication('app-id', 'confirm'); await manageMeetup('m-id', 'cancel');
  expect(authedRequest).toHaveBeenCalledWith('GET', '/meetups/mine');
  expect(authedRequest).toHaveBeenCalledWith('POST', '/meetups/applications/app-id/confirm');
  expect(authedRequest).toHaveBeenCalledWith('POST', '/meetups/m-id/hosting/cancel');
});
it('모임 사진에도 기존의 축소·재인코딩 경로를 쓴다', async () => {
  jest.mocked(uploadImage).mockResolvedValue({ url: 'https://cdn/photo.jpg' });
  await expect(uploadMeetupCover('file:///photo.jpg')).resolves.toBe('https://cdn/photo.jpg');
  expect(uploadImage).toHaveBeenCalledWith('file:///photo.jpg', '/meetups/cover');
});
