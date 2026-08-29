import { conditionLabel, feeLabel, feeValue } from './meetups';

/**
 * 모임 카드에 붙는 문구 — 화면 없이 검증되는 순수 함수들.
 *
 * 여기가 자주 틀리는 이유는 **경우의 수가 많아서**다: 참가비는 공통/성별별/무료가 섞이고,
 * 조건은 성별 제한과 나이·키가 곱해진다. 눈으로 보고 넘어가면 한쪽 성별만 조용히 잘못 나온다.
 */

const fee = (fee: number, feeFemale: number | null = null) => feeLabel({ fee, feeFemale });

describe('참가비 문구', () => {
  it('무료면 그냥 무료', () => {
    expect(fee(0)).toBe('무료');
  });

  it('공통 참가비는 한 줄로', () => {
    expect(fee(30000)).toBe('참가비 30,000원');
  });

  it('성별로 값이 다르면 나눠 적는다', () => {
    expect(fee(70000, 60000)).toBe('남 70,000원 · 여 60,000원');
  });

  it('같은 값이면 나누지 않는다 — 굳이 성별을 말할 이유가 없다', () => {
    expect(fee(50000, 50000)).toBe('참가비 50,000원');
  });

  it('한쪽만 무료인 경우도 나눠 적는다', () => {
    expect(fee(30000, 0)).toBe('남 30,000원 · 여 무료');
  });
});

type Conditions = Parameters<typeof conditionLabel>[0];

const NO_CONDITIONS: Conditions = {
  genderLimit: null,
  minAgeMale: null,
  maxAgeMale: null,
  minAgeFemale: null,
  maxAgeFemale: null,
  minHeightMaleCm: null,
  minHeightFemaleCm: null,
  requireJobVerified: false,
};

const cond = (over: Partial<Conditions>) => conditionLabel({ ...NO_CONDITIONS, ...over });

describe('참가 조건 문구', () => {
  it('조건이 없으면 null — 없는 줄은 그리지 않는다', () => {
    expect(cond({})).toBeNull();
  });

  it('나이 범위는 물결로', () => {
    expect(cond({ minAgeMale: 25, maxAgeMale: 39, minAgeFemale: 25, maxAgeFemale: 39 })).toBe('남 25~39세 · 여 25~39세');
  });

  it('한쪽 끝만 있으면 그쪽만 적는다', () => {
    expect(cond({ minAgeMale: 30, minAgeFemale: 28 })).toBe('남 30세+ · 여 28세+');
    expect(cond({ maxAgeMale: 45, maxAgeFemale: 45 })).toBe('남 ~45세 · 여 ~45세');
  });

  it('성별 제한이 있으면 그 성별 조건만 남는다 — 반대편 조건이 실려 가면 안 된다', () => {
    const label = cond({ genderLimit: 'FEMALE', minAgeMale: 30, minAgeFemale: 26, minHeightFemaleCm: 160 });
    expect(label).toBe('여성만 · 26세+·160cm+');
    expect(label).not.toContain('30');
  });

  it('키 조건은 나이 뒤에 붙는다', () => {
    expect(cond({ minAgeMale: 25, minHeightMaleCm: 175, minAgeFemale: 25 })).toBe('남 25세+·175cm+ · 여 25세+');
  });

  it('직장 인증은 맨 뒤에 따로', () => {
    expect(cond({ requireJobVerified: true })).toBe('직장인증');
    expect(cond({ minAgeMale: 25, minAgeFemale: 25, requireJobVerified: true })).toBe('남 25세+ · 여 25세+ · 직장인증');
  });
});

describe('feeValue', () => {
  /*
   * 라벨을 되풀이하지 않는다.
   *
   * 초대장 안내 카드의 '참가비' 칸에 "참가비 30,000원"이 들어가 같은 말이 두 번 나오고
   * 있었다. 값과 한 줄짜리 문구를 갈라 둔 이유가 이것이다.
   */
  it('값만 돌려준다 — 표 안에 들어갈 자리', () => {
    expect(feeValue({ fee: 30000, feeFemale: null })).toBe('30,000원');
    expect(feeValue({ fee: 0, feeFemale: null })).toBe('무료');
  });

  it('한 줄짜리 문구에는 라벨이 붙는다 — 목록 카드에는 이 값만 선다', () => {
    expect(feeLabel({ fee: 30000, feeFemale: null })).toBe('참가비 30,000원');
    expect(feeLabel({ fee: 0, feeFemale: null })).toBe('무료');
  });

  it('성별로 값이 다르면 둘 다 적고 라벨은 붙이지 않는다', () => {
    expect(feeValue({ fee: 30000, feeFemale: 20000 })).toBe('남 30,000원 · 여 20,000원');
    expect(feeLabel({ fee: 30000, feeFemale: 20000 })).toBe('남 30,000원 · 여 20,000원');
  });
});
