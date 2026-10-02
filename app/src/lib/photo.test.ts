import { Platform } from 'react-native';
import { ImageManipulator } from 'expo-image-manipulator';
import { authedFetch } from './api';
import { deletePhoto, uploadPhoto } from './photo';

jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  authedFetch: jest.fn(),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation(() => ({})) }));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

beforeEach(() => {
  jest.clearAllMocks();
  // 재인코딩이 안 돼도 원본을 보내는 기존 경로를 사용한다. 실제 파일·통신은 필요 없다.
  jest.mocked(ImageManipulator.manipulate).mockImplementation(() => { throw new Error('unavailable'); });
  jest.spyOn(FormData.prototype, 'append').mockImplementation(() => {});
  jest.replaceProperty(Platform, 'OS', 'android');
});

afterEach(() => jest.restoreAllMocks());

it('사진 등록 성공 안내를 보존하고 업로드 실패로 취급하지 않는다', async () => {
  const result = { photoUrls: ['https://cdn/photo.jpg'], photoNotice: '그대로 사용할 수 있어요' };
  jest.mocked(authedFetch).mockResolvedValue({ ok: true, json: async () => result } as Response);

  await expect(uploadPhoto('file:///photo.jpg')).resolves.toEqual(result);
  expect(authedFetch).toHaveBeenCalledWith('/members/me/photos', expect.objectContaining({ method: 'POST' }));
});

it('안내 필드가 없는 기존 서버 응답도 받는다', async () => {
  const result = { photoUrls: ['https://cdn/photo.jpg'] };
  jest.mocked(authedFetch).mockResolvedValue({ ok: true, json: async () => result } as Response);

  await expect(uploadPhoto('file:///photo.jpg')).resolves.toEqual(result);
});

it('부적절 사진 거절은 성공 안내와 구분한다', async () => {
  jest.mocked(authedFetch).mockResolvedValue({
    ok: false, status: 422, json: async () => ({ code: 'PHOTO_REJECTED', message: '부적절한 사진' }),
  } as Response);

  await expect(uploadPhoto('file:///photo.jpg')).rejects.toMatchObject({ status: 422, code: 'PHOTO_REJECTED' });
});

it('사진 삭제는 성공한 최신 사진 목록을 반환한다', async () => {
  const result = { photoUrls: ['https://cdn/photo.jpg'], photoNotice: null };
  jest.mocked(authedFetch).mockResolvedValue({ ok: true, json: async () => result } as Response);

  await expect(deletePhoto('https://cdn/old.jpg')).resolves.toEqual(result);
});
