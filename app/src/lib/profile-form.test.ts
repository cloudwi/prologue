import { profileTags } from './profile-form';

describe('profileTags', () => {
  it('고른 항목만 짧은 태그가 된다', () => {
    expect(
      profileTags({
        smoking: 'NONE',
        drinking: 'SOMETIMES',
        meetFrequency: 'TWO_TO_THREE',
        religion: 'BUDDHIST',
        politicalLeaning: 'CENTER',
      }),
    ).toEqual(['비흡연', '가끔 한잔', '주 2~3회', '불교', '중도']);
  });

  it('안 고른 항목은 아예 빠진다', () => {
    // "무응답" 태그를 만들면 비워둔 것 자체가 정보가 된다.
    expect(profileTags({})).toEqual([]);
    expect(profileTags({ smoking: null, religion: undefined })).toEqual([]);
    expect(profileTags({ drinking: 'NONE' })).toEqual(['술 안 함']);
  });

  it('무교는 답이라 태그가 된다', () => {
    // 무교(NONE)와 밝히지 않음(null)은 다른 값이다.
    expect(profileTags({ religion: 'NONE' })).toEqual(['무교']);
  });

  it('홀로 있어도 무슨 항목인지 읽히게 앞말을 붙인다', () => {
    expect(profileTags({ politicalLeaning: 'APOLITICAL' })).toEqual(['정치 관심 없음']);
    expect(profileTags({ meetFrequency: 'FLEXIBLE' })).toEqual(['만남 그때그때']);
  });

  it('모르는 값은 조용히 버린다', () => {
    // 서버에 새 값이 생겨도 구버전 앱이 빈 태그를 그리지 않아야 한다.
    expect(profileTags({ religion: 'ZOROASTRIAN', smoking: 'VAPING' })).toEqual([]);
  });
});
