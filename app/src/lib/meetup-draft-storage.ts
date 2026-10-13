import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { meetupDraft, type MeetupDraft } from './meetup-draft';

// 계정과 모임별로 분리한다. 서버에 초안/사진을 올리지 않고, 제출 후에는 지운다.
function key(accountId: string, meetupId?: string) {
  return `prologue.meetupDraft.${encodeURIComponent(accountId)}.${encodeURIComponent(meetupId ?? 'new')}`;
}
function file(accountId: string, meetupId?: string) {
  return new File(Paths.document, `${key(accountId, meetupId)}.json`);
}

export function loadMeetupDraft(accountId: string, meetupId?: string): MeetupDraft | null {
  const stored = Platform.OS === 'web'
    ? localStorage.getItem(key(accountId, meetupId))
    : (() => { const f = file(accountId, meetupId); return f.exists ? f.textSync() : null; })();
  if (!stored) return null;
  try {
    const draft: unknown = JSON.parse(stored);
    if (!draft || typeof draft !== 'object') return null;
    const fields = draft as Record<string, unknown>;
    if (!Object.keys(meetupDraft()).every((field) => field === 'photos'
      ? Array.isArray(fields.photos) && fields.photos.length <= 3 && fields.photos.every((p: unknown) => typeof p === 'string')
      : typeof fields[field] === 'string')) return null;
    return fields as MeetupDraft;
  } catch { return null; }
}

export function saveMeetupDraft(accountId: string, draft: MeetupDraft, meetupId?: string): void {
  const value = JSON.stringify(draft);
  if (Platform.OS === 'web') { localStorage.setItem(key(accountId, meetupId), value); return; }
  const f = file(accountId, meetupId);
  if (!f.exists) f.create();
  f.write(value);
}

export function clearMeetupDraft(accountId: string, meetupId?: string): void {
  if (Platform.OS === 'web') { localStorage.removeItem(key(accountId, meetupId)); return; }
  const f = file(accountId, meetupId);
  if (f.exists) f.delete();
}
