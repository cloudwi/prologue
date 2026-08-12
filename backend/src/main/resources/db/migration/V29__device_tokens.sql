-- 푸시 알림을 받을 기기.
--
-- 한 계정이 여러 기기를 쓸 수 있어 계정당 여러 행이 존재한다.
-- 토큰은 기기마다 유일하므로 유니크 — 같은 기기로 다른 계정에 로그인하면 소유자가 바뀐다
-- (그래야 이전 사용자의 알림이 새 사용자에게 가지 않는다).
--
-- 알림 끄기는 별도 설정이 아니라 토큰 삭제로 표현한다. 보낼 곳이 없으면 안 가는 것이
-- 가장 확실하고, "껐는데 왔다"는 사고가 구조적으로 불가능해진다.
create table device_tokens (
    id         uuid         primary key,
    account_id uuid         not null,
    token      varchar(255) not null,
    platform   varchar(10)  not null, -- IOS | ANDROID
    created_at timestamptz  not null,
    updated_at timestamptz  not null
);

create unique index ux_device_tokens_token on device_tokens (token);
create index idx_device_tokens_account on device_tokens (account_id);
