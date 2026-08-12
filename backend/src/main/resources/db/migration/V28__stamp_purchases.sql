-- 우표 충전(인앱결제) 기록.
--
-- 돈이 오가는 지점이라 두 가지를 지킨다.
--   1) 지급의 근거는 스토어가 확인해 준 거래뿐이다. 클라이언트가 "샀다"고 말하는 것만으로는 주지 않는다.
--   2) 한 거래로는 한 번만 지급한다. 아래 유니크 인덱스가 그 자물쇠다 —
--      네트워크가 끊겨 앱이 재시도하든, 누가 같은 영수증을 다시 보내든 두 번째부터는 막힌다.
create table stamp_purchases (
    id             uuid         primary key,
    account_id     uuid         not null,
    platform       varchar(10)  not null, -- IOS | ANDROID
    product_id     varchar(60)  not null, -- 스토어에 등록한 상품 id
    -- 스토어가 부여한 거래 식별자. 안드로이드는 purchase token, iOS는 transaction id.
    transaction_id varchar(255) not null,
    stamps         int          not null, -- 이 결제로 지급한 우표 수
    created_at     timestamptz  not null
);

create unique index ux_stamp_purchases_txn on stamp_purchases (platform, transaction_id);
create index idx_stamp_purchases_account on stamp_purchases (account_id, created_at desc);
