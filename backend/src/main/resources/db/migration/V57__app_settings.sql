-- 운영 중에 바뀌는 설정 — 배포도, 재시작도 없이.
--
-- 지금까지 최소 지원 버전은 환경변수였다. 그런데 이건 **사람을 앱에서 잠그는 스위치**다.
-- 잘못 걸면 그 순간부터 아무도 앱을 못 연다. 그런 값을 되돌리는 데 서비스 재시작을
-- 기다려야 한다는 게 문제였다 — Render는 환경변수를 바꾸면 서비스를 다시 띄운다.
--
-- 키-값 한 장으로 둔다. 설정이 늘 때마다 칸을 더하는 대신 줄을 더하면 되고,
-- 무엇이 켜져 있는지 한 번의 조회로 다 읽힌다.
--
-- **여기 없는 키는 없는 것이 아니라 '기본값'이다.** 읽는 쪽은 행이 없거나 DB가 흔들리면
-- application.yaml의 값으로 물러선다(fail-open). 설정 테이블 하나가 앱 전체를 세우는 일은
-- 없어야 한다.
create table if not exists app_settings (
    key        varchar(64) primary key,
    value      text        not null,
    updated_at timestamptz not null default now()
);

comment on table app_settings is '운영 중 바뀌는 설정. 행이 없으면 application.yaml의 기본값을 쓴다';
comment on column app_settings.key is 'min-supported-version | latest-version';
