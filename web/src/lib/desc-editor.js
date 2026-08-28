/**
 * 모임 소개 글 편집기.
 *
 * 화면에서는 사진이 글자들 사이에 실제 그림으로 앉아 있고 잡아끌어 크기를 바꾼다. 그런데
 * **저장되는 것은 여전히 평문이다** — `[사진1]`, 폭을 정했으면 `[사진1:50]`. 초대장과 서버는
 * 어제 읽던 것을 그대로 읽고, 지금 스토어에 있는 앱도 달라진 것을 모른다. 편집기를 바꾸는
 * 일과 저장 형식을 바꾸는 일은 다른 일이고, 여기서는 앞의 것만 한다.
 *
 * 그래서 HTML을 뱉는 편집기(SunEditor·TinyMCE·CKEditor)를 쓰지 않았다. 그것들을 쓰면
 * 남의 HTML을 받게 되고, 초대장이 **이스케이프한 뒤에 우리 표시만 치환**하며 지켜온 안전을
 * 서버 쪽 소독기로 다시 사야 한다. Tiptap은 직렬화를 우리가 쥔다.
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ImageResize } from 'tiptap-extension-resize-image';

/**
 * 폭은 네 칸뿐이다.
 *
 * 초대장은 폰에서 380px 폭으로 읽힌다. 콘솔에서 잡아끈 63%는 거기서 다른 그림이 된다.
 * 그래서 잡아끌기는 그대로 두되 손을 떼면 가까운 칸에 붙는다 — 노션이 하는 방식이다.
 */
const WIDTHS = [25, 50, 75, 100];
const nearest = (pct) => WIDTHS.reduce((a, b) => (Math.abs(b - pct) < Math.abs(a - pct) ? b : a), 100);

/** 확장은 크기를 `containerStyle`이라는 CSS 문자열에 담는다 — 거기서 폭만 꺼낸다. */
function widthFromStyle(style, hostWidth) {
  const m = /width:\s*([\d.]+)(px|%)/i.exec(style || '');
  if (!m) return 100;
  const value = Number(m[1]);
  if (m[2] === '%') return value;
  if (!hostWidth) return 100;
  return (value / hostWidth) * 100;
}

const styleFor = (pct) => `width: ${pct}%; height: auto; cursor: pointer;`;

/**
 * @param {object} o
 * @param {HTMLElement} o.mount        편집기가 들어설 자리
 * @param {() => void} o.onChange      내용이 바뀔 때마다 (글자 수·미리보기 갱신)
 * @param {(files: File[]) => void} o.onFiles  사진 파일이 들어왔을 때 (업로드는 부르는 쪽 몫)
 * @param {number} o.maxImages
 */
export function createDescEditor({ mount, onChange, onFiles, maxImages = 10 }) {
  // 다시 그리는 중에 또 불려 들어오지 않게 — 붙임(snap)이 자기 자신을 부르면 멈추지 않는다.
  let snapping = false;

  const editor = new Editor({
    element: mount,
    extensions: [
      /*
       * 저장할 수 없는 것은 주지 않는다.
       *
       * 굵게·기울임·목록·제목을 열어두면 화면에서만 예뻐 보이고 저장할 때 사라진다.
       * 도구가 결과를 배신하는 것보다 나쁜 건 없다. 글은 평문이고, 평문으로 남는다.
       */
      StarterKit.configure({
        blockquote: false, bold: false, bulletList: false, code: false, codeBlock: false,
        heading: false, horizontalRule: false, italic: false, link: false,
        listItem: false, listKeymap: false, orderedList: false, strike: false, underline: false,
      }),
      ImageResize.configure({ inline: false, allowBase64: false }),
    ],
    editorProps: {
      // 사진을 글 위로 끌어다 놓거나 붙여넣는다. 파일이 아니면 브라우저가 하던 대로 둔다.
      handleDrop: (_view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return false;
        event.preventDefault();
        onFiles(files);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return false;
        event.preventDefault();
        onFiles(files);
        return true;
      },
    },
    onUpdate: () => {
      if (snapping) return;
      snapImages();
      onChange();
    },
  });

  /** 잡아끈 크기를 네 칸 중 가까운 곳에 붙인다. 바뀐 게 없으면 아무 일도 하지 않아 여기서 멈춘다. */
  function snapImages() {
    const hostWidth = editor.view.dom.clientWidth;
    const tr = editor.state.tr;
    let changed = false;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'imageResize') return;
      const want = styleFor(nearest(widthFromStyle(node.attrs.containerStyle, hostWidth)));
      if (node.attrs.containerStyle !== want) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, containerStyle: want });
        changed = true;
      }
    });
    if (!changed) return;
    snapping = true;
    // 되돌리기 이력에는 남기지 않는다 — 붙는 것은 사용자의 한 수가 아니라 그 수의 마무리다.
    editor.view.dispatch(tr.setMeta('addToHistory', false));
    snapping = false;
  }

  /** 문서 → 평문과 사진 목록. 같은 사진을 두 번 써도 목록에는 한 번만 담는다. */
  function serialize() {
    const hostWidth = editor.view.dom.clientWidth;
    const images = [];
    const lines = [];
    editor.state.doc.forEach((node) => {
      if (node.type.name === 'imageResize') {
        const src = node.attrs.src;
        if (!src) return;
        let i = images.indexOf(src);
        if (i === -1) i = images.push(src) - 1;
        const pct = nearest(widthFromStyle(node.attrs.containerStyle, hostWidth));
        lines.push(pct === 100 ? `[사진${i + 1}]` : `[사진${i + 1}:${pct}]`);
        return;
      }
      let line = '';
      node.forEach((child) => { line += child.type.name === 'hardBreak' ? '\n' : (child.text ?? ''); });
      lines.push(line);
    });
    /*
     * 끝의 빈 줄은 떨군다.
     *
     * 사진으로 글이 끝나면 편집기가 그 아래에 빈 문단을 하나 놓아준다(trailingNode) —
     * 사진 뒤를 이어 쓸 자리가 없으면 갇히기 때문이다. 그 자리는 쓰기 위한 것이지
     * 글의 일부가 아니다. 남겨두면 글자 수가 어긋나고 초대장에도 빈 문단이 하나 늘어난다.
     */
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    return { text: lines.join('\n'), images };
  }

  /** 평문과 사진 목록 → 문서. 가리키는 사진이 없는 표시는 조용히 지운다 — 초대장과 같은 규칙이다. */
  function parse(text, images) {
    const content = [];
    for (const line of String(text ?? '').split('\n')) {
      const m = /^\[사진(\d+)(?::(\d+))?]$/.exec(line.trim());
      if (m) {
        const src = images?.[Number(m[1]) - 1];
        if (src) {
          content.push({
            type: 'imageResize',
            attrs: { src, containerStyle: styleFor(nearest(Number(m[2]) || 100)) },
          });
        }
        continue;
      }
      content.push(line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' });
    }
    if (!content.length) content.push({ type: 'paragraph' });
    return { type: 'doc', content };
  }

  const countImages = () => serialize().images.length;

  return {
    getText: () => serialize().text,
    getImages: () => serialize().images,
    imageCount: countImages,
    roomForImages: () => maxImages - countImages(),
    setContent(text, images) {
      editor.commands.setContent(parse(text, images), { emitUpdate: false });
      onChange();
    },
    insertImage(src) {
      editor.chain().focus().insertContent({
        type: 'imageResize',
        attrs: { src, containerStyle: styleFor(100) },
      }).run();
    },
    insertText(text) { editor.chain().focus().insertContent(text).run(); },
    focus() { editor.commands.focus(); },
    destroy() { editor.destroy(); },
  };
}
