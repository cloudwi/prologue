-- 기존 회원과 기존 앱의 가입은 완료 상태를 유지한다.
-- 새 앱이 onboardingPending=true를 보낸 신규 프로필만 별도 완료 요청을 기다린다.
ALTER TABLE members ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT true;
