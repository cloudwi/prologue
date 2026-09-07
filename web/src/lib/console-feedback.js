// Inline in both consoles so feedback is available before each page's first request.
// Keep server messages as text: admin screens display user-provided content.
(() => {
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  const spinner = () => {
    const el = node('span', 'feedback-spinner');
    el.setAttribute('aria-hidden', 'true');
    return el;
  };

  function pending(button, label = button.textContent.trim()) {
    const children = [...button.childNodes];
    const disabled = button.disabled;
    const busy = button.getAttribute('aria-busy');
    const width = button.style.minWidth;
    button.style.minWidth = `${button.getBoundingClientRect().width}px`;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.replaceChildren(spinner(), document.createTextNode(label));
    return () => {
      button.replaceChildren(...children);
      button.disabled = disabled;
      button.style.minWidth = width;
      if (busy === null) button.removeAttribute('aria-busy');
      else button.setAttribute('aria-busy', busy);
    };
  }

  function loading(target, { variant = 'rows', label = '목록을 불러오고 있어요', count, buttons = [] } = {}) {
    const restore = buttons.filter(Boolean).map((button) => pending(button));
    target.setAttribute('aria-busy', 'true');
    const wrap = node('div', `feedback-loading feedback-loading--${variant}`);
    const status = node('div', 'feedback-status');
    status.setAttribute('role', 'status');
    status.append(spinner(), node('span', 'feedback-sr-only', label));
    wrap.append(status);
    if (variant !== 'spinner') {
      const layout = node('div', `feedback-layout feedback-layout--${variant}`);
      layout.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < (count ?? (variant === 'stats' ? 8 : 3)); i++) {
        const item = node('div', `feedback-placeholder feedback-placeholder--${variant}`);
        if (variant === 'cards') item.append(node('span', 'feedback-bone feedback-cover'));
        const lines = node('div', 'feedback-lines');
        lines.append(node('span', 'feedback-bone feedback-line--title'), node('span', 'feedback-bone feedback-line--meta'));
        if (variant !== 'stats') lines.append(node('span', 'feedback-bone feedback-line--short'));
        item.append(lines);
        layout.append(item);
      }
      wrap.append(layout);
    }
    target.replaceChildren(wrap);
    const slow = setTimeout(() => {
      const text = status.lastElementChild;
      text.classList.remove('feedback-sr-only');
      text.textContent = '연결이 조금 지연되고 있어요. 잠시만 기다려 주세요.';
    }, 8000);
    return () => {
      clearTimeout(slow);
      target.removeAttribute('aria-busy');
      restore.forEach((done) => done());
    };
  }

  function message(target, { title, description, retry, error = false }) {
    const box = node('div', `feedback-message${error ? ' feedback-message--error' : ''}`);
    box.setAttribute('role', error ? 'alert' : 'status');
    const mark = node('span', 'feedback-mark', error ? '!' : '—');
    mark.setAttribute('aria-hidden', 'true');
    box.append(mark, node('strong', 'feedback-title', title));
    if (description) box.append(node('p', 'feedback-description', description));
    if (retry) {
      const button = node('button', 'feedback-retry', '다시 시도');
      button.type = 'button';
      button.addEventListener('click', () => retry());
      box.append(button);
    }
    target.replaceChildren(box);
  }

  window.consoleFeedback = {
    loading, pending,
    empty: (target, title, description) => message(target, { title, description }),
    error: (target, retry) => message(target, {
      title: '화면을 불러오지 못했어요',
      description: '연결을 확인한 뒤 다시 시도해 주세요.',
      retry, error: true,
    }),
  };
})();
