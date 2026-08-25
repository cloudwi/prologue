import type { Meetup } from './meetups';

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
  const detail = m.place.startsWith(m.placeAddress) ? m.place.slice(m.placeAddress.length).replace(/^ · /, '') : '';
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

export function timeLabel(d: Date): string {
  return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(d);
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
