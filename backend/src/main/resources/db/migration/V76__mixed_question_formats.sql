-- 기존 질문·답변 기록은 남긴다. 아직 사용되지 않은 60자리만 가벼운 선택형으로 바꾼다.
alter table questions add column input_type varchar(24) not null default 'TEXT';
alter table questions add column option_a varchar(80);
alter table questions add column option_b varchar(80);
alter table questions add column option_c varchar(80);
alter table questions add column option_d varchar(80);
alter table questions add constraint ck_question_input_type check (input_type in ('TEXT','OX','SINGLE_CHOICE','MULTIPLE_CHOICE'));
alter table questions add constraint ck_question_options check (
    (input_type = 'TEXT' and option_a is null and option_b is null and option_c is null and option_d is null)
    or (input_type = 'OX' and option_a is not null and option_b is not null and option_c is null and option_d is null)
    or (input_type in ('SINGLE_CHOICE','MULTIPLE_CHOICE') and option_a is not null and option_b is not null and (option_d is null or option_c is not null))
);
alter table answers add column selected_option_ids varchar(32) not null default '';

update questions q
set content=v.content, input_type=v.input_type, option_a=v.option_a, option_b=v.option_b, option_c=v.option_c, option_d=v.option_d
from (values
    (901, '여행 갈 때 짐은 미리 챙겨두는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (902, '좋아하는 노래는 한 곡씩 반복해서 듣나요?', 'OX', '맞아요', '아니에요', null, null),
    (903, '산책하다 예쁜 가게를 보면 들어가는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (904, '데이트 메뉴는 새로운 음식에 도전하는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (905, '카페에 가면 창가 자리를 먼저 찾는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (906, '둘이 사진을 찍을 때 먼저 포즈를 제안하나요?', 'OX', '맞아요', '아니에요', null, null),
    (907, '약속이 없는 주말에는 늦잠을 즐기는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (908, '재미있는 영상을 보면 바로 공유하는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (909, '좋아하는 영화는 여러 번 다시 보는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (910, '맛있는 음식은 마지막 한 입까지 아껴두나요?', 'OX', '맞아요', '아니에요', null, null),
    (911, '비 오는 날에도 짧은 산책을 즐기는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (912, '선물을 받으면 포장도 간직해두는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (913, '둘이 게임할 때 승부에 진심인 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (914, '책을 읽다가 마음에 드는 문장을 표시하나요?', 'OX', '맞아요', '아니에요', null, null),
    (915, '처음 가는 식당에서는 추천 메뉴를 고르나요?', 'OX', '맞아요', '아니에요', null, null),
    (916, '익숙한 길보다 새로운 길로 걷는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (917, '상대가 고른 음악도 끝까지 들어보는 편인가요?', 'OX', '맞아요', '아니에요', null, null),
    (918, '함께 장을 볼 때 간식 코너부터 둘러보나요?', 'OX', '맞아요', '아니에요', null, null),
    (919, '갑자기 생긴 쉬는 시간에도 계획을 세우나요?', 'OX', '맞아요', '아니에요', null, null),
    (920, '맛있는 가게를 찾으면 다음 약속도 잡고 싶나요?', 'OX', '맞아요', '아니에요', null, null),
    (921, '첫 만남에 함께 마시고 싶은 것은 무엇인가요?', 'SINGLE_CHOICE', '커피', '차', '과일 음료', '물'),
    (922, '둘이 카페에 간다면 어디에 앉고 싶나요?', 'SINGLE_CHOICE', '창가', '야외 자리', '조용한 구석', '바 자리'),
    (923, '약속 전 시간이 남으면 무엇을 하고 싶나요?', 'SINGLE_CHOICE', '책 읽기', '동네 걷기', '음악 듣기', '그냥 쉬기'),
    (924, '함께 떠나는 하루 여행은 언제 시작하고 싶나요?', 'SINGLE_CHOICE', '이른 아침', '늦은 오전', '느긋한 오후', '그날 마음대로'),
    (925, '영화관에서 나눠 먹고 싶은 간식은 무엇인가요?', 'SINGLE_CHOICE', '팝콘', '나초', '핫도그', '음료만'),
    (926, '둘이 찍는 사진은 어떤 분위기가 좋나요?', 'SINGLE_CHOICE', '자연스럽게', '장난스럽게', '차분하게', '그날 기분대로'),
    (927, '쉬는 날 함께 먹는 첫 끼는 무엇이 좋나요?', 'SINGLE_CHOICE', '브런치', '김밥', '면 요리', '집밥'),
    (928, '같이 산책할 때 가장 편한 속도는 어느 쪽인가요?', 'SINGLE_CHOICE', '아주 느리게', '보통 걸음', '조금 빠르게', '상대에게 맞춰서'),
    (929, '마음에 드는 노래는 어떻게 소개하고 싶나요?', 'SINGLE_CHOICE', '링크 보내기', '같이 듣기', '직접 불러주기', '목록 만들어주기'),
    (930, '데이트 장소를 고를 때 무엇부터 보고 싶나요?', 'SINGLE_CHOICE', '분위기', '음식', '이동 거리', '할 수 있는 활동'),
    (931, '함께 요리한다면 어떤 역할이 가장 재미있나요?', 'SINGLE_CHOICE', '재료 준비', '직접 요리', '예쁘게 담기', '테이블 꾸미기'),
    (932, '둘이 빵집에 간다면 어떤 빵을 먼저 고르나요?', 'SINGLE_CHOICE', '담백한 빵', '달콤한 빵', '짭짤한 빵', '그날 추천 빵'),
    (933, '집에서 함께 쉬는 날 무엇을 먼저 하고 싶나요?', 'SINGLE_CHOICE', '영화 보기', '게임하기', '요리하기', '아무것도 안 하기'),
    (934, '약속 시간을 기다릴 때 어떤 연락이 좋나요?', 'SINGLE_CHOICE', '도착 시간', '가는 길 사진', '가벼운 수다', '만나서 이야기'),
    (935, '둘이 전시를 본다면 어떤 방식이 편한가요?', 'SINGLE_CHOICE', '조용히 감상', '바로 이야기', '자유롭게 관람', '설명 함께 듣기'),
    (936, '낯선 동네를 함께 걷는다면 무엇부터 찾나요?', 'SINGLE_CHOICE', '카페', '책방', '공원', '빵집'),
    (937, '야외 데이트를 한다면 어떤 날씨가 좋나요?', 'SINGLE_CHOICE', '맑고 따뜻하게', '선선하게', '조금 흐리게', '눈 내리는 날'),
    (938, '함께 고를 꽃 한 송이는 어떤 느낌이 좋나요?', 'SINGLE_CHOICE', '담백한 색', '밝은 색', '부드러운 색', '좋은 향'),
    (939, '데이트 이야기를 전할 때 무엇부터 말하나요?', 'SINGLE_CHOICE', '나눈 이야기', '먹은 음식', '장소 분위기', '재미있던 순간'),
    (940, '둘이 가벼운 운동을 한다면 무엇을 하고 싶나요?', 'SINGLE_CHOICE', '걷기', '배드민턴', '자전거', '탁구'),
    (941, '함께 산책할 때 눈길이 가는 것은 무엇인가요?', 'MULTIPLE_CHOICE', '작은 가게', '동물', '꽃과 나무', '하늘'),
    (942, '집 데이트에 꼭 챙기고 싶은 것은 무엇인가요?', 'MULTIPLE_CHOICE', '간식', '음악', '포근한 담요', '보드게임'),
    (943, '함께 가보고 싶은 작은 가게는 어떤 곳인가요?', 'MULTIPLE_CHOICE', '책방', '빵집', '꽃집', '음반 가게'),
    (944, '둘이 여행할 때 꼭 하고 싶은 것은 무엇인가요?', 'MULTIPLE_CHOICE', '지역 음식 먹기', '사진 찍기', '동네 걷기', '기념품 고르기'),
    (945, '편한 대화에 도움이 되는 것은 무엇인가요?', 'MULTIPLE_CHOICE', '눈 맞추기', '작은 유머', '잘 들어주기', '가벼운 질문'),
    (946, '함께 만들고 싶은 주말의 순간은 무엇인가요?', 'MULTIPLE_CHOICE', '아침 커피', '동네 산책', '함께 요리', '영화 한 편'),
    (947, '데이트 가방에 챙기고 싶은 것은 무엇인가요?', 'MULTIPLE_CHOICE', '작은 우산', '휴지', '보조 배터리', '카메라'),
    (948, '마음이 편해지는 소리는 어떤 것들인가요?', 'MULTIPLE_CHOICE', '빗소리', '파도 소리', '나란히 걷는 소리', '잔잔한 음악'),
    (949, '같이 먹으면 더 맛있을 것 같은 간식은 무엇인가요?', 'MULTIPLE_CHOICE', '과일', '빵', '쿠키', '아이스크림'),
    (950, '첫 만남에 가볍게 나누고 싶은 이야기는 무엇인가요?', 'MULTIPLE_CHOICE', '음식 취향', '최근 본 영화', '주말 이야기', '가보고 싶은 곳'),
    (951, '함께 도전해보고 싶은 취미는 무엇인가요?', 'MULTIPLE_CHOICE', '도예', '베이킹', '그림', '춤'),
    (952, '둘이 기분을 바꾸고 싶을 때 무엇을 하고 싶나요?', 'MULTIPLE_CHOICE', '산책', '음악 듣기', '디저트 먹기', '새 풍경 보기'),
    (953, '피크닉을 간다면 무엇을 챙겨가고 싶나요?', 'MULTIPLE_CHOICE', '돗자리', '샌드위치', '카메라', '가벼운 놀이'),
    (954, '둘이 방을 꾸민다면 무엇을 놓고 싶나요?', 'MULTIPLE_CHOICE', '작은 식물', '조명', '책', '스피커'),
    (955, '함께 보내는 저녁에 잘 어울리는 것은 무엇인가요?', 'MULTIPLE_CHOICE', '따뜻한 차', '은은한 조명', '음악', '간식'),
    (956, '작은 선물을 고른다면 어떤 것이 좋나요?', 'MULTIPLE_CHOICE', '책갈피', '차', '초콜릿', '꽃'),
    (957, '함께 배우면 재미있을 것 같은 것은 무엇인가요?', 'MULTIPLE_CHOICE', '언어', '요리', '사진', '운동'),
    (958, '새로운 동네에서 남기고 싶은 기억은 무엇인가요?', 'MULTIPLE_CHOICE', '맛있는 한 끼', '좋은 산책길', '사진', '나눈 이야기'),
    (959, '둘이 쉬는 날 자주 하고 싶은 것은 무엇인가요?', 'MULTIPLE_CHOICE', '걷기', '시장 구경', '영화 보기', '취미 나누기'),
    (960, '내 취향을 보여줄 때 함께 나누고 싶은 것은 무엇인가요?', 'MULTIPLE_CHOICE', '노래', '영화', '책', '음식')
) as v(id,content,input_type,option_a,option_b,option_c,option_d)
where q.id=v.id
  and not exists (select 1 from answers a where a.question_id=q.id)
  and not exists (select 1 from profile_letters p where p.question_id=q.id)
  and not exists (select 1 from hearts h where h.question_id=q.id)
  and not exists (select 1 from daily_reveals d where d.question_id=q.id)
  and not exists (select 1 from answer_unlocks u where u.question_id=q.id);
