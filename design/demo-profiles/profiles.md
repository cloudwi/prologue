# 데모 프로필 글 — 사진 대기 중인 인물

사진이 들어오기 전의 프로필 글을 여기에 먼저 쓴다. 사진 세 장이 준비되면 블록을 그대로
[`demo-profiles.ts`](../../app/src/lib/demo-profiles.ts)로 옮기고 여기에는 기록만 남긴다.
**옮기기 전에는 `photos`를 채우지 않는다 — 파일이 없는 `require()`는 번들을 깨뜨린다.**

## 남성 셋 — 2026-09-10 작성, 사진 대기

남성 데모가 셋뿐이라 `pickDemoProfiles()`의 날짜 셔플이 남성 쪽에서는 아무 일도 하지 않는다
(`pool.length <= DEMO_SHOWN`이면 그대로 전부 나간다). **남성을 선호하는 회원은 매일 같은 세 명을
본다.** 여성처럼 여섯이 되어야 조합이 날마다 바뀐다. 그래서 셋을 더 쓴다.

주제는 기존 아홉 명을 전부 피했다 — 요리(목요일의부엌)·등산(오래된등산화)·영화와 기타
(금요일의영화), 그리고 여성 쪽의 도예·산책, 러닝·요리, 독서·사진, 음악·LP, 텃밭·베이킹,
서핑·수영. 새 셋은 **팀 운동(풋살)·목공·기차 여행**이고, 성격도 기존 남성 셋과 겹치지 않게
잡았다(다정한 요리사·과묵한 등산가·감성적인 영화광 옆에 활발한 운동파·만들고 고치는 사람·
혼자 멀리 나가는 사람).

옛 시드 계정은 되살리지 않는다. `store/personas/`의 남성 시드(주말셰프·산아래집·코드하나)는
지금 남성 데모와 주제가 1:1로 겹치고, 사진도 앞치마·배낭처럼 주제에 묶여 있어 재활용이 안 된다.
닉네임도 시드 전체(고요한아침·달빛산책·별보는밤·산아래집·여름밤바람·조용한위로·종이비행기·
주말셰프·코드하나·하루)와 겹치지 않게 골랐다.

사진 프롬프트는 [image-prompts.md](image-prompts.md)의 "남성 셋 더"에 있다.

```ts
  {
    id: 'grass-scent',
    gender: 'MALE',
    nickname: '잔디냄새',
    age: 28,
    heightCm: 176,
    region: '서울 광진구',
    bio: '수요일 밤이면 동네 풋살장에서 공을 찹니다. 잘하는 편은 아닌데 팀에 빠지지 않고 나간 지 육 년쯤 됐어요. 각자 좋아하는 걸 꾸준히 하는 사람을 만나고 싶습니다.',
    // TODO: 사진 세 장이 들어오면 주석을 푼다 — 파일이 없는 require()는 번들을 깨뜨린다.
    photos: [
      // require('../../assets/images/demo-profiles/demo-grassscent-1.jpg'),
      // require('../../assets/images/demo-profiles/demo-grassscent-2.jpg'),
      // require('../../assets/images/demo-profiles/demo-grassscent-3.jpg'),
    ],
    hobbies: ['축구·풋살', '볼링', '맛집'],
    interests: ['스포츠 직관', '건강'],
    strengths: ['활발함', '책임감'],
    facts: { smoking: 'NONE', drinking: 'SOMETIMES', meetFrequency: 'FOUR_PLUS', contactFrequency: 'FEW_TIMES_WEEK', religion: 'NONE', politicalLeaning: 'APOLITICAL' },
    letters: [
      { key: 'keep', question: '꾸준히 하고 있는 일이 있나요?', content: '수요일 풋살이요. 비가 오면 실내 코트를 빌려서라도 갑니다. 실력이 느는 것보다 그 한 시간이 일주일을 정리해 줘서 계속하게 돼요.' },
      { key: 'weekend', question: '쉬는 날에는 주로 무엇을 하나요?', content: '오전에는 늦게까지 자고, 오후에는 멀지 않은 데를 골라 밥을 먹으러 갑니다. 혼자서도 잘 다니는 편이에요.' },
      { key: 'relationship', question: '어떤 사람을 만나고 싶나요?', content: '각자 하는 일이 따로 있는 사람이요. 주말에 뭐 하고 왔는지 서로 이야기하는 저녁이면 좋겠어요.' },
    ],
  },
  {
    id: 'wood-grain',
    gender: 'MALE',
    nickname: '나무결',
    age: 33,
    heightCm: 181,
    region: '경기 남양주시',
    bio: '주말이면 공방에서 나무를 자르고 사포질을 합니다. 새로 사는 것보다 있던 걸 고쳐서 오래 쓰는 쪽이 좋아요. 무엇을 좋아하는지 구체적으로 말해 주는 사람을 만나고 싶습니다.',
    // TODO: 사진 세 장이 들어오면 주석을 푼다 — 파일이 없는 require()는 번들을 깨뜨린다.
    photos: [
      // require('../../assets/images/demo-profiles/demo-woodgrain-1.jpg'),
      // require('../../assets/images/demo-profiles/demo-woodgrain-2.jpg'),
      // require('../../assets/images/demo-profiles/demo-woodgrain-3.jpg'),
    ],
    hobbies: ['목공', '가구 수리', '커피'],
    interests: ['인테리어', '미니멀라이프'],
    strengths: ['손재주', '꼼꼼함'],
    facts: { smoking: 'NONE', drinking: 'RARELY', meetFrequency: 'ONCE', contactFrequency: 'FLEXIBLE', religion: 'CHRISTIAN', politicalLeaning: 'CENTER' },
    letters: [
      { key: 'making', question: '요즘 가장 많이 하는 일은?', content: '토요일 아침부터 공방에 있습니다. 지난달에는 십 년 된 의자 다리를 갈아 끼웠고, 요즘은 작은 협탁을 짜는 중이에요.' },
      { key: 'joy', question: '무엇을 할 때 가장 즐거운가요?', content: '치수를 재고 처음 자르기 직전이 제일 좋아요. 그다음부터는 사포질만 며칠씩 하는데 그 지루한 시간도 나쁘지 않습니다.' },
      { key: 'promise', question: '스스로 잘한다고 생각하는 게 있나요?', content: '약속 시간을 지키는 거요. 늘 좀 일찍 도착해서 근처를 한 바퀴 보고 들어갑니다.' },
    ],
  },
  {
    id: 'slow-train',
    gender: 'MALE',
    nickname: '완행열차',
    age: 26,
    heightCm: 172,
    region: '서울 용산구',
    bio: '주말이면 아침 기차를 타고 한 번도 안 가본 도시에 내립니다. 계획 없이 돌아다니다가 눈에 띄는 데서 밥을 먹고 밤 기차로 돌아와요. 같이 가도 좋고 다녀와서 이야기해도 좋을 사람을 만나고 싶어요.',
    // TODO: 사진 세 장이 들어오면 주석을 푼다 — 파일이 없는 require()는 번들을 깨뜨린다.
    photos: [
      // require('../../assets/images/demo-profiles/demo-slowtrain-1.jpg'),
      // require('../../assets/images/demo-profiles/demo-slowtrain-2.jpg'),
      // require('../../assets/images/demo-profiles/demo-slowtrain-3.jpg'),
    ],
    hobbies: ['기차 여행', '글쓰기', '카페'],
    interests: ['역사', '문화예술'],
    strengths: ['호기심 많음', '즉흥적'],
    facts: { smoking: 'NONE', drinking: 'SOMETIMES', meetFrequency: 'TWO_TO_THREE', contactFrequency: 'DAILY', religion: 'NONE', politicalLeaning: 'CENTER_LEFT' },
    letters: [
      { key: 'alone', question: '혼자 있는 시간에는 무엇을 하나요?', content: '주말 아침 기차를 탑니다. 창밖이 논으로 바뀌는 구간부터는 아무것도 안 하고 창만 봐요.' },
      { key: 'recent', question: '요즘 새로 시작한 일이 있나요?', content: '다녀온 도시마다 다섯 줄씩 적어 두기 시작했어요. 나중에 읽으면 그날 날씨까지 같이 기억이 납니다.' },
      { key: 'together', question: '함께 보내고 싶은 하루는?', content: '아침 기차를 같이 타고 한 번도 안 가본 역에 내리는 하루요. 뭘 할지는 도착해서 정하고요.' },
    ],
  },
```

## 새 인물 여섯 — 2026-09-10 코드로 옮김

**여섯 명 모두 사진이 들어와 [`demo-profiles.ts`](../../app/src/lib/demo-profiles.ts)로 옮겼다.**
아래 블록은 기록으로만 남긴다 — 원본은 이제 코드 쪽이다.

기존 세 명과 겹치지 않게 잡았다 — 도예·산책(오후의산책), 러닝·요리(한강한바퀴),
독서·사진(책갈피). 닉네임은 `store/personas/`의 시드 계정과도 겹치지 않는다.

### 여성

```ts
  {
    id: 'night-radio',
    gender: 'FEMALE',
    nickname: '밤의라디오',
    age: 26,
    heightCm: 160,
    region: '서울 서대문구',
    bio: '늦은 밤에 음악을 틀어놓고 하루를 정리하는 시간을 좋아해요. 좋아하는 노래가 생기면 며칠씩 반복해서 듣습니다. 취향이 달라도 서로의 플레이리스트를 궁금해하는 사이가 되고 싶어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-nightradio-1.jpg'),
      require('../../assets/images/demo-profiles/demo-nightradio-2.jpg'),
      require('../../assets/images/demo-profiles/demo-nightradio-3.jpg'),
    ],
    hobbies: ['음악 감상', 'LP', '밤 산책'],
    interests: ['음악', '라디오'],
    strengths: ['다정함', '유머'],
    facts: { smoking: 'NONE', drinking: 'SOMETIMES', meetFrequency: 'TWO_TO_THREE', contactFrequency: 'DAILY', religion: 'NONE', politicalLeaning: 'CENTER' },
    letters: [
      { key: 'night', question: '하루 중 가장 좋아하는 시간은?', content: '자정 가까운 시간이요. 불을 하나만 켜두고 음악을 틀면 그날 있었던 일이 그제서야 정리돼요.' },
      { key: 'music', question: '요즘 자주 듣는 것이 있나요?', content: '오래된 한국 가요를 LP로 듣고 있어요. 지직거리는 소리까지 포함해서 좋아합니다.' },
      { key: 'relationship', question: '어떤 사이가 되고 싶나요?', content: '각자 좋아하는 게 달라도 그건 뭐냐고 물어봐 주는 사이요. 설명하다 보면 저도 다시 좋아지더라고요.' },
    ],
  },
  {
    id: 'weekend-garden',
    gender: 'FEMALE',
    nickname: '주말텃밭',
    age: 30,
    heightCm: 166,
    region: '경기 고양시',
    bio: '작은 텃밭을 가꾸고 그날 딴 걸로 저녁을 만드는 주말을 보냅니다. 손으로 뭔가 만드는 일이면 대체로 좋아해요. 계절이 바뀌는 걸 같이 알아차리는 사람을 만나고 싶어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-weekendgarden-1.jpg'),
      require('../../assets/images/demo-profiles/demo-weekendgarden-2.jpg'),
      require('../../assets/images/demo-profiles/demo-weekendgarden-3.jpg'),
    ],
    hobbies: ['텃밭', '베이킹', '식물'],
    interests: ['요리', '자연'],
    strengths: ['성실함', '느긋함'],
    facts: { smoking: 'NONE', drinking: 'RARELY', meetFrequency: 'ONCE', contactFrequency: 'FEW_TIMES_WEEK', religion: 'CATHOLIC', politicalLeaning: 'CENTER_LEFT' },
    letters: [
      { key: 'weekend', question: '쉬는 날에는 주로 무엇을 하나요?', content: '아침 일찍 텃밭에 나가요. 상추가 하룻밤 새 자란 걸 보면 별것 아닌데 기분이 좋아집니다.' },
      { key: 'make', question: '요즘 새로 시작한 일이 있나요?', content: '천연발효빵을 굽기 시작했어요. 실패한 반죽도 많은데 기다리는 시간이 좋아서 계속하고 있어요.' },
      { key: 'pace', question: '어떤 속도의 관계가 편한가요?', content: '자주 만나는 것보다 한 번 만나면 오래 이야기하는 쪽이 편해요. 대신 약속은 잘 지킵니다.' },
    ],
  },
  {
    id: 'wave-sound',
    gender: 'FEMALE',
    nickname: '파도소리',
    age: 28,
    heightCm: 163,
    region: '부산 해운대구',
    bio: '아침 바다에서 수영하고 하루를 시작하는 날이 제일 좋아요. 계획을 세우기보다 일단 나가보는 편이고, 새로운 걸 배우는 데 겁이 없습니다. 같이 움직이면서 웃을 일이 많았으면 좋겠어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-wavesound-1.jpg'),
      require('../../assets/images/demo-profiles/demo-wavesound-2.jpg'),
      require('../../assets/images/demo-profiles/demo-wavesound-3.jpg'),
    ],
    hobbies: ['서핑', '수영', '여행'],
    interests: ['운동', '바다'],
    strengths: ['솔직함', '추진력'],
    facts: { smoking: 'NONE', drinking: 'SOMETIMES', meetFrequency: 'FOUR_PLUS', contactFrequency: 'FREQUENT', religion: 'NONE', politicalLeaning: 'APOLITICAL' },
    letters: [
      { key: 'morning', question: '언제 가장 나다운가요?', content: '해 뜨기 전에 바다에 들어갈 때요. 물이 차가워서 정신이 확 드는 그 순간이 하루 중 제일 좋아요.' },
      { key: 'learn', question: '요즘 배우고 있는 게 있나요?', content: '서핑을 이 년째 배우는 중이에요. 아직도 자주 넘어지는데 그게 재미있어서 그만두질 못합니다.' },
      { key: 'together', question: '함께 보내고 싶은 하루는?', content: '아침에 같이 바다에 갔다가 낮잠 자고, 저녁에 시장에서 회 한 접시 사 오는 하루요.' },
    ],
  },
```

### 남성

```ts
  {
    id: 'thursday-kitchen',
    gender: 'MALE',
    nickname: '목요일의부엌',
    age: 32,
    heightCm: 177,
    region: '서울 성동구',
    bio: '일주일에 두어 번은 장을 봐서 직접 해 먹습니다. 대단한 요리는 아니고 제철 재료를 단순하게 다루는 걸 좋아해요. 마주 앉아 밥 먹으면서 하루 이야기를 나누는 사이가 되고 싶습니다.',
    photos: [
      require('../../assets/images/demo-profiles/demo-thursdaykitchen-1.jpg'),
      require('../../assets/images/demo-profiles/demo-thursdaykitchen-2.jpg'),
      require('../../assets/images/demo-profiles/demo-thursdaykitchen-3.jpg'),
    ],
    hobbies: ['요리', '시장 구경', '자전거'],
    interests: ['음식', '동네'],
    strengths: ['다정함', '경청'],
    facts: { smoking: 'NONE', drinking: 'SOMETIMES', meetFrequency: 'TWO_TO_THREE', contactFrequency: 'DAILY', religion: 'NONE', politicalLeaning: 'CENTER' },
    letters: [
      { key: 'kitchen', question: '쉬는 날에는 주로 무엇을 하나요?', content: '아침에 시장에 다녀와요. 뭘 만들지는 대개 가서 정하고, 돌아와서 두어 시간 부엌에 서 있습니다.' },
      { key: 'care', question: '마음을 표현하는 방식은?', content: '말보다 밥을 먼저 차리는 편이에요. 상대가 어떤 걸 남기는지 기억해 두었다가 다음엔 덜 만듭니다.' },
      { key: 'relationship', question: '어떤 관계를 기대하나요?', content: '특별한 날이 아니어도 같이 저녁을 먹는 사이요. 말이 없는 저녁도 편했으면 좋겠어요.' },
    ],
  },
  {
    id: 'old-boots',
    gender: 'MALE',
    nickname: '오래된등산화',
    age: 29,
    heightCm: 180,
    region: '서울 은평구',
    bio: '주말이면 가까운 산에 오릅니다. 정상보다 능선에서 바람 맞는 시간이 좋아서 천천히 걷는 편이에요. 무리하지 않고 오래 함께 걸을 수 있는 사람을 만나고 싶어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-oldboots-1.jpg'),
      require('../../assets/images/demo-profiles/demo-oldboots-2.jpg'),
      require('../../assets/images/demo-profiles/demo-oldboots-3.jpg'),
    ],
    hobbies: ['등산', '캠핑', '사진'],
    interests: ['자연', '커피'],
    strengths: ['성실함', '차분함'],
    facts: { smoking: 'NONE', drinking: 'RARELY', meetFrequency: 'ONCE', contactFrequency: 'FEW_TIMES_WEEK', religion: 'NONE', politicalLeaning: 'CENTER_RIGHT' },
    letters: [
      { key: 'mountain', question: '언제 가장 나다운가요?', content: '능선에 올라 바람이 한 번 지나갈 때요. 그때만은 머릿속에 아무 생각이 없어서 좋아요.' },
      { key: 'pace', question: '어떤 속도의 관계가 편한가요?', content: '빨리 가까워지는 것보다 천천히 오래 가는 쪽이요. 산에서도 앞사람 속도에 맞춰 걷는 편이에요.' },
      { key: 'recent', question: '요즘 새로 시작한 일이 있나요?', content: '필름 카메라를 들고 다니기 시작했어요. 스무 장 남짓이라 아껴 찍게 되는 게 마음에 듭니다.' },
    ],
  },
  {
    id: 'friday-film',
    gender: 'MALE',
    nickname: '금요일의영화',
    age: 27,
    heightCm: 174,
    region: '서울 관악구',
    bio: '금요일 밤에 혼자 영화 한 편 보는 습관이 오래됐어요. 좋았던 장면을 누군가에게 설명하는 걸 좋아합니다. 취향이 달라도 서로의 이야기를 끝까지 들어주는 사이가 좋아요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-fridayfilm-1.jpg'),
      require('../../assets/images/demo-profiles/demo-fridayfilm-2.jpg'),
      require('../../assets/images/demo-profiles/demo-fridayfilm-3.jpg'),
    ],
    hobbies: ['영화', '기타', '산책'],
    interests: ['영화', '음악'],
    strengths: ['유머', '공감 능력'],
    facts: { smoking: 'NONE', drinking: 'SOMETIMES', meetFrequency: 'TWO_TO_THREE', contactFrequency: 'FLEXIBLE', religion: 'NONE', politicalLeaning: 'CENTER_LEFT' },
    letters: [
      { key: 'friday', question: '하루 중 가장 좋아하는 시간은?', content: '금요일 밤 열한 시요. 불 끄고 영화 한 편 트는 그 시간을 일주일 내내 기다립니다.' },
      { key: 'talk', question: '어떤 대화를 좋아하나요?', content: '결론을 내는 대화보다 왜 그 장면이 좋았는지 오래 이야기하는 쪽이요. 중간에 웃음이 섞이면 더 좋고요.' },
      { key: 'guitar', question: '요즘 새로 시작한 일이 있나요?', content: '기타를 다시 잡았어요. 아직 코드 몇 개뿐인데 방에서 혼자 치는 시간이 꽤 좋습니다.' },
    ],
  },
```
