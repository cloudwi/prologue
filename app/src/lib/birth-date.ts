/** 생년월일 입력(YYYYMMDD 숫자 8자리) 파싱·표시 유틸. 온보딩/MY 편집에서 공유. */

const MIN_YEAR = 1920;

/** 숫자만 남기고 8자리로 자른다. */
export function sanitizeBirthDigits(text: string): string {
  return text.replace(/[^0-9]/g, '').slice(0, 8);
}

/** "19990514" → "1999.05.14" (입력 중간 단계도 자연스럽게: "199905" → "1999.05"). */
export function formatBirthDigits(digits: string): string {
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  return [y, m, d].filter((part) => part.length > 0).join('.');
}

/** ISO("1999-05-14") → 입력 숫자("19990514"). 서버 프로필을 편집 폼에 넣을 때 사용. */
export function isoToBirthDigits(iso: string): string {
  return iso.replace(/-/g, '');
}

/**
 * 8자리 입력을 검증해 ISO 문자열로. 실존하지 않는 날짜(2월 30일 등)·미래·1920년 이전은 null.
 */
export function parseBirthDigits(digits: string): string | null {
  if (!/^\d{8}$/.test(digits)) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(year, month - 1, day);
  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!valid || year < MIN_YEAR || date.getTime() > Date.now()) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/** 만 나이. 생일이 안 지났으면 한 살 적게. */
export function koreanManAge(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const birthdayPassed =
    today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!birthdayPassed) age -= 1;
  return age;
}
