-- 모임장 승인제 폐기 — 누구나 앱에서 모임을 연다(오픈 모임장).
-- HOST 롤과 웹 콘솔(/host)을 제거하면서, 남아 있는 롤 행도 지운다.
-- (enum에서 HOST가 사라지므로 행이 남아 있으면 계정 로딩이 깨진다.)
delete from account_roles where role = 'HOST';
