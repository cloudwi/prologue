import PostHog from 'posthog-react-native';

/**
 * 행동 이벤트 — 유저가 어디서 떠나는지를 보는 눈.
 *
 * 원칙 두 가지가 이 파일의 형태를 정한다.
 *
 * 하나, 개인정보는 싣지 않는다. 식별자는 accountId(UUID)뿐이고, 닉네임·답변 내용·상대가
 * 누구인지는 절대 밖으로 내보내지 않는다 — "프로필을 봤다"까지만 기록하고 누구를 봤는지는 없다.
 * 소개팅 앱에서 관계 그래프가 우리 DB 밖에 쌓이면 그 자체가 유출 사고다.
 *
 * 둘, 이벤트 이름은 여기서만 정의한다. 화면마다 문자열을 흩뿌리면 오타 하나가
 * 퍼널 하나를 조용히 끊어놓는다 — track() 함수의 시그니처가 목록의 전부다.
 */

// PostHog 프로젝트 API 키 — 클라이언트에 실려 나가는 값이라 비밀이 아니다(Sentry DSN과 같은 성격).
const POSTHOG_API_KEY = 'phc_CjxSKkBPuG5NuKVWKYtQgu6FeAsrdgVFA8QZp4kyRzKV';
const POSTHOG_HOST = 'https://us.i.posthog.com';

/** 키가 없거나 개발 중이면 null — 어디서든 client?.capture 형태라 비활성이 무해하다. */
const client: PostHog | null =
  POSTHOG_API_KEY && !__DEV__
    ? new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST })
    : null;

/** 앱이 아는 모든 행동 이벤트. 퍼널 순서대로 — 이름을 바꾸면 대시보드가 끊긴다. */
type AnalyticsEvent =
  // 가입 퍼널
  | 'consent_viewed'        // 동의 화면 진입
  | 'consent_completed'     // 동의하고 계속하기
  | 'auth_code_requested'   // 인증코드 요청
  | 'auth_succeeded'        // 인증 성공(로그인)
  | 'onboarding_completed'  // 프로필 작성 완료
  // 코어 루프
  | 'taste_deck_opened'     // 취향 카드 더미 열기 — 백지 대신 시작하는 자리
  | 'taste_card_chosen'     // 카드 한 장 고름(noted 속성: 한 줄을 덧붙였는지 — 글로 가는 사다리)
  | 'answer_submitted'      // 오늘 질문에 답변
  | 'peer_profile_viewed'   // 상대 프로필 상세 열람
  | 'heart_sent'            // 하트 전송
  | 'mail_compose_started'  // 편지 작성 화면 진입
  | 'mail_sent'             // 편지 전송
  | 'mail_recalled'         // 편지 회수
  // 재화
  | 'profile_unlocked'      // 잉크로 프로필 다시 열기
  | 'answer_unlocked'       // 답하지 않은 날의 상대 답을 잉크로 열기
  | 'topup_viewed'          // 충전 화면 진입
  | 'topup_purchase_started' // 상품 탭(결제창 열림)
  | 'topup_purchase_completed' // 서버 지급까지 완료
  // 초대
  | 'referral_share_opened'  // 초대 공유 시트 열기
  | 'referral_redeemed'      // 친구 코드 쓰기 성공
  // 오프라인 모임
  | 'meetup_applied'         // 모임 신청
  | 'meetup_followed'        // 모임 따라가기 — 다음 회차 알림 신청(연속 참여 의사)
  | 'meetup_created'         // 모임 열기 — 유저가 모임장이 된 순간
  | 'meetup_shared'          // 초대장 전하기 — 자리를 채우는 유일한 손
  // 두 단 가입(1.3) — 모임으로 들어와 소개팅으로 넘어가는 길
  | 'guest_browsed'          // 가입 없이 모임 둘러보기 시작
  | 'guest_signup_prompted'  // 손님이 잠긴 문을 두드림(가입 유도 노출)
  | 'dating_enabled';        // 모임만 쓰던 회원이 소개팅을 켠 순간 — 이 퍼널의 결승선

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  client?.capture(event, properties);
}

/** 로그인 시 — 식별자는 accountId(UUID)만. 이메일·닉네임은 보내지 않는다. */
export function identify(accountId: string) {
  client?.identify(accountId);
}

/** 로그아웃·탈퇴 시 — 다음 사람의 행동이 이전 계정에 붙지 않게 끊는다. */
export function resetAnalytics() {
  client?.reset();
}
