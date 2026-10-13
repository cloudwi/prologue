import { Platform } from 'react-native';
import { clearMeetupDraft, loadMeetupDraft, saveMeetupDraft } from './meetup-draft-storage';
import { meetupDraft } from './meetup-draft';

const mockFiles = new Map<string, string>();
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents' },
  File: jest.fn().mockImplementation((_root: string, name: string) => ({
    get exists() { return mockFiles.has(name); },
    create: () => mockFiles.set(name, ''),
    textSync: () => mockFiles.get(name),
    write: (value: string) => mockFiles.set(name, value),
    delete: () => mockFiles.delete(name),
  })),
}));
const mockWeb = new Map<string, string>();
beforeEach(() => {
  mockFiles.clear(); mockWeb.clear();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => mockWeb.get(key) ?? null,
    setItem: (key: string, value: string) => mockWeb.set(key, value),
    removeItem: (key: string) => mockWeb.delete(key),
  } });
});
afterEach(() => jest.restoreAllMocks());

it.each(['ios', 'web'] as const)('%s에서 초안은 계정·모임별로 분리되고 제출 후 지워진다', (platform) => {
  jest.replaceProperty(Platform, 'OS', platform);
  const draft = { ...meetupDraft(), title: '이어 쓰는 모임', photos: ['file:///snack.jpg'] };
  saveMeetupDraft('account-a', draft);
  expect(loadMeetupDraft('account-a')).toEqual(draft);
  expect(loadMeetupDraft('account-b')).toBeNull();
  expect(loadMeetupDraft('account-a', 'other-meetup')).toBeNull();
  clearMeetupDraft('account-a');
  expect(loadMeetupDraft('account-a')).toBeNull();
});

it('깨진 초안은 폼에 섞지 않는다', () => {
  saveMeetupDraft('account-a', { ...meetupDraft(), photos: [5 as unknown as string] });
  expect(loadMeetupDraft('account-a')).toBeNull();
});
