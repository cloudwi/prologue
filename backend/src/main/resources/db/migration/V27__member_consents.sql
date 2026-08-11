-- 동의 기록 — 개인정보보호법 22조는 각각의 동의 사항을 구분해 받도록 하고,
-- 받았다는 사실의 입증 책임은 사업자에게 있다. 그래서 "무엇에" 동의했는지를 항목별로 남긴다.
-- 약관이 개정되면 legal_version이 다른 새 행이 쌓여 이력이 된다(갱신하지 않는다).
-- 계정 FK를 걸지 않는다: 탈퇴한 뒤에도 분쟁 대비로 남겨야 할 수 있다.
create table member_consents (
    id            uuid        primary key,
    account_id    uuid        not null,
    legal_version varchar(20) not null, -- 동의 시점의 약관 버전
    terms         boolean     not null, -- 이용약관 (필수)
    privacy       boolean     not null, -- 개인정보 수집·이용 (필수)
    age           boolean     not null, -- 만 19세 이상 (필수)
    -- 선호 성별은 성적 지향을 드러내므로 민감정보다(개인정보보호법 23조) — 별도 동의를 받는다.
    sensitive     boolean     not null, -- 민감정보 수집 (필수)
    marketing     boolean     not null, -- 마케팅 정보 수신 (선택)
    agreed_at     timestamptz not null
);
create index idx_member_consents_account on member_consents (account_id, agreed_at desc);
