import { beliefChips } from './profile-form';

describe('beliefChips', () => {
  it('적은 항목만 칩이 된다', () => {
    expect(beliefChips('BUDDHIST', 'CENTER')).toEqual(['종교 · 불교', '정치 · 중도']);
    expect(beliefChips('CATHOLIC', null)).toEqual(['종교 · 천주교']);
    expect(beliefChips(null, 'PROGRESSIVE')).toEqual(['정치 · 진보']);
  });

  it('안 적었으면 아무 칩도 만들지 않는다', () => {
    // "무응답" 칩을 만들면 비워둔 것 자체가 정보가 된다.
    expect(beliefChips(null, null)).toEqual([]);
    expect(beliefChips(undefined, undefined)).toEqual([]);
  });

  it('무교는 답이라 칩이 된다', () => {
    // 무교(NONE)와 밝히지 않음(null)은 다른 값이다.
    expect(beliefChips('NONE', null)).toEqual(['종교 · 무교']);
  });

  it('모르는 값은 조용히 버린다', () => {
    // 서버에 새 값이 생겨도 구버전 앱이 빈 칩("종교 · undefined")을 그리지 않아야 한다.
    expect(beliefChips('ZOROASTRIAN', null)).toEqual([]);
  });
});
