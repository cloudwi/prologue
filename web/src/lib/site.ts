// 사이트 전역 상수 — 스토어 링크·앱 식별자처럼 여러 페이지가 함께 쓰는 값.
// 스토어 URL이 바뀌면 여기만 고친다(랜딩·다운로드 페이지·구조화 데이터가 전부 이 값을 읽는다).

export const SITE_NAME = '프롤로그';
export const SITE_URL = 'https://prologue.day';
export const CONTACT_EMAIL = 'prologue.kr.team@gmail.com';

/** App Store 앱 ID — App Store Connect의 앱 번호. */
export const APPLE_APP_ID = '6803755105';
export const APP_STORE_URL = `https://apps.apple.com/kr/app/id${APPLE_APP_ID}`;

/** Google Play 패키지명 — app.json android.package. */
export const ANDROID_PACKAGE = 'day.prologue.app';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&hl=ko`;

/** 브랜드 한 줄 — 프롤로그는 새로운 시작을 알리는 서비스다. 히어로·타이틀·푸터가 같은 문장을 쓴다. */
export const TAGLINE = '새로운 시작을 알리는 소개팅';
/** 검색 결과·공유 미리보기에 쓰는 기본 문구. 앱 스토어 등록 문구(store/스토어-문구-초안.md)와 결을 맞춘다. */
export const DEFAULT_TITLE = '프롤로그 — 새로운 시작을 알리는 하루 한 문답 소개팅';
export const DEFAULT_DESCRIPTION =
  '모든 이야기의 시작에는 프롤로그가 있습니다. 질문에 답을 남기면 그 자리에서 한 사람이 도착하는 하루 한 문답 소개팅 앱. 사진보다 생각이 먼저 닿는 새로운 시작을 App Store·Google Play에서 만나보세요.';
