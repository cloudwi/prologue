import { beforeEach, expect, it, vi } from 'vitest';
import { createWebAnalytics } from './web-analytics';
import { initFirstLook } from './first-look';

function browser(pathname = '/', search = '') {
  return { location: { pathname, search }, sessionStorage, crypto: { randomUUID: () => 'synthetic-session' },
    navigator: { sendBeacon: vi.fn().mockReturnValue(false) }, fetch: vi.fn().mockResolvedValue({ ok: true }) };
}
beforeEach(() => sessionStorage.clear());

it('답변이나 전체 URL 없이 허용된 채널과 행동만 보내며 페이지 이동에도 세션을 유지한다', () => {
  const first = browser('/', '?utm_source=instagram&utm_medium=organic_social&utm_campaign=first_connection&email=private@example.test&answer=private');
  createWebAnalytics({ key: 'test-project-token', enabled: true, browser: first })('web_preview_completed', 'private');
  const payload = JSON.parse(first.fetch.mock.calls[0][1].body);
  expect(payload.properties).toEqual({ source: 'instagram', medium: 'organic_social', campaign: 'first_connection', page: '/', $process_person_profile: false });
  expect(first.fetch.mock.calls[0][1].body).not.toContain('private');
  const next = browser('/download');
  createWebAnalytics({ key: 'test-project-token', enabled: true, browser: next })('web_store_opened', 'android');
  const download = JSON.parse(next.fetch.mock.calls[0][1].body);
  expect(download.distinct_id).toBe(payload.distinct_id);
  expect(download.properties).toMatchObject({ source: 'instagram', store: 'android' });
});

it('개발·설정 없음·관리자 경로·추적 거부에서는 전송하지 않는다', () => {
  for (const variant of [
    { key: '', enabled: true, browser: browser() },
    { key: 'test', enabled: false, browser: browser() },
    { key: 'test', enabled: true, browser: browser('/admin') },
    { key: 'test', enabled: true, browser: { ...browser(), navigator: { doNotTrack: '1' } } },
  ]) {
    createWebAnalytics(variant)('web_landing_viewed');
    expect(variant.browser.fetch).not.toHaveBeenCalled();
  }
});

it('임의 이벤트와 채널 값을 보내지 않고 전송 실패도 화면에 전파하지 않는다', () => {
  const env = browser('/', '?utm_source=private_user&utm_campaign=private_user');
  env.fetch.mockRejectedValue(new Error('synthetic offline'));
  const track = createWebAnalytics({ key: 'test', enabled: true, browser: env });
  track('arbitrary_private_event');
  expect(env.fetch).not.toHaveBeenCalled();
  expect(() => track('web_landing_viewed')).not.toThrow();
  expect(JSON.parse(env.fetch.mock.calls[0][1].body).properties.source).toBe('other');
});

it('웹 체험에서 선택을 바꿔도 완료는 한 번만 집계하고 선택값을 전달하지 않는다', () => {
  document.body.innerHTML = '<div id="preview"><fieldset data-preview-choices><input type="radio" name="q" value="one"><input type="radio" name="q" value="two"></fieldset><div data-preview-placeholder></div><div data-preview-result><div data-preview-answer="one"></div><div data-preview-answer="two"></div></div></div>';
  const root = document.getElementById('preview');
  const track = vi.fn();
  initFirstLook(root, track);
  const inputs = root.querySelectorAll('input');
  inputs[0].checked = true; inputs[0].dispatchEvent(new Event('change'));
  inputs[1].checked = true; inputs[1].dispatchEvent(new Event('change'));
  expect(track).toHaveBeenCalledExactlyOnceWith('web_preview_completed');
  expect(root.querySelector('[data-preview-answer="one"]').hidden).toBe(true);
  expect(root.querySelector('[data-preview-answer="two"]').hidden).toBe(false);
});
