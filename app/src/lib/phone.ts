/** 휴대폰 번호 입력 헬퍼 — 저장은 숫자만, 표시는 하이픈. */

/** 입력에서 숫자만 남긴다(최대 11자리). */
export function sanitizePhoneDigits(text: string): string {
  return text.replace(/\D/g, '').slice(0, 11);
}

/** 010-1234-5678 형태로 표시. 입력 중간 길이도 자연스럽게 끊는다. */
export function formatPhoneDigits(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

/** 휴대폰 번호로 완결됐는지(01x + 10~11자리). */
export function isValidPhoneDigits(digits: string): boolean {
  return /^01[016789]\d{7,8}$/.test(digits);
}
