-- 종교·정치 성향 — 민감정보(개인정보보호법 23조: 사상·신념, 정치적 견해, 종교적 신념).
--
-- 소개팅에서 이 둘은 실제로 만남을 가르는 조건이라 묻지 않으면 프로필이 반쪽이 된다.
-- 다만 법이 따로 다루는 정보라 세 가지를 지킨다.
--   ① 전부 선택 — 안 적으면 null이고 프로필에서 아예 보이지 않는다("무응답"조차 쓰지 않는다).
--   ② 적을 때 별도 동의 — 가입 때 받은 민감정보 동의(선호 성별)와 같은 조항이지만 다른 항목이라
--      갈음하지 않는다(22조: 동의는 항목별로). member_consents.beliefs가 그 기록이다.
--   ③ 지울 때는 안 묻는다 — 삭제·처리정지는 권리지 거래가 아니다.
--
-- 수정 경로도 프로필과 분리했다(PUT /members/me/beliefs). 프로필 저장은 전체 덮어쓰기라
-- 이 항목을 모르는 옛 앱이 저장 한 번으로 조용히 지워버리기 때문이다.
alter table members
    add column religion          varchar(20),
    add column political_leaning varchar(20);

comment on column members.religion is '민감정보(23조). NONE(무교)은 답이고, null은 밝히지 않음이다';
comment on column members.political_leaning is '민감정보(23조). 진보~보수 5단 + 관심 없음, null은 밝히지 않음';

-- 기존 행은 false — 아직 아무도 이 항목에 동의한 적이 없다. 기록은 고치지 않고 쌓기만 하므로
-- (append-only) 이 열이 false인 줄은 "철회"가 아니라 "그때 새로 동의한 항목이 아님"을 뜻한다.
alter table member_consents
    add column beliefs boolean not null default false;

comment on column member_consents.beliefs is '신념(종교·정치 성향) 수집 동의. 프로필에 처음 적을 때 새 줄로 쌓인다';
