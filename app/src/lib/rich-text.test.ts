import { parseRich, plainText } from './rich-text';

/**
 * 표시 문법 — 백엔드·콘솔과 **한 몸**이다.
 *
 * 같은 글을 초대장 웹과 앱이 각자 그린다. 한쪽만 문법이 자라면 같은 모임이 두 얼굴이 되고,
 * 그 차이는 아무도 오류로 알아채지 못한다 — 그냥 앱에서만 사진이 빠져 보인다.
 * 그래서 규칙을 여기 못 박는다: MeetupInvitationPage.kt, desc-editor.js와 같은 규칙이다.
 */
const A = 'https://cdn.example.com/1.jpg';
const B = 'https://cdn.example.com/2.jpg';

describe('parseRich', () => {
  it('글만 있으면 한 덩이다', () => {
    expect(parseRich('첫 줄\n둘째 줄')).toEqual([{ kind: 'text', text: '첫 줄\n둘째 줄', align: 'left' }]);
  });

  it('사진 표시는 그 자리에서 글을 끊는다', () => {
    expect(parseRich('앞\n[사진1]\n뒤', [A])).toEqual([
      { kind: 'text', text: '앞', align: 'left' },
      { kind: 'photo', url: A, width: 100, ratio: null },
      { kind: 'text', text: '뒤', align: 'left' },
    ]);
  });

  it('가리키는 사진이 없는 표시는 조용히 지운다 — 글자로 남는 것보다 낫다', () => {
    expect(parseRich('앞\n[사진3]\n뒤', [])).toEqual([
      { kind: 'text', text: '앞\n뒤', align: 'left' },
    ]);
  });

  it('폭을 읽는다', () => {
    expect(parseRich('[사진1:50]', [A])).toEqual([{ kind: 'photo', url: A, width: 50, ratio: null }]);
  });

  it('네 칸 밖의 폭은 가까운 칸에 붙는다 — 콘솔이 정할 수 있는 건 넷뿐이다', () => {
    expect(parseRich('[사진1:63]', [A])[0]).toMatchObject({ width: 75 });
    expect(parseRich('[사진1:10]', [A])[0]).toMatchObject({ width: 25 });
  });

  it('원본 크기를 비율로 바꾼다 — 사진이 오기 전에 자리를 잡으라고 실려 온 값이다', () => {
    expect(parseRich('[사진1:100:1200x900]', [A])[0]).toMatchObject({ ratio: 1200 / 900 });
  });

  it('말이 안 되는 크기는 비율 없이 지나간다', () => {
    expect(parseRich('[사진1:100:0x900]', [A])[0]).toMatchObject({ ratio: null });
    expect(parseRich('[사진1:100:99999x900]', [A])[0]).toMatchObject({ ratio: null });
  });

  it('정렬 표시를 읽고 글에서는 떼어낸다', () => {
    expect(parseRich('[가운데]머리줄')).toEqual([{ kind: 'text', text: '머리줄', align: 'center' }]);
    expect(parseRich('[오른쪽]— 프롤로그 드림')).toEqual([
      { kind: 'text', text: '— 프롤로그 드림', align: 'right' },
    ]);
  });

  it('정렬이 바뀌면 덩이가 끊긴다 — 한 덩이는 한 정렬이다', () => {
    expect(parseRich('[가운데]머리\n본문')).toEqual([
      { kind: 'text', text: '머리', align: 'center' },
      { kind: 'text', text: '본문', align: 'left' },
    ]);
  });

  it('같은 정렬이 이어지면 한 덩이로 묶는다 — 줄마다 끊으면 간격이 벌어진다', () => {
    expect(parseRich('[가운데]한 줄\n[가운데]두 줄')).toEqual([
      { kind: 'text', text: '한 줄\n두 줄', align: 'center' },
    ]);
  });

  it('사진 여러 장을 순서대로 가리킨다', () => {
    expect(parseRich('[사진2]\n[사진1]', [A, B])).toEqual([
      { kind: 'photo', url: B, width: 100, ratio: null },
      { kind: 'photo', url: A, width: 100, ratio: null },
    ]);
  });

  it('표시를 닮았을 뿐인 글자는 남는다 — 사람이 쓴 말을 지우면 안 된다', () => {
    expect(parseRich('[사진]과 [사진 1] 이야기')).toEqual([
      { kind: 'text', text: '[사진]과 [사진 1] 이야기', align: 'left' },
    ]);
  });

  it('빈 글은 아무것도 아니다', () => {
    expect(parseRich(null)).toEqual([]);
    expect(parseRich('')).toEqual([]);
    expect(parseRich('   ')).toEqual([]);
  });
});

describe('plainText', () => {
  it('표시를 걷어낸다 — 조판할 자리가 없는 한 줄 요약에 쓴다', () => {
    expect(plainText('[가운데]앞\n[사진1:50]\n[오른쪽]뒤')).toBe('앞\n\n뒤');
  });

  it('빈 글은 빈 문자열이다', () => {
    expect(plainText(null)).toBe('');
  });
});
