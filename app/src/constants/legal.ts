/**
 * 약관 버전 — 동의 기록에 남는 값이다.
 *
 * 이용약관·개인정보처리방침 내용을 고칠 때는 이 값을 반드시 함께 올린다. 나중에 분쟁이 생겼을 때
 * "이 회원이 어느 문서에 동의했는가"를 되짚는 유일한 단서라, 문서만 바뀌고 버전이 그대로면
 * 기록이 거짓말을 하게 된다.
 *
 * 같이 고쳐야 하는 곳:
 *   - app/src/app/terms.tsx, app/src/app/privacy.tsx (앱 화면)
 *   - web/src/pages/terms.md, web/src/pages/privacy.md (웹)
 */
export const LEGAL_VERSION = '2026-08-11';

/** 화면에 보여줄 시행일. */
export const LEGAL_EFFECTIVE_DATE = '2026년 8월 11일';
