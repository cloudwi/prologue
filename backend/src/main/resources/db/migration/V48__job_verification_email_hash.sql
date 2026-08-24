-- 직장 인증 이메일 재사용 방지 — 한 이메일 = 한 계정.
--
-- 이메일 원문은 여전히 저장하지 않는다. HMAC 해시만 남겨 "이 이메일로 이미 인증한 계정이
-- 있는가"를 대조한다 — 회사 메일을 빌려 여러 계정이 배지를 다는 것을 막는다.
-- 기존 행은 null로 남는다(포스트그레스 unique 인덱스는 null을 여러 개 허용한다) —
-- 다음 재인증 때 채워진다.
alter table job_verifications
    add column email_hash varchar(64);

create unique index uq_job_verifications_email_hash on job_verifications (email_hash);
