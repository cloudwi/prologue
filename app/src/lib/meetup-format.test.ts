import { ddayLabel, mapQuery, numeralDate, venueOf, weekdayLabel } from './meetup-format';

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
