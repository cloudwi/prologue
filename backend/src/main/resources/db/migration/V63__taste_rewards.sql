-- 취향 카드 이정표로 얻은 추가 소개권.
--
-- 카드를 정해진 장수만큼 넘기면 오늘의 상대가 한 명 더 온다(10·30·60·100장, 계정당 한 번씩).
-- 처음엔 잉크로 줬다가 사람으로 바꿨다 — 이 앱에서 보상은 재화가 아니라 사람이어야 한다.
-- 잉크로 주면 카드가 재화를 캐는 자리가 되고, 값싼 잉크가 글의 값어치까지 끌어내린다.
--
-- 표를 따로 두는 이유: 이정표는 한 번뿐인데 그 한 번이 실제 소개로 이어졌는지는 그때 후보가
-- 있느냐에 달려 있다. 후보가 없어 빈손이면 granted_at이 null인 채로 남아 있다가 다음에
-- 앱을 열 때 쓰인다 — 보상을 약속해 놓고 후보가 없다는 이유로 없던 일로 만들 수는 없다.
create table taste_rewards (
    account_id uuid        not null,
    milestone  int         not null,
    created_at timestamptz not null default now(),
    granted_at timestamptz,
    primary key (account_id, milestone)
);

comment on column taste_rewards.granted_at is '소개로 바뀐 시각. null이면 아직 쓰이지 않은 표';
