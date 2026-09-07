import dashboardSource from '../pages/admin/index.astro?raw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './console-feedback.js';

const feedback = window.consoleFeedback;

beforeEach(() => {
  document.body.innerHTML = '<button id="refresh">새로고침</button><div id="stats"></div>';
});
afterEach(() => {
  vi.useRealTimers();
  delete window.admin;
  delete window.pageLoad;
});

describe('console request feedback', () => {
  it('restores the original button and its event handlers after a request', () => {
    const button = document.querySelector('button');
    const icon = document.createElement('span');
    const click = vi.fn();
    icon.addEventListener('click', click);
    button.append(icon);
    const done = feedback.pending(button, '저장 중');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('저장 중');
    done();
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('새로고침');
    expect(button.hasAttribute('aria-busy')).toBe(false);
    icon.click();
    expect(click).toHaveBeenCalledOnce();
  });

  it('keeps previously disabled controls disabled and cancels delayed feedback', () => {
    vi.useFakeTimers();
    const button = document.querySelector('button');
    button.disabled = true;
    const target = document.querySelector('#stats');
    const done = feedback.loading(target, { buttons: [button] });
    done();
    expect(button.disabled).toBe(true);
    expect(target.hasAttribute('aria-busy')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('explains a slow connection without replacing the skeleton', () => {
    vi.useFakeTimers();
    const target = document.querySelector('#stats');
    const done = feedback.loading(target, { variant: 'stats' });
    const skeleton = target.querySelector('.feedback-layout');
    vi.advanceTimersByTime(8000);
    expect(target.querySelector('[role="status"]').textContent).toContain('연결이 조금 지연');
    expect(target.querySelector('.feedback-layout')).toBe(skeleton);
    done();
  });

  it('treats empty state text as text, and offers a retry for a failed request', () => {
    const target = document.querySelector('#stats');
    feedback.empty(target, '<img src=x onerror=alert(1)>');
    expect(target.querySelector('img')).toBeNull();
    expect(target.textContent).toContain('<img');
    const retry = vi.fn();
    feedback.error(target, retry);
    target.querySelector('button').click();
    expect(retry).toHaveBeenCalledOnce();
    expect(target.querySelector('[role="alert"]')).not.toBeNull();
  });
});

describe('admin dashboard requests', () => {
  function dashboard(api) {
    window.admin = {
      ...feedback,
      $: (id) => document.getElementById(id), api, showLogin: vi.fn(),
      loading: (target, options) => feedback.loading(target, { ...options, buttons: [document.querySelector('#refresh')] }),
    };
    const script = dashboardSource.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
    new Function(script)();
  }

  it('prevents duplicate refreshes, restores controls on failure, and retries successfully', async () => {
    let reject;
    const api = vi.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    dashboard(api);
    const request = window.pageLoad();
    await window.pageLoad();
    expect(api).toHaveBeenCalledOnce();
    expect(document.querySelector('#refresh').disabled).toBe(true);
    reject(new Error('offline'));
    await request;
    expect(document.querySelector('#refresh').disabled).toBe(false);
    expect(document.querySelector('#stats').hasAttribute('aria-busy')).toBe(false);
    api.mockResolvedValue({ totalMembers: 4, femaleMembers: 2, maleMembers: 2, joinedToday: 1, weeklyActive: 4, answersToday: 2, revealsToday: 3, pendingReports: 0, suspendedAccounts: 0 });
    document.querySelector('.feedback-retry').click();
    await vi.waitFor(() => expect(document.querySelectorAll('.admin-stat')).toHaveLength(8));
    expect(document.querySelector('.feedback-loading')).toBeNull();
    expect(document.querySelector('.feedback-message')).toBeNull();
  });

  it('still redirects an expired session and releases the loading state', async () => {
    dashboard(vi.fn().mockRejectedValue(Object.assign(new Error('expired'), { auth: true })));
    await window.pageLoad();
    expect(window.admin.showLogin).toHaveBeenCalledOnce();
    expect(document.querySelector('#refresh').disabled).toBe(false);
    expect(document.querySelector('#stats').hasAttribute('aria-busy')).toBe(false);
  });
});
