/**
 * 웹 테스트 — 소개 편집기의 왕복을 지킨다.
 *
 * 이 편집기는 평문(`[사진1:50]`·`[가운데]`)과 문서 사이를 오간다. 그 왕복이 어긋나면
 * 모임장이 쓴 글이 저장할 때 달라지거나, 다시 열 때 달라진다 — 둘 다 조용히 일어나서
 * 사람이 발견해야만 알 수 있다. 실제로 오늘 난 버그를 전부 사람이 찾았다.
 *
 * jsdom을 쓰는 이유는 ProseMirror가 진짜 DOM 위에서만 돌기 때문이다. 문법만 따로 떼어
 * 시험할 수도 있지만, 그러면 정작 깨지던 자리(문서 ↔ 평문)를 못 지킨다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
});
