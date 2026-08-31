import { conditionLabel, feeLabel, type Meetup } from './meetups';

/**
 * 모임을 글자로 옮기는 규칙 — 초대장이 읽는 순수 함수들.
 *
 * 컴포넌트 안에 있던 것을 여기로 옮겼다(2026-08-25). 화면과 상관없는 계산이고,
 * 무엇보다 **경우의 수가 많아 눈으로는 못 미더운** 것들이라 테스트가 필요했다 —
 * 날짜 경계, 주소 꼴, 지난 모임 표기 같은 것들이 그렇다.
 */

/** 요일 이름 — Date.getDay()의 순서(일=0)를 그대로 따른다. */
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 장소 이름과 주소를 가른다 — place는 "주소 · 상세" 꼴로 저장된다. */
export function venueOf(m: Pick<Meetup, 'place' | 'placeAddress'>): { name: string | null; address: string | null } {
  if (!m.placeAddress) return { name: m.place, address: null };
  /*
   * 주소가 앞에 붙지 않은 채로 저장된 모임도 있다 — 콘솔은 상세만 place에 넣고 주소를
   * 따로 보낸다. 그때 이름을 빈 문자열로 떨어뜨리면 '오시는 길'에 주소만 남고 가게 이름이
   * 사라진다. 앞에 붙어 있으면 떼고, 아니면 place가 통째로 상세다(서버의 placeName과 같은 규칙).
   */
  const detail = m.place.startsWith(m.placeAddress)
    ? m.place.slice(m.placeAddress.length).replace(/^ · /, '')
    : m.place;
  return { name: detail || null, address: m.placeAddress };
}

/** 지도 검색어 — 주소 끝의 "(양재동)" 같은 동 표기는 지도 검색을 흐리므로 떼고 보낸다. */
export function mapQuery(address: string): string {
  return address.replace(/\s*\([^)]*\)\s*$/, '');
}

/** "2026. 09. 26" — 청첩장의 날짜는 글보다 숫자가 먼저다. 두 자리로 맞춰 자간이 고르게. */
export function numeralDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}. ${mm}. ${dd}`;
}

export function weekdayLabel(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}요일`;
}

/**
 * "오후 7:00" — 12시간제에 오전/오후.
 *
 * Intl에 맡기지 않는다. 같은 'ko-KR'을 줘도 실행 환경의 ICU에 따라 "오후 7:00"이 되기도
 * "PM 7:00"이 되기도 한다 — CI의 Node가 그랬다. 이 문자열은 초대 문구로 그대로 나가는데,
 * 한국어 문장 한가운데 PM이 끼면 만든 사람이 성의 없어 보인다.
 *
 * 이 파일의 날짜·요일이 이미 손으로 조판돼 있는 이유와 같다. 시각만 예외였다.
 */
export function timeLabel(d: Date): string {
  const hours = d.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours < 12 ? '오전' : '오후'} ${hour12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * "오후 6:00 – 8시" — 끝나는 시각까지 붙인 판.
 *
 * 처음 가는 자리에서 가장 먼저 계산하는 것이 "몇 시에 끝나지"다. 정하지 않은 모임은
 * 지금까지처럼 시작 시각만 말한다.
 *
 * 오전/오후는 **넘어갈 때만** 다시 적는다. 매번 적으면 같은 말이 두 번이고,
 * 한 번도 안 적으면 밤 11시에 시작한 모임이 11시에 끝난 것처럼 읽힌다.
 * 날짜를 넘기면 그것도 말한다 — 다음 날 새벽 한 시는 오늘 한 시가 아니다.
 *
 * 서버(MeetupInvitationPage.whenLine)·콘솔 미리보기와 같은 규칙이다.
 * 한쪽만 고치면 초대장이 두 얼굴이 된다.
 */
export function timeRangeLabel(start: Date, durationMinutes?: number | null): string {
  const head = timeLabel(start);
  if (!durationMinutes) return head;
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const crossedDay = end.toDateString() !== start.toDateString();
  const sameHalf = !crossedDay && (start.getHours() < 12) === (end.getHours() < 12);
  const hours = end.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minute = end.getMinutes() === 0 ? '' : `:${String(end.getMinutes()).padStart(2, '0')}`;
  const ampm = hours < 12 ? '오전' : '오후';
  const prefix = crossedDay ? `다음 날 ${ampm} ` : sameHalf ? '' : `${ampm} `;
  return `${head} – ${prefix}${hour12}${minute}시`;
}

/**
 * 며칠 남았는지 — 청첩장의 "결혼식이 N일 남았습니다" 줄.
 *
 * 시각이 아니라 **날짜**로 센다. 오늘 밤 11시에 열리는 모임도 "오늘"이고,
 * 내일 새벽 1시 모임은 "1일 남음"이다 — 사람이 세는 방식과 맞춘다.
 * [now]를 받는 이유는 테스트에서 오늘을 고정하기 위해서다.
 */
export function ddayLabel(d: Date, now: Date = new Date()): string {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((b - a) / 86_400_000);
  if (diff === 0) return '오늘 열리는 모임이에요';
  if (diff > 0) return `모임까지 ${diff}일 남았어요`;
  return `${-diff}일 전에 열린 모임이에요`;
}

// ── 전하기 ──

/**
 * 초대장 주소 — 백엔드가 모임마다 OG 태그를 붙여 내려주는 페이지(`/m/{id}`).
 *
 * 웹(prologue.day)은 정적 사이트라 유저가 만든 모임의 미리보기를 미리 구워둘 수 없다.
 * 그래서 이 경로만 백엔드로 넘겨 받는다(render.yaml의 rewrite). 앱 바이너리에는 이 주소가
 * 박히므로, 어디서 그리든 **주소는 prologue.day로 고정**한다 — 옮길 일이 생겨도 앱을 다시 내지 않게.
 */
const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://prologue.day';

export function meetupShareUrl(meetupId: string): string {
  return `${WEB_BASE}/m/${meetupId}`;
}

/**
 * 카카오톡에 붙는 초대 글 — 링크 미리보기가 안 뜨는 곳에서도 이 글만으로 모임이 서게.
 *
 * 초대장 화면이 보여주는 순서(제목·회차 → 날짜 → 장소 → 참가비·조건 → 남은 자리)를 그대로 따른다.
 * 없는 값은 줄을 아예 지운다 — 빈 칸이 있는 초대장은 성의 없어 보인다.
 */
export function meetupShareText(m: Meetup, now: Date = new Date()): string {
  const meetAt = new Date(m.meetAt);
  const venue = venueOf(m);
  const remaining = Math.max(0, m.capacity - m.confirmedCount);

  const head = [`${m.title} — 프롤로그 초대장`];
  if ((m.occurrenceTotal ?? 1) > 1) head.push(`${m.occurrence ?? 1}번째 만남`);

  const body = [
    `${numeralDate(meetAt)} (${WEEKDAYS[meetAt.getDay()]}) ${timeRangeLabel(meetAt, m.durationMinutes)}`,
    [venue.name, venue.address].filter(Boolean).join(' · ') || null,
    feeLabel(m),
    conditionLabel(m),
  ].filter((line): line is string => line != null);

  const tail = [
    meetAt.getTime() < now.getTime()
      ? '이미 지난 모임이에요.'
      : m.status !== 'OPEN'
        ? '모집이 마감됐어요.'
        : remaining > 0
          ? `자리가 ${remaining}개 남았어요.`
          : '자리가 다 찼어요.',
    meetupShareUrl(m.meetupId),
  ];

  return [head.join('\n'), body.join('\n'), tail.join('\n')].join('\n\n');
}
