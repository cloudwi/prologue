/** 가입 전에는 예시 답변만 보여주며 선택을 전송하거나 저장하지 않는다. */
export function initFirstLook(root, track = () => {}) {
  const choices = root.querySelector('[data-preview-choices]');
  const placeholder = root.querySelector('[data-preview-placeholder]');
  const result = root.querySelector('[data-preview-result]');
  const answers = [...root.querySelectorAll('[data-preview-answer]')];
  const inputs = [...choices.querySelectorAll('input[type="radio"]')];
  const reset = root.querySelector('[data-preview-reset]');
  const status = root.querySelector('[data-preview-status]');
  function update() {
    const selected = inputs.find((input) => input.checked)?.value;
    result.hidden = !selected;
    placeholder.hidden = !!selected;
    answers.forEach((answer) => { answer.hidden = answer.dataset.previewAnswer !== selected; });
    if (status) status.textContent = selected ? '예시 답 읽기' : '내 생각 고르기';
  }
  reset?.addEventListener('click', () => {
    inputs.forEach((input) => { input.checked = false; });
    update();
    inputs[0]?.focus();
  });
  let completed = false;
  inputs.forEach((input) => input.addEventListener('change', () => {
    update();
    if (!completed) { completed = true; track('web_preview_completed'); }
  }));
  update();
  choices.hidden = false;
  if (reset) reset.hidden = false;
}
