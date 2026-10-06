-- 앱 개설: 제목·시각·장소·정원만 필수. 연락 링크가 없으면 빈 문자열 대신 NULL.
-- 기존 조건·사진·신청·회차는 삭제하지 않는다. 구버전 API도 계속 읽을 수 있다.
alter table meetups alter column kakao_link drop not null;
update meetups set kakao_link = null where btrim(kakao_link) = '';

-- 호스트 목록은 호스트별 최신순. 단일 호스트 인덱스의 역할까지 포함한다.
create index idx_meetups_host_created on meetups (host_account_id, created_at desc) include (status);
drop index idx_meetups_host;
create index idx_meetups_done_at on meetups (meet_at desc) where status = 'DONE';

-- 관리 목록은 신청순, 인원 집계는 모임·상태로 DB에서 바로 계산한다.
create index idx_meetup_apps_meetup_created on meetup_applications (meetup_id, created_at);
create index idx_meetup_apps_meetup_status on meetup_applications (meetup_id, status);

-- 다음 회차 알림 조회는 인덱스만으로 계정을 읽을 수 있도록 한다.
create index idx_meetup_follows_series_account on meetup_follows (series_id, account_id);
drop index idx_meetup_follows_series;

-- 예전 행을 지우거나 억지로 고치지 않고, 이후 저장부터 도메인의 최소 규칙을 DB도 지킨다.
alter table meetups add constraint ck_meetups_core check (
    length(btrim(title)) > 0 and length(btrim(place)) > 0 and capacity between 2 and 100 and fee >= 0
) not valid;
alter table meetup_applications add constraint ck_meetup_application_status check (
    status in ('APPLIED', 'CONFIRMED', 'DECLINED', 'CANCELED')
) not valid;
