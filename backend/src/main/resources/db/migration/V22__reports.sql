-- 신고 — 사용자 콘텐츠(답변·편지·프로필) 검토 요청. 앱스토어 UGC 요건(1.2).
-- 계정 FK를 걸지 않는다: 신고당한 쪽이 탈퇴해도 검토 기록은 남아야 한다.
create table reports (
    id                  uuid          primary key,
    reporter_account_id uuid          not null,
    reported_account_id uuid          not null,
    context             varchar(10)   not null, -- ANSWER | MAIL
    reason              varchar(20)   not null, -- SPAM | ABUSE | SEXUAL | FAKE | OTHER
    -- 신고 시점의 콘텐츠 사본 — 원본이 지워지거나 작성자가 탈퇴해도 검토할 수 있게
    snapshot            varchar(1000),
    created_at          timestamptz   not null
);
create index idx_reports_created on reports (created_at desc);
