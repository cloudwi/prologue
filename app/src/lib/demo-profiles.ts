import type { ContactFrequency, Drinking, MeetFrequency, PoliticalLeaning, Religion, Smoking } from './member';

export type DemoProfile = {
  id: string;
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
    nickname: '오후의산책',
    age: 27,
    heightCm: 165,
    region: '서울 마포구',
    bio: '새로운 동네를 천천히 걷고 작은 가게를 발견하는 걸 좋아해요. 평일에는 제품을 만들고, 주말에는 흙을 만지거나 전시를 봅니다. 서로의 하루를 다정하게 물어보는 관계를 만나고 싶어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-afternoonwalk-1.jpg'),
      require('../../assets/images/demo-profiles/demo-afternoonwalk-2.jpg'),
      require('../../assets/images/demo-profiles/demo-afternoonwalk-3.jpg'),
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
    nickname: '한강한바퀴',
    age: 31,
    heightCm: 168,
    region: '서울 성동구',
    bio: '아침에 가볍게 뛰면 하루가 길어지는 기분이 좋아요. 운동만큼 잘 먹는 것도 좋아해서 주말마다 새로운 식당을 찾아갑니다. 약속을 잘 지키고 함께 웃을 일이 많은 사람이고 싶어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-hangang-1.jpg'),
      require('../../assets/images/demo-profiles/demo-hangang-2.jpg'),
      require('../../assets/images/demo-profiles/demo-hangang-3.jpg'),
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
    nickname: '책갈피',
    age: 24,
    heightCm: 162,
    region: '서울 종로구',
    bio: '책과 사진을 좋아하고 여행지에서는 오래 걷습니다. 처음에는 조금 조용하지만 익숙해지면 사소한 이야기까지 오래 나누는 편이에요. 서로 발견한 좋은 문장을 주고받고 싶어요.',
    photos: [
      require('../../assets/images/demo-profiles/demo-bookmark-1.jpg'),
      require('../../assets/images/demo-profiles/demo-bookmark-2.jpg'),
      require('../../assets/images/demo-profiles/demo-bookmark-3.jpg'),
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
];

export function findDemoProfile(id: string | undefined): DemoProfile | null {
  return DEMO_PROFILES.find((profile) => profile.id === id) ?? null;
}
