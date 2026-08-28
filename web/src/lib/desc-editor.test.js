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

  it('오른쪽 표시가 그대로 돌아온다', () => {
    expect(roundTrip('본문\n[오른쪽]— 프롤로그 드림')).toBe('본문\n[오른쪽]— 프롤로그 드림');
  });

  it('왼쪽은 표시를 붙이지 않는다 — 기본값을 적어 두면 글자 수만 축낸다', () => {
    const e = make();
    e.setContent('한 줄', []);
    e.focus();
    e.setAlign('center');
    expect(e.getText()).toBe('[가운데]한 줄');
    e.setAlign('left');
    expect(e.getText()).toBe('한 줄');
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
  it('세 정렬을 오간다', () => {
    const e = make();
    e.setContent('한 줄', []);
    e.focus();
    expect(e.align()).toBe('left');
    e.setAlign('center');
    expect(e.align()).toBe('center');
    e.setAlign('right');
    expect(e.align()).toBe('right');
    expect(e.getText()).toBe('[오른쪽]한 줄');
    e.setAlign('left');
    expect(e.align()).toBe('left');
  });

  it('고른 사진이 없으면 크기를 묻어도 아무 일도 없다', () => {
    const e = make();
    e.setContent('글만 있다', []);
    expect(e.imageWidth()).toBeNull();
    e.setImageWidth(50);
    expect(e.getText()).toBe('글만 있다');
  });
});

/*
 * 원본 크기 — 사진이 도착하기 전에 자리를 잡아두라고 초대장에 알려주는 숫자다.
 *
 * jsdom은 사진을 실제로 받아오지 않아 naturalWidth가 늘 0이다. 그래서 여기서 확인하는 것은
 * "화면에서 읽어낸 크기"가 아니라 **불러온 글에 적혀 있던 크기가 저장할 때 살아남는가**이다.
 * 사진이 아직 안 떴을 때 저장하면 크기가 조용히 사라지던 자리라 이쪽이 더 중요하다.
 */
describe('원본 크기', () => {
  it('크기가 적힌 표시를 그대로 돌려준다', () => {
    expect(roundTrip('[사진1:100:1200x1115]', [PHOTO])).toBe('[사진1:100:1200x1115]');
  });

  it('폭과 크기가 같이 붙어도 왕복한다', () => {
    expect(roundTrip('[사진1:50:800x600]', [PHOTO])).toBe('[사진1:50:800x600]');
  });

  it('크기를 알면 폭이 100이어도 폭을 적는다 — 자리를 비우면 크기가 폭으로 읽힌다', () => {
    const e = make();
    e.setContent('[사진1:100:1200x1115]', [PHOTO]);
    expect(e.getText()).not.toBe('[사진1:1200x1115]');
  });

  it('크기가 없던 시절의 표시는 크기 없이 그대로 나간다', () => {
    expect(roundTrip('[사진1]', [PHOTO])).toBe('[사진1]');
    expect(roundTrip('[사진1:50]', [PHOTO])).toBe('[사진1:50]');
  });

  it('말이 안 되는 크기는 버린다', () => {
    expect(roundTrip('[사진1:50:0x600]', [PHOTO])).toBe('[사진1:50]');
    expect(roundTrip('[사진1:50:99999x600]', [PHOTO])).toBe('[사진1:50]');
  });

  it('폭을 바꿔도 크기는 남는다', () => {
    const e = make();
    e.setContent('[사진1:100:1200x1115]', [PHOTO]);
    e.focus();
    e.setImageWidth(50);
    expect(e.getText()).toBe('[사진1:50:1200x1115]');
  });

  it('글 사이에 끼어도 앞뒤 줄을 건드리지 않는다', () => {
    const text = '앞 줄\n[사진1:75:1200x1115]\n뒤 줄';
    expect(roundTrip(text, [PHOTO])).toBe(text);
  });
});

/*
 * 올라가는 중인 사진 — 자리에 먼저 앉고 주소는 나중에 갈아 끼운다.
 *
 * 여기가 틀리면 blob: 주소가 그대로 저장되고, 초대장에는 **영영 뜨지 않는 사진**이 걸린다.
 * 저장한 사람 눈에는 한참 뒤에야 보이는 종류의 고장이다.
 */
describe('올라가는 중인 사진', () => {
  const LOCAL = 'blob:https://prologue.day/abc-123';

  it('아직 올라가는 중인 사진이 있으면 그렇다고 말한다', () => {
    const e = make();
    e.setContent('', []);
    e.insertImage(LOCAL);
    expect(e.hasPendingImages()).toBe(true);
    e.replaceImage(LOCAL, PHOTO);
    expect(e.hasPendingImages()).toBe(false);
  });

  it('주소만 갈아 끼우고 폭은 건드리지 않는다', () => {
    const e = make();
    e.setContent('[사진1:50]', [LOCAL]);
    e.replaceImage(LOCAL, PHOTO);
    expect(e.getText()).toBe('[사진1:50]');
    expect(e.getImages()).toEqual([PHOTO]);
  });

  it('알아둔 원본 크기도 새 주소로 따라간다', () => {
    const e = make();
    e.setContent('[사진1:75:1200x1115]', [LOCAL]);
    e.replaceImage(LOCAL, PHOTO);
    expect(e.getText()).toBe('[사진1:75:1200x1115]');
    expect(e.getImages()).toEqual([PHOTO]);
  });

  it('올리지 못한 사진은 자리에서 걷어내고 글은 남긴다', () => {
    const e = make();
    e.setContent('앞 줄\n[사진1]\n뒤 줄', [LOCAL]);
    expect(e.removeImage(LOCAL)).toBe(true);
    expect(e.getText()).toBe('앞 줄\n뒤 줄');
    expect(e.getImages()).toEqual([]);
  });

  it('없는 사진을 걷어내라고 해도 글은 그대로다', () => {
    const e = make();
    e.setContent('그냥 글', []);
    expect(e.removeImage(LOCAL)).toBe(false);
    expect(e.getText()).toBe('그냥 글');
  });

  it('같은 사진이 두 번 놓여 있어도 둘 다 갈아 끼운다', () => {
    const e = make();
    e.setContent('[사진1]\n사이\n[사진1]', [LOCAL]);
    e.replaceImage(LOCAL, PHOTO);
    expect(e.hasPendingImages()).toBe(false);
    expect(e.getText()).toBe('[사진1]\n사이\n[사진1]');
    expect(e.getImages()).toEqual([PHOTO]);
  });
});
