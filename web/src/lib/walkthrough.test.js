import { beforeEach, describe, expect, it } from 'vitest';
import { initWalkthrough } from './walkthrough.js';

let root;
beforeEach(() => {
  document.body.innerHTML = `<div data-walkthrough><div role="tablist" hidden>${[0, 1, 2].map((i) => `<button role="tab" id="tab-${i}" aria-controls="panel-${i}">단계 ${i + 1}</button>`).join('')}</div>${[0, 1, 2].map((i) => `<article role="tabpanel" id="panel-${i}">설명 ${i + 1}</article>`).join('')}</div>`;
  root = document.querySelector('[data-walkthrough]');
});

describe('app walkthrough navigation', () => {
  it('keeps all explanations available before enhancement, then shows the selected step', () => {
    expect([...root.querySelectorAll('article')].every((panel) => !panel.hidden)).toBe(true);
    initWalkthrough(root);
    expect(root.querySelector('[role="tablist"]').hidden).toBe(false);
    root.querySelector('#tab-2').click();
    expect(root.querySelector('#panel-2').hidden).toBe(false);
    expect(root.querySelector('#panel-0').hidden).toBe(true);
    expect(root.querySelector('#tab-2').getAttribute('aria-selected')).toBe('true');
  });

  it('supports arrow wraparound and Home/End with a single tab stop', () => {
    initWalkthrough(root);
    const key = (id, key) => root.querySelector(id).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    key('#tab-0', 'ArrowLeft');
    expect(document.activeElement.id).toBe('tab-2');
    key('#tab-2', 'ArrowRight');
    expect(document.activeElement.id).toBe('tab-0');
    key('#tab-0', 'End');
    expect(document.activeElement.id).toBe('tab-2');
    key('#tab-2', 'Home');
    expect(document.activeElement.id).toBe('tab-0');
    expect([...root.querySelectorAll('button')].filter((tab) => tab.tabIndex === 0)).toHaveLength(1);
  });

  it('lets Tab leave the tablist without intercepting keyboard navigation', () => {
    initWalkthrough(root);
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    root.querySelector('#tab-0').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(root.querySelector('#panel-0').hidden).toBe(false);
  });
});
