/**
 * 프로필 키워드 풀. 서버는 문자열 그대로 저장하므로(콤마 조인) 여기만 고치면 된다.
 * 널리 쓰는 소개팅 앱들의 표준 태그 위주 — 고를 게 없어서 비워두는 일이 없도록 넓게 둔다.
 * 기존 회원이 이미 고른 값은 지우지 말 것 — 목록에서 빠져도 저장된 프로필에는 남는다.
 */

export const HOBBIES = [
  '운동·헬스', '러닝', '등산', '요가·필라테스', '골프', '테니스', '클라이밍', '수영',
  '축구·풋살', '야구', '배드민턴', '볼링', '자전거', '스키·보드', '서핑', '캠핑',
  '낚시', '여행', '드라이브', '산책', '카페', '맛집', '요리', '베이킹',
  '와인', '위스키', '커피', '사진', '그림', '글쓰기', '독서', '영화',
  '드라마 정주행', '음악', '노래', '악기 연주', '댄스', '게임',
  '보드게임', '공연·전시', '뮤지컬', '콘서트', '반려동물', '식물 키우기',
];

export const INTERESTS = [
  '자기계발', '커리어', '재테크', '주식·투자', '부동산', '창업', '외국어', '과학·IT',
  'AI·테크', '심리', '철학', '역사', '시사·경제', '환경', '봉사', '건강',
  '다이어트', '패션', '뷰티', '인테리어', '미니멀라이프', '음식', '미식', '문화예술',
  '디자인', 'K팝', '스포츠 직관', '종교', '명상', 'MBTI', '웹툰', '애니',
];

export const STRENGTHS = [
  '유머러스', '다정함', '성실함', '경청', '긍정적', '배려심', '계획적', '즉흥적',
  '리더십', '손재주', '요리 잘함', '센스있음', '솔직함', '차분함', '활발함', '꼼꼼함',
  '책임감', '공감 능력', '애교 많음', '표현을 잘함', '잘 웃음', '호기심 많음',
  '추진력', '인내심', '예의 바름', '부지런함', '털털함', '감성적', '로맨틱', '운동신경',
];

export const KEYWORD_MAX = 5;

/**
 * 종교·정치 성향의 화면 문구 — 민감정보라 서버는 코드만 저장하고, 사람이 읽는 말은 여기 하나뿐이다.
 * 편집 화면과 상대 프로필이 같은 표를 쓴다(두 곳이 갈라지면 고른 값과 보이는 값이 달라진다).
 *
 * '무교'는 답이고, 아예 고르지 않은 것(null)은 답이 아니다 — 목록에 '밝히지 않음'을 두지 않고
 * 선택 해제로 비운다.
 */
export const RELIGION_LABELS: Record<string, string> = {
  NONE: '무교',
  CHRISTIAN: '기독교',
  CATHOLIC: '천주교',
  BUDDHIST: '불교',
  WON_BUDDHIST: '원불교',
  ISLAM: '이슬람교',
  OTHER: '그 외',
};

export const POLITICAL_LABELS: Record<string, string> = {
  PROGRESSIVE: '진보',
  CENTER_LEFT: '중도 진보',
  CENTER: '중도',
  CENTER_RIGHT: '중도 보수',
  CONSERVATIVE: '보수',
  APOLITICAL: '관심 없음',
};

/** 화면에 두는 순서 — 눈금이라 진보에서 보수로 늘어놓고, '관심 없음'만 끝에 둔다. */
export const RELIGION_ORDER = ['NONE', 'CHRISTIAN', 'CATHOLIC', 'BUDDHIST', 'WON_BUDDHIST', 'ISLAM', 'OTHER'] as const;
export const POLITICAL_ORDER = [
  'PROGRESSIVE',
  'CENTER_LEFT',
  'CENTER',
  'CENTER_RIGHT',
  'CONSERVATIVE',
  'APOLITICAL',
] as const;

/**
 * 생활 습관 — 흡연·음주·만나는 빈도. 편집 화면에서 고를 때 보이는 말.
 * 프로필에 붙는 태그는 더 짧다(TAG_LABELS) — 고르는 자리와 보이는 자리의 말이 다른 이유는,
 * 고를 땐 뜻이 분명해야 하고 보일 땐 자리를 적게 써야 하기 때문이다.
 */
export const SMOKING_LABELS: Record<string, string> = {
  NONE: '안 피워요',
  QUITTING: '끊는 중이에요',
  SOMETIMES: '가끔 피워요',
  REGULAR: '피워요',
};

export const DRINKING_LABELS: Record<string, string> = {
  NONE: '안 마셔요',
  RARELY: '거의 안 마셔요',
  SOMETIMES: '가끔 마셔요',
  OFTEN: '자주 마셔요',
};

export const MEET_FREQUENCY_LABELS: Record<string, string> = {
  ONCE: '주 1회쯤',
  TWO_TO_THREE: '주 2~3회',
  FOUR_PLUS: '주 4회 이상',
  FLEXIBLE: '그때그때 달라요',
};

export const SMOKING_ORDER = ['NONE', 'QUITTING', 'SOMETIMES', 'REGULAR'] as const;
export const DRINKING_ORDER = ['NONE', 'RARELY', 'SOMETIMES', 'OFTEN'] as const;
export const MEET_FREQUENCY_ORDER = ['ONCE', 'TWO_TO_THREE', 'FOUR_PLUS', 'FLEXIBLE'] as const;

/**
 * 프로필에 붙는 태그 문구 — 한 줄에 여럿이 늘어서므로 최대한 짧게.
 * 홀로 있어도 무슨 항목인지 읽혀야 해서, 애매한 값에만 앞말을 붙인다("중도"는 그대로 두되
 * "관심 없음"은 정치라고 말해줘야 한다).
 */
export const SMOKING_TAGS: Record<string, string> = {
  NONE: '비흡연',
  QUITTING: '금연 중',
  SOMETIMES: '가끔 흡연',
  REGULAR: '흡연',
};

export const DRINKING_TAGS: Record<string, string> = {
  NONE: '술 안 함',
  RARELY: '술 거의 안 함',
  SOMETIMES: '가끔 한잔',
  OFTEN: '술 자주',
};

export const MEET_FREQUENCY_TAGS: Record<string, string> = {
  ONCE: '주 1회',
  TWO_TO_THREE: '주 2~3회',
  FOUR_PLUS: '주 4회+',
  FLEXIBLE: '만남 그때그때',
};

export const POLITICAL_TAGS: Record<string, string> = {
  PROGRESSIVE: '진보',
  CENTER_LEFT: '중도 진보',
  CENTER: '중도',
  CENTER_RIGHT: '중도 보수',
  CONSERVATIVE: '보수',
  APOLITICAL: '정치 관심 없음',
};
