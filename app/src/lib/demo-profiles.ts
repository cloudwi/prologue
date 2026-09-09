import type { ContactFrequency, Drinking, Gender, MeetFrequency, PoliticalLeaning, Religion, Smoking } from './member';

export type DemoProfile = {
  id: string;
  /** 이 사람을 보여줄 자리 — 선호 성별이 맞는 회원에게만 놓는다. */
  gender: Gender;
  nickname: string;
  age: number;
  heightCm: number;
  region: string;
  bio: string;
  photos: number[];
  hobbies: string[];
  interests: string[];
  strengths: string[];
  facts: {
    smoking: Smoking;
    drinking: Drinking;
    meetFrequency: MeetFrequency;
    contactFrequency: ContactFrequency;
    religion: Religion;
    politicalLeaning: PoliticalLeaning;
  };
  letters: { key: string; question: string; content: string }[];
};

/** 운영 계정과 분리된, 추천과 연락에 참여하지 않는 허구의 프로필. */
export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: 'afternoon-walk',
    gender: 'FEMALE',
    nickname: '오후의산책',
    age: 27,
    heightCm: 165,
    region: '서울 마포구',
    bio: '새로운 동네를 천천히 걷고 작은 가게를 발견하는 걸 좋아해요. 평일에는 제품을 만들고, 주말에는 흙을 만지거나 전시를 봅니다. 서로의 하루를 다정하게 물어보는 관계를 만나고 싶어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-afternoonwalk-1-v4.jpg'),
      require('../../assets/images/demo-profiles/demo-afternoonwalk-2-v4.jpg'),
      require('../../assets/images/demo-profiles/demo-afternoonwalk-3-v4.jpg'),
    ],
    hobbies: ['도예', '동네 산책', '공연·전시'],
    interests: ['디자인', '커피'],
    strengths: ['차분함', '경청'],
    facts: { smoking: 'NONE', drinking: 'SOMETIMES', meetFrequency: 'TWO_TO_THREE', contactFrequency: 'DAILY', religion: 'NONE', politicalLeaning: 'CENTER' },
    letters: [
      { key: 'weekend', question: '쉬는 날에는 주로 무엇을 하나요?', content: '늦은 아침을 먹고 목적지 없이 걷는 편이에요. 마음에 드는 카페나 소품 가게를 찾으면 사진을 한 장 남겨요.' },
      { key: 'relationship', question: '어떤 관계를 기대하나요?', content: '각자의 일을 존중하면서도 오늘 어땠는지 자연스럽게 묻는 사이요. 말이 없는 시간도 편했으면 좋겠어요.' },
      { key: 'recent', question: '요즘 새로 시작한 일이 있나요?', content: '작은 컵을 직접 만들어 보고 싶어서 도예 수업을 시작했어요. 아직은 조금 삐뚤지만 그래서 더 마음에 들어요.' },
    ],
  },
  {
    id: 'hangang-lap',
    gender: 'FEMALE',
    nickname: '한강한바퀴',
    age: 31,
    heightCm: 168,
    region: '서울 성동구',
    bio: '아침에 가볍게 뛰면 하루가 길어지는 기분이 좋아요. 운동만큼 잘 먹는 것도 좋아해서 주말마다 새로운 식당을 찾아갑니다. 약속을 잘 지키고 함께 웃을 일이 많은 사람이고 싶어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-hangang-1-v4.jpg'),
      require('../../assets/images/demo-profiles/demo-hangang-2-v4.jpg'),
      require('../../assets/images/demo-profiles/demo-hangang-3-v4.jpg'),
    ],
    hobbies: ['러닝', '요리', '맛집'],
    interests: ['건강', '음식'],
    strengths: ['긍정적', '책임감'],
    facts: { smoking: 'NONE', drinking: 'RARELY', meetFrequency: 'TWO_TO_THREE', contactFrequency: 'FREQUENT', religion: 'CHRISTIAN', politicalLeaning: 'APOLITICAL' },
    letters: [
      { key: 'energy', question: '언제 가장 나다운가요?', content: '아침 공기를 마시며 달릴 때요. 기록보다는 어제보다 몸이 가벼운지 느끼면서 천천히 뛰는 편이에요.' },
      { key: 'date', question: '함께 보내고 싶은 하루는?', content: '낮에는 같이 움직이고 저녁에는 맛있는 걸 먹고 싶어요. 거창한 계획보다 둘 다 편안한 하루가 좋아요.' },
      { key: 'care', question: '마음을 표현하는 방식은?', content: '상대가 전에 했던 말을 기억해 두었다가 필요한 순간에 챙기는 편이에요. 말보다는 행동이 조금 빠릅니다.' },
    ],
  },
  {
    id: 'bookmark',
    gender: 'FEMALE',
    nickname: '책갈피',
    age: 24,
    heightCm: 162,
    region: '서울 종로구',
    bio: '책과 사진을 좋아하고 여행지에서는 오래 걷습니다. 처음에는 조금 조용하지만 익숙해지면 사소한 이야기까지 오래 나누는 편이에요. 서로 발견한 좋은 문장을 주고받고 싶어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-bookmark-1-v4.jpg'),
      require('../../assets/images/demo-profiles/demo-bookmark-2-v4.jpg'),
      require('../../assets/images/demo-profiles/demo-bookmark-3-v4.jpg'),
    ],
    hobbies: ['독서', '사진', '여행'],
    interests: ['문화예술', '글쓰기'],
    strengths: ['호기심 많음', '공감 능력'],
    facts: { smoking: 'NONE', drinking: 'NONE', meetFrequency: 'ONCE', contactFrequency: 'FEW_TIMES_WEEK', religion: 'BUDDHIST', politicalLeaning: 'CENTER_LEFT' },
    letters: [
      { key: 'book', question: '최근 마음에 남은 것은?', content: '문장 하나가 사람의 하루를 오래 붙잡아 줄 수 있다는 내용의 에세이를 읽었어요. 좋아하는 구절을 메모하는 습관이 생겼습니다.' },
      { key: 'travel', question: '여행에서는 무엇을 중요하게 보나요?', content: '유명한 장소를 많이 보는 것보다 한 동네를 오래 걷는 걸 좋아해요. 바람이 센 날의 제주 바다를 특히 좋아합니다.' },
      { key: 'conversation', question: '어떤 대화를 좋아하나요?', content: '정답을 찾는 대화보다 서로 왜 그렇게 느꼈는지 천천히 듣는 대화를 좋아해요. 유머가 조금 섞이면 더 좋고요.' },
    ],
  },
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
];

export function findDemoProfile(id: string | undefined): DemoProfile | null {
  return DEMO_PROFILES.find((profile) => profile.id === id) ?? null;
}

/** 한 번에 보여줄 데모 수. 세 장이면 카드가 넘어간다는 걸 알면서도 훑기가 부담스럽지 않다. */
const DEMO_SHOWN = 3;

/**
 * 오늘 보여줄 데모 몇 명 — 선호 성별에 맞는 사람 중에서 고른다.
 *
 * 준비한 사람을 전부 늘어놓지 않는 이유는 두 가지다. 카드가 여섯 장이면 훑다 지치고,
 * 무엇보다 **매일 같은 얼굴이면 두 번째 날부터는 보여줄 이유가 없다.** 그래서 날짜를
 * 씨앗으로 섞는다 — 같은 날에는 늘 같은 세 명이고(새로고침마다 얼굴이 바뀌면 미리보기가
 * 아니라 뽑기가 된다), 날이 바뀌면 조합이 바뀐다.
 *
 * 맞는 사람이 없으면 빈 배열이다. 부르는 쪽은 이 길이로 "데모를 보여줄지"를 판단한다 —
 * 성별을 따로 검사하지 않아도 준비가 안 된 성별에는 자연히 아무것도 나가지 않는다.
 */
export function pickDemoProfiles(gender: Gender | null | undefined, today = new Date()): DemoProfile[] {
  if (!gender) return [];
  const pool = DEMO_PROFILES.filter((profile) => profile.gender === gender);
  if (pool.length <= DEMO_SHOWN) return pool;

  /*
   * 날짜(20260909)를 그대로 씨앗으로 쓰면 안 된다.
   *
   * 하루에 1씩만 움직이는 값이라, 흔한 선형 합동 난수에 그대로 넣으면 **다음 날 결과가
   * 어제와 거의 같다.** 여섯 명을 스물여덟 날 돌려봤더니 첫 사람이 한 번도 안 뽑혔다 —
   * 자리를 고르는 데 쓰는 나머지 연산이 하필 규칙이 가장 뚜렷한 아래 비트를 본다.
   * 그래서 씨앗을 먼저 흩는다(splitmix32). 같은 조건에서 여섯 명 모두 나오고,
   * 스물여덟 날에 서로 다른 조합 열여덟 가지가 나온다.
   */
  let seed = (today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()) >>> 0;
  const next = () => {
    seed = (seed + 0x9e3779b9) >>> 0;
    let x = seed;
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
    return (x ^ (x >>> 15)) >>> 0;
  };
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, DEMO_SHOWN);
}
