/**
 * 소개 편집기의 왕복 — 평문 ↔ 문서.
 *
 * 여기가 틀리면 **조용히** 틀린다. 모임장이 쓴 글이 저장할 때 달라지거나 다시 열 때
 * 달라지는데, 화면은 멀쩡해 보인다. 오늘 난 버그를 전부 사람이 찾은 이유가 이것이다.
 *
 * 문법은 서버와 한 몸이다(MeetupInvitationPage·MeetupService). 한쪽만 고치면 초대장이
 * 두 얼굴이 되므로, 여기서 지키는 것은 "우리가 내보내는 평문의 모양"이다.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDescEditor } from './desc-editor.js';

let mount;
let editor;

function make(options = {}) {
  editor = createDescEditor({
    mount,
    onChange: () => {},
    onFiles: () => {},
    ...options,
  });
  return editor;
}

/** 평문을 실었다가 그대로 돌려받는지 — 이 함수가 이 파일의 핵심이다. */
function roundTrip(text, images = []) {
  const e = make();
  e.setContent(text, images);
  return e.getText();
}

beforeEach(() => {
  mount = document.createElement('div');
  document.body.appendChild(mount);
});

afterEach(() => {
  editor?.destroy();
  editor = null;
  mount.remove();
});

const PHOTO = 'https://cdn.example.com/1.png';
const PHOTO2 = 'https://cdn.example.com/2.png';

describe('평문 왕복', () => {
  it('글만 있는 경우 그대로 돌아온다', () => {
    expect(roundTrip('첫 줄\n둘째 줄')).toBe('첫 줄\n둘째 줄');
  });

  it('빈 줄을 지킨다 — 문단 사이 간격은 글쓴이가 정한 것이다', () => {
    expect(roundTrip('앞\n\n뒤')).toBe('앞\n\n뒤');
  });

  it('사진 표시가 그대로 돌아온다', () => {
    expect(roundTrip('앞\n[사진1]\n뒤', [PHOTO])).toBe('앞\n[사진1]\n뒤');
  });

  it('폭이 붙은 표시도 그대로 돌아온다', () => {
    expect(roundTrip('[사진1:25]', [PHOTO])).toBe('[사진1:25]');
    expect(roundTrip('[사진1:50]', [PHOTO])).toBe('[사진1:50]');
    expect(roundTrip('[사진1:75]', [PHOTO])).toBe('[사진1:75]');
  });

  it('폭 100은 표시를 붙이지 않는다 — 기본값을 적어 두면 글자 수만 축낸다', () => {
    expect(roundTrip('[사진1:100]', [PHOTO])).toBe('[사진1]');
  });

  it('가운데 표시가 그대로 돌아온다', () => {
    expect(roundTrip('[가운데]머리줄\n본문')).toBe('[가운데]머리줄\n본문');
  });

  it('사진과 가운데가 섞여도 무너지지 않는다', () => {
    const text = '앞\n\n[가운데]머리줄\n\n[사진1:50]\n본문\n\n[가운데]맺는 줄';
    expect(roundTrip(text, [PHOTO])).toBe(text);
  });

  it('사진 두 장의 번호가 뒤바뀌지 않는다', () => {
    const text = '[사진1]\n사이 글\n[사진2:25]';
    expect(roundTrip(text, [PHOTO, PHOTO2])).toBe(text);
  });

  it('빈 글은 빈 글로 남는다', () => {
    expect(roundTrip('')).toBe('');
  });
});

describe('망가진 입력', () => {
  it('가리키는 사진이 없는 표시는 조용히 사라진다 — 초대장과 같은 규칙', () => {
    expect(roundTrip('앞\n[사진9]\n뒤', [PHOTO])).toBe('앞\n뒤');
  });

  it('알 수 없는 폭은 가장 가까운 칸으로 붙는다', () => {
    expect(roundTrip('[사진1:10]', [PHOTO])).toBe('[사진1:25]');
    expect(roundTrip('[사진1:60]', [PHOTO])).toBe('[사진1:50]');
    expect(roundTrip('[사진1:63]', [PHOTO])).toBe('[사진1:75]'); // 63은 50보다 75에 가깝다
    expect(roundTrip('[사진1:99]', [PHOTO])).toBe('[사진1]');
  });

  it('표시를 닮았을 뿐인 글자는 글자로 남는다 — 사람이 쓴 말을 지우면 안 된다', () => {
    expect(roundTrip('[사진]과 [사진 1] 이야기')).toBe('[사진]과 [사진 1] 이야기');
  });

  it('끝의 빈 줄은 떨군다 — 사진 뒤에 편집기가 놓아주는 자리는 글이 아니다', () => {
    expect(roundTrip('본문\n\n\n')).toBe('본문');
  });
});

describe('사진 목록', () => {
  it('문서에 놓인 순서대로 뽑힌다', () => {
    const e = make();
    e.setContent('[사진1]\n[사진2]', [PHOTO, PHOTO2]);
    expect(e.getImages()).toEqual([PHOTO, PHOTO2]);
  });

  it('같은 사진을 두 번 써도 목록에는 한 번만 담긴다', () => {
    const e = make();
    e.setContent('[사진1]\n사이\n[사진1]', [PHOTO]);
    expect(e.getImages()).toEqual([PHOTO]);
    expect(e.getText()).toBe('[사진1]\n사이\n[사진1]');
  });

  it('남은 자리를 센다', () => {
    const e = make({ maxImages: 3 });
    e.setContent('[사진1]', [PHOTO]);
    expect(e.roomForImages()).toBe(2);
  });
});

describe('정렬과 크기', () => {
  it('가운데를 걸고 풀 수 있다', () => {
    const e = make();
    e.setContent('한 줄', []);
    e.focus();
    e.toggleCenter();
    expect(e.getText()).toBe('[가운데]한 줄');
    e.toggleCenter();
    expect(e.getText()).toBe('한 줄');
  });

  it('고른 사진이 없으면 크기를 묻어도 아무 일도 없다', () => {
    const e = make();
    e.setContent('글만 있다', []);
    expect(e.imageWidth()).toBeNull();
    e.setImageWidth(50);
    expect(e.getText()).toBe('글만 있다');
  });
});
