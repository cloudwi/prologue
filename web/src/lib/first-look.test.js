import { beforeEach, expect, it, vi } from 'vitest';
import { initFirstLook } from './first-look.js';

let root;
let track;
beforeEach(() => {
  document.body.innerHTML = `<div data-first-look>
    <span data-preview-status></span>
    <fieldset data-preview-choices hidden>
      <input type="radio" name="answer" value="outdoors" />
      <input type="radio" name="answer" value="home" />
    </fieldset>
    <p data-preview-placeholder>답을 골라보세요</p>
    <div data-preview-result>
      <button data-preview-reset hidden>다시 고르기</button>
      <p data-preview-answer="outdoors">산책</p>
      <p data-preview-answer="home">요리</p>
    </div>
  </div>`;
  root = document.querySelector('[data-first-look]');
  track = vi.fn();
  initFirstLook(root, track);
});

it('선택한 예시만 열고 다른 답으로 바꿔볼 수 있다', () => {
  expect(root.querySelector('[data-preview-choices]').hidden).toBe(false);
  expect(root.querySelector('[data-preview-result]').hidden).toBe(true);
  root.querySelector('[value="home"]').click();
  expect(root.querySelector('[data-preview-answer="home"]').hidden).toBe(false);
  expect(root.querySelector('[data-preview-answer="outdoors"]').hidden).toBe(true);
  expect(root.querySelector('[data-preview-status]').textContent).toBe('예시 답 읽기');
  root.querySelector('[value="outdoors"]').click();
  expect(root.querySelector('[data-preview-answer="outdoors"]').hidden).toBe(false);
  expect(root.querySelector('[data-preview-answer="home"]').hidden).toBe(true);
});

it('초기화 후 선택지로 포커스를 돌리고 재체험을 중복 완료로 집계하지 않는다', () => {
  root.querySelector('[value="home"]').click();
  root.querySelector('[data-preview-reset]').click();
  expect(root.querySelector('[data-preview-result]').hidden).toBe(true);
  expect(root.querySelector('[data-preview-placeholder]').hidden).toBe(false);
  expect(root.querySelector('[data-preview-status]').textContent).toBe('내 생각 고르기');
  expect([...root.querySelectorAll('input')].every((input) => !input.checked)).toBe(true);
  expect(document.activeElement).toBe(root.querySelector('input'));
  root.querySelector('[value="outdoors"]').click();
  expect(root.querySelector('[data-preview-result]').hidden).toBe(false);
  expect(track).toHaveBeenCalledTimes(1);
  expect(track).toHaveBeenCalledWith('web_preview_completed');
});
