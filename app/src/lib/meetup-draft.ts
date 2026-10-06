import type { HostMeetup, Meetup, SimpleMeetupInput } from './meetups';

export type MeetupDraft = {
  title: string;
  date: string;
  time: string;
  endTime: string;
  place: string;
  capacity: string;
  description: string;
  placeAddress: string;
  fee: string;
  kakaoLink: string;
  photos: string[];
};

/** 모임 시각 입력·미리보기는 기기 시간대와 무관하게 한국 시각으로 통일한다. */
export function koreanDateParts(instant: string): { date: string; time: string } {
  const d = new Date(new Date(instant).getTime() + 9 * 60 * 60 * 1000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

export function meetupDraft(m?: HostMeetup): MeetupDraft {
  const parts = m ? koreanDateParts(m.meetAt) : { date: '', time: '18:00' };
  const endTime = m?.durationMinutes ? koreanDateParts(new Date(new Date(m.meetAt).getTime() + m.durationMinutes * 60000).toISOString()).time : '';
  return {
    title: m?.title ?? '', ...parts, endTime, place: m?.place ?? '', capacity: String(m?.capacity ?? 8),
    description: m?.description ?? '', placeAddress: m?.placeAddress ?? '', fee: String(m?.fee ?? 0),
    kakaoLink: m?.kakaoLink ?? '', photos: m?.coverUrls ?? [],
  };
}

/** 검증만 한다. 미리보기까지는 DB에도 이미지 저장소에도 쓰지 않는다. */
export function draftInput(d: MeetupDraft, now = Date.now()): SimpleMeetupInput {
  const title = d.title.trim();
  const place = d.place.trim();
  if (!title || title.length > 80) throw new Error('모임 이름을 80자 이내로 적어주세요.');
  if (!place || place.length > 120) throw new Error('만날 장소를 120자 이내로 적어주세요.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) throw new Error('날짜와 시작 시간을 골라주세요.');
  const instant = new Date(`${d.date}T${d.time}:00+09:00`);
  if (!Number.isFinite(instant.getTime()) || koreanDateParts(instant.toISOString()).date !== d.date) throw new Error('날짜를 확인해주세요.');
  if (instant.getTime() <= now) throw new Error('앞으로 만날 날짜와 시간을 골라주세요.');
  const capacity = integer(d.capacity, 2, 100, '정원은 2~100명으로 적어주세요.');
  const fee = integer(d.fee.trim() || '0', 0, 2147483647, '참가비는 0원 이상의 정수로 적어주세요.');
  if (d.description.trim().length > 1000) throw new Error('소개는 1,000자 이내로 적어주세요.');
  if (d.placeAddress.trim().length > 200) throw new Error('주소는 200자 이내로 적어주세요.');
  const link = d.kakaoLink.trim();
  if (link && (!link.startsWith('https://') || link.length > 300)) throw new Error('연락 링크는 https://로 시작하는 주소를 넣어주세요.');
  let durationMinutes: number | null = null;
  if (d.endTime) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.endTime)) throw new Error('끝나는 시간을 확인해주세요.');
    const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
    durationMinutes = (minutes(d.endTime) - minutes(d.time) + 1440) % 1440;
    if (durationMinutes < 30 || durationMinutes > 720) throw new Error('모임 시간은 30분~12시간으로 정해주세요.');
  }
  if (d.photos.length > 3) throw new Error('표지 사진은 3장까지 올릴 수 있어요.');
  return { title, meetAt: instant.toISOString(), place, capacity, fee, durationMinutes,
    description: d.description.trim() || null, placeAddress: d.placeAddress.trim() || null,
    kakaoLink: link, coverUrls: d.photos };
}

function integer(raw: string, min: number, max: number, error: string): number {
  const value = Number(raw);
  if (!/^\d+$/.test(raw.trim()) || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(error);
  return value;
}

export function draftPreview(input: SimpleMeetupInput, existing?: HostMeetup): Meetup {
  return {
    ...(existing ?? {}), meetupId: existing?.meetupId ?? 'preview', title: input.title, description: input.description ?? null,
    meetAt: input.meetAt, durationMinutes: input.durationMinutes, place: input.place, placeAddress: input.placeAddress ?? null,
    placeUrl: existing?.placeUrl ?? null, capacity: input.capacity, fee: input.fee ?? 0, feeFemale: existing?.feeFemale ?? null,
    genderLimit: existing?.genderLimit ?? null, minAgeMale: existing?.minAgeMale ?? null, maxAgeMale: existing?.maxAgeMale ?? null,
    minAgeFemale: existing?.minAgeFemale ?? null, maxAgeFemale: existing?.maxAgeFemale ?? null,
    minHeightMaleCm: existing?.minHeightMaleCm ?? null, minHeightFemaleCm: existing?.minHeightFemaleCm ?? null,
    requireJobVerified: existing?.requireJobVerified ?? false, emoji: existing?.emoji ?? null, color: existing?.color ?? null,
    coverUrls: input.coverUrls ?? [], bodyImageUrls: existing?.bodyImageUrls ?? [], status: 'PENDING',
    hostNickname: '나', hostDoneCount: 0, confirmedCount: existing?.confirmedCount ?? 0,
    myStatus: null, kakaoLink: null, participants: [], hostAccountId: '', isMine: true,
  };
}
