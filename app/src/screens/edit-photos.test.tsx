import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EditPhotosScreen from '../app/my/edit-photos';
import { getMyProfile } from '../lib/member';
import { deletePhoto, uploadPhoto } from '../lib/photo';
import { MIN_PHOTOS, pickPhotos } from '../components/photo-grid';

jest.mock('../global.css', () => ({}));
jest.mock('../hooks/use-theme', () => ({ useTheme: () => ({ text: '#111', textSecondary: '#555' }) }));
jest.mock('../lib/member', () => ({ getMyProfile: jest.fn() }));
jest.mock('../lib/photo', () => ({ deletePhoto: jest.fn(), uploadPhoto: jest.fn() }));
jest.mock('../components/sub-screen', () => ({
  SubScreen: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../components/photo-grid', () => {
  const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ...jest.requireActual('../components/photo-grid'),
    pickPhotos: jest.fn(),
    PhotoGrid: ({ photos, onAdd, onRemove }: { photos: string[]; onAdd: () => void; onRemove: (url: string) => void }) => (
      <View>
        <Pressable onPress={onAdd}><Text>사진 추가</Text></Pressable>
        {photos.map((url) => <Pressable key={url} onPress={() => onRemove(url)}><Text>{url} 삭제</Text></Pressable>)}
      </View>
    ),
  };
});
jest.mock('../components/photo-crop', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PhotoCropModal: ({ onDone }: { onDone: (uri: string) => void }) => (
      <Pressable onPress={() => onDone('file:///cropped.jpg')}><Text>자르기 완료</Text></Pressable>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getMyProfile).mockResolvedValue({ photoUrls: ['a.jpg'] } as NonNullable<Awaited<ReturnType<typeof getMyProfile>>>);
});
afterEach(() => jest.restoreAllMocks());

it('한 장이면 추가 사진을 요구하지 않고 마지막 한 장 삭제만 안내한다', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  expect(MIN_PHOTOS).toBe(1);
  await render(<EditPhotosScreen />);
  await screen.findByText('1장 / 최대 6장');
  await fireEvent.press(screen.getByText('a.jpg 삭제'));

  expect(alert).toHaveBeenCalledWith('사진은 1장 이상 유지해야 해요', expect.any(String));
  expect(deletePhoto).not.toHaveBeenCalled();
});

it('두 장 중 한 장은 삭제하고 한 장으로 계속 사용할 수 있다', async () => {
  jest.mocked(getMyProfile).mockResolvedValue({ photoUrls: ['a.jpg', 'b.jpg'] } as NonNullable<Awaited<ReturnType<typeof getMyProfile>>>);
  jest.mocked(deletePhoto).mockResolvedValue({ photoUrls: ['a.jpg'] });
  await render(<EditPhotosScreen />);
  await fireEvent.press(await screen.findByText('b.jpg 삭제'));

  await screen.findByText('1장 / 최대 6장');
  expect(deletePhoto).toHaveBeenCalledWith('b.jpg');
});

it('등록 성공 안내는 팝업 없이 보여주고 새 사진을 유지한다', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(pickPhotos).mockResolvedValue(['file:///picked.jpg']);
  jest.mocked(uploadPhoto).mockResolvedValue({ photoUrls: ['a.jpg', 'b.jpg'], photoNotice: '그대로 사용할 수 있어요' });
  await render(<EditPhotosScreen />);
  await fireEvent.press(await screen.findByText('사진 추가'));
  await fireEvent.press(await screen.findByText('자르기 완료'));

  await screen.findByText('그대로 사용할 수 있어요');
  await waitFor(() => expect(screen.getByText('b.jpg 삭제')).toBeTruthy());
  expect(alert).not.toHaveBeenCalled();
});
