import { ddayLabel, mapQuery, meetupShareText, meetupShareUrl, numeralDate, timeLabel, venueOf, weekdayLabel } from './meetup-format';
import type { Meetup } from './meetups';

/**
 * 초대장이 읽는 계산들 — 날짜 경계와 주소 꼴은 눈으로 봐서는 못 미덥다.
 * "오늘 밤 11시 모임"이 '1일 남음'으로 나오거나, 지도 검색이 동 이름 때문에 빗나가는 식으로 틀린다.
 */

describe('숫자 날짜', () => {
  it('월·일을 두 자리로 맞춘다 — 자간이 고르게', () => {
    expect(numeralDate(new Date(2026, 8, 26))).toBe('2026. 09. 26');
    expect(numeralDate(new Date(2026, 11, 3))).toBe('2026. 12. 03');
  });
});

describe('요일', () => {
  it('일요일이 0 — Date.getDay()의 순서를 그대로 따른다', () => {
    expect(weekdayLabel(new Date(2026, 8, 27))).toBe('일요일'); // 2026-09-27은 일요일
    expect(weekdayLabel(new Date(2026, 8, 26))).toBe('토요일');
  });
});

describe('시각', () => {
  // Intl에 맡겼을 때 CI의 Node가 "PM 7:00"을 내놓았다. 실행 환경이 달라도 같은 글자가 나와야 한다.
  it('오전·오후를 한국어로 쓴다', () => {
    expect(timeLabel(new Date(2026, 8, 26, 19, 0))).toBe('오후 7:00');
    expect(timeLabel(new Date(2026, 8, 26, 9, 5))).toBe('오전 9:05');
  });

  it('자정과 정오 — 0시는 오전 12시, 12시는 오후 12시', () => {
    expect(timeLabel(new Date(2026, 8, 26, 0, 0))).toBe('오전 12:00');
    expect(timeLabel(new Date(2026, 8, 26, 12, 0))).toBe('오후 12:00');
    expect(timeLabel(new Date(2026, 8, 26, 12, 30))).toBe('오후 12:30');
  });
});

describe('D-day', () => {
  const today = new Date(2026, 8, 26, 12, 0);

  it('같은 날이면 시각과 무관하게 오늘', () => {
    // 밤 11시에 열려도 "오늘"이다 — 사람이 세는 방식과 맞춘다.
    expect(ddayLabel(new Date(2026, 8, 26, 23, 30), today)).toBe('오늘 열리는 모임이에요');
    expect(ddayLabel(new Date(2026, 8, 26, 0, 30), today)).toBe('오늘 열리는 모임이에요');
  });

  it('다음 날 새벽도 하루 남은 것', () => {
    expect(ddayLabel(new Date(2026, 8, 27, 1, 0), today)).toBe('모임까지 1일 남았어요');
  });

  it('지난 모임은 며칠 전이었는지 말한다', () => {
    expect(ddayLabel(new Date(2026, 8, 20, 19, 0), today)).toBe('6일 전에 열린 모임이에요');
  });

  it('달을 넘어가도 날수로 센다', () => {
    expect(ddayLabel(new Date(2026, 9, 3, 19, 0), today)).toBe('모임까지 7일 남았어요');
  });
});

describe('지도 검색어', () => {
  it('주소 끝의 동 표기를 뗀다 — 붙어 있으면 검색이 빗나간다', () => {
    expect(mapQuery('서울 서초구 언남길 49 (양재동)')).toBe('서울 서초구 언남길 49');
  });

  it('괄호가 없으면 그대로 둔다', () => {
    expect(mapQuery('서울 서초구 언남길 49')).toBe('서울 서초구 언남길 49');
  });

  it('가운데 괄호는 건드리지 않는다 — 끝에 붙은 것만 뗀다', () => {
    expect(mapQuery('서울 (구)시청 앞 3길')).toBe('서울 (구)시청 앞 3길');
  });
});

describe('장소 가르기', () => {
  it('"주소 · 상세" 꼴이면 상세가 이름이 된다', () => {
    expect(venueOf({ place: '서울 서초구 언남길 49 · 1층 파란지붕 서로서가', placeAddress: '서울 서초구 언남길 49' })).toEqual({
      name: '1층 파란지붕 서로서가',
      address: '서울 서초구 언남길 49',
    });
  });

  it('상세가 없으면 이름은 비운다 — 주소를 이름 자리에 두 번 쓰지 않는다', () => {
    expect(venueOf({ place: '서울 서초구 언남길 49', placeAddress: '서울 서초구 언남길 49' })).toEqual({
      name: null,
      address: '서울 서초구 언남길 49',
    });
  });

  it('주소 검색 이전의 옛 데이터는 통째로 이름으로 둔다', () => {
    expect(venueOf({ place: '강남 어딘가 카페', placeAddress: null })).toEqual({
      name: '강남 어딘가 카페',
      address: null,
    });
  });
});

describe('전하기 문구', () => {
  const now = new Date(2026, 8, 20, 12, 0);

  const meetup = (over: Partial<Meetup> = {}): Meetup =>
    ({
      meetupId: 'abc-123',
      title: '밑줄 모임',
      description: null,
      meetAt: new Date(2026, 8, 26, 19, 0).toISOString(),
      place: '서울 성동구 연무장길 5 · 2층 카페',
      placeUrl: null,
      placeAddress: '서울 성동구 연무장길 5',
      capacity: 8,
      fee: 30000,
      feeFemale: null,
      genderLimit: null,
      minAgeMale: null,
      maxAgeMale: null,
      minAgeFemale: null,
      maxAgeFemale: null,
      minHeightMaleCm: null,
      minHeightFemaleCm: null,
      requireJobVerified: false,
      emoji: null,
      color: null,
      coverUrls: [],
      status: 'OPEN',
      hostNickname: '지연',
      hostDoneCount: 2,
      confirmedCount: 5,
      myStatus: null,
      kakaoLink: null,
      participants: [],
      hostAccountId: 'host-1',
      isMine: false,
      ...over,
    }) as Meetup;

  it('제목·날짜·장소·참가비·남은 자리·링크가 이 순서로 선다', () => {
    expect(meetupShareText(meetup(), now)).toBe(
      [
        '밑줄 모임 — 프롤로그 초대장',
        '',
        '2026. 09. 26 (토) 오후 7:00',
        '2층 카페 · 서울 성동구 연무장길 5',
        '참가비 30,000원',
        '',
        '자리가 3개 남았어요.',
        'https://prologue.day/m/abc-123',
      ].join('\n'),
    );
  });

  it('이어져 온 모임이면 회차를 제목 아래 붙인다', () => {
    expect(meetupShareText(meetup({ occurrence: 3, occurrenceTotal: 4 }), now)).toContain('밑줄 모임 — 프롤로그 초대장\n3번째 만남');
  });

  it('회차가 하나뿐이면 회차 줄을 쓰지 않는다 — 단발 모임에 "1번째"는 군더더기', () => {
    expect(meetupShareText(meetup({ occurrence: 1, occurrenceTotal: 1 }), now)).not.toContain('번째 만남');
  });

  it('조건이 있으면 참가비 아래 한 줄로 붙는다', () => {
    expect(meetupShareText(meetup({ minAgeMale: 28, maxAgeMale: 39, minAgeFemale: 25, maxAgeFemale: 35 }), now)).toContain(
      '참가비 30,000원\n남 28~39세 · 여 25~35세',
    );
  });

  it('조건이 없으면 빈 줄을 남기지 않는다', () => {
    expect(meetupShareText(meetup(), now)).not.toContain('\n\n\n');
  });

  it('마감·만석·지난 모임은 남은 자리 대신 사실을 적는다 — 헛걸음시키지 않게', () => {
    expect(meetupShareText(meetup({ status: 'CLOSED' }), now)).toContain('모집이 마감됐어요.');
    expect(meetupShareText(meetup({ confirmedCount: 8 }), now)).toContain('자리가 다 찼어요.');
    expect(meetupShareText(meetup(), new Date(2026, 8, 27, 12, 0))).toContain('이미 지난 모임이에요.');
  });

  it('링크는 모임마다 다른 초대장 주소', () => {
    expect(meetupShareUrl('xyz')).toBe('https://prologue.day/m/xyz');
  });
});
