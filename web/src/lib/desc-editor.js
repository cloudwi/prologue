/**
 * 모임 소개 글 편집기.
 *
 * 화면에서는 사진이 글자들 사이에 실제 그림으로 앉아 있고 잡아끌어 크기를 바꾼다. 그런데
 * **저장되는 것은 여전히 평문이다** — `[사진1]`, 폭을 정했으면 `[사진1:50]`, 원본 크기까지
 * 알면 `[사진1:50:1200x1115]`. 뒤로 갈수록 붙기만 하고 앞의 모양은 그대로다. 초대장과 서버는
 * 어제 읽던 것을 그대로 읽고, 지금 스토어에 있는 앱도 달라진 것을 모른다. 편집기를 바꾸는
 * 일과 저장 형식을 바꾸는 일은 다른 일이고, 여기서는 앞의 것만 한다.
 *
 * 그래서 HTML을 뱉는 편집기(SunEditor·TinyMCE·CKEditor)를 쓰지 않았다. 그것들을 쓰면
 * 남의 HTML을 받게 되고, 초대장이 **이스케이프한 뒤에 우리 표시만 치환**하며 지켜온 안전을
 * 서버 쪽 소독기로 다시 사야 한다. Tiptap은 직렬화를 우리가 쥔다.
 */
import { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
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

/** 원본 크기가 말이 되는지 — 0이거나 몇 만 픽셀이면 자리를 잘못 잡아 오히려 더 밀린다. */
const sane = (n) => Number.isInteger(n) && n >= 1 && n <= 20000;

/**
 * @param {object} o
 * @param {HTMLElement} o.mount        편집기가 들어설 자리
 * @param {() => void} o.onChange      내용이 바뀔 때마다 (글자 수·미리보기 갱신)
 * @param {(files: File[]) => void} o.onFiles  사진 파일이 들어왔을 때 (업로드는 부르는 쪽 몫)
 * @param {number} o.maxImages
 */
export function createDescEditor({ mount, onChange, onFiles, placeholder, maxImages = 10 }) {
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
      /*
       * 정렬 셋 — 왼쪽·가운데·오른쪽.
       *
       * 왼쪽이 기본이라 저장할 때 표시가 붙지 않는다. 가운데는 머리줄, 오른쪽은 맺는 말
       * ("— 프롤로그 드림") 자리다. 위아래 정렬은 열지 않는다 — 저장할 수 없는 것은 주지 않는다.
       */
      TextAlign.configure({ types: ['paragraph'], alignments: ['left', 'center', 'right'], defaultAlignment: 'left' }),
      /*
       * 안내 문구는 **글이 통째로 비었을 때만** 보여준다.
       *
       * 줄마다 보여주면 글 한가운데 빈 줄에 커서를 둘 때마다 "어떤 자리인지…"가 끼어든다.
       * 쓰는 사람에게는 자기가 쓴 글 사이에 회색 문장이 하나 생긴 것처럼 보인다.
       */
      Placeholder.configure({
        placeholder: placeholder ?? '',
        // 글이 통째로 비었을 때만 이 클래스가 붙는다. CSS가 그때만 그린다.
        emptyEditorClass: 'is-editor-empty',
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

  /*
   * 사진을 누르면 **고른 상태로** 만든다.
   *
   * 크기 조절 확장은 눌렸을 때 자기 테두리와 손잡이만 그리고 ProseMirror의 선택은 건드리지
   * 않는다. 그래서 isActive('imageResize')가 영영 거짓이었고, 그 조건에 매달린 크기 툴바는
   * 한 번도 뜨지 않았다.
   *
   * ProseMirror의 handleClickOn으로는 못 잡는다 — 확장이 자기 DOM에서 클릭을 먼저 삼킨다.
   * 그래서 **캡처 단계**에서 우리가 먼저 받는다. 어느 사진을 눌렀는지는 문서를 훑어
   * 그 노드의 DOM이 눌린 지점을 품고 있는지로 찾는다.
   */
  editor.view.dom.addEventListener(
    'click',
    (event) => {
      let at = null;
      editor.state.doc.descendants((node, pos) => {
        if (at !== null || node.type.name !== 'imageResize') return;
        const dom = editor.view.nodeDOM(pos);
        if (dom && dom.contains && dom.contains(event.target)) at = pos;
      });
      if (at === null) return;
      editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, at)));
    },
    true,
  );

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

  /**
   * 사진 주소 → 원본 픽셀 크기.
   *
   * 편집기에 실제로 그려진 <img>에서 읽는다. 아직 안 받아온 사진은 naturalWidth가 0이라
   * 그 순간에는 알 수 없는데, 한 번 알아낸 값을 여기 적어두면 다음 저장 때 다시 쓴다.
   * 불러온 글에 이미 크기가 적혀 있었다면 그것도 여기 들어간다 — 사진이 화면에 뜨기 전에
   * 저장해도 크기가 사라지지 않게.
   */
  const sizes = new Map();

  function learnSizes() {
    for (const img of editor.view.dom.querySelectorAll('img')) {
      if (sane(img.naturalWidth) && sane(img.naturalHeight)) sizes.set(img.src, [img.naturalWidth, img.naturalHeight]);
    }
  }

  /** 문서 → 평문과 사진 목록. 같은 사진을 두 번 써도 목록에는 한 번만 담는다. */
  function serialize() {
    const hostWidth = editor.view.dom.clientWidth;
    learnSizes();
    const images = [];
    const lines = [];
    editor.state.doc.forEach((node) => {
      if (node.type.name === 'imageResize') {
        const src = node.attrs.src;
        if (!src) return;
        let i = images.indexOf(src);
        if (i === -1) i = images.push(src) - 1;
        const pct = nearest(widthFromStyle(node.attrs.containerStyle, hostWidth));
        /*
         * 원본 크기를 아는 사진은 표시에 실어 보낸다 — 초대장이 사진 도착 전에 자리를
         * 잡아두는 근거가 이것뿐이다. 크기를 적으려면 폭 자리가 비어 있으면 안 되므로
         * 이때는 100도 적는다(`[사진1:100:1200x1115]`).
         */
        const size = sizes.get(src);
        lines.push(
          size ? `[사진${i + 1}:${pct}:${size[0]}x${size[1]}]`
            : pct === 100 ? `[사진${i + 1}]`
              : `[사진${i + 1}:${pct}]`,
        );
        return;
      }
      let line = '';
      node.forEach((child) => { line += child.type.name === 'hardBreak' ? '\n' : (child.text ?? ''); });
      const mark = { center: '[가운데]', right: '[오른쪽]' }[node.attrs.textAlign] ?? '';
      lines.push(mark + line);
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
      const m = /^\[사진(\d+)(?::(\d+))?(?::(\d+)x(\d+))?]$/.exec(line.trim());
      if (m) {
        const src = images?.[Number(m[1]) - 1];
        if (src) {
          const w = Number(m[3]);
          const h = Number(m[4]);
          if (sane(w) && sane(h)) sizes.set(src, [w, h]);
          content.push({
            type: 'imageResize',
            attrs: { src, containerStyle: styleFor(nearest(Number(m[2]) || 100)) },
          });
        }
        continue;
      }
      const aligned = /^\s*\[(가운데|오른쪽)]\s?/.exec(line);
      const text = aligned ? line.slice(aligned[0].length) : line;
      const attrs = aligned ? { textAlign: aligned[1] === '가운데' ? 'center' : 'right' } : {};
      content.push(text ? { type: 'paragraph', attrs, content: [{ type: 'text', text }] } : { type: 'paragraph', attrs });
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
      /*
       * 방금 올린 사진의 원본 크기를 따로 물어본다.
       *
       * 편집기에 놓인 <img>에서 읽어도 되지만, 그건 사진이 다 받아진 **뒤에야** 0이 아니다.
       * 놓자마자 저장하면 크기 없이 나가고, 초대장은 그 사진 앞에서 다시 밀린다.
       * 답이 오면 onChange로 미리보기까지 다시 그린다.
       */
      const probe = new Image();
      probe.onload = () => {
        if (!sane(probe.naturalWidth) || !sane(probe.naturalHeight)) return;
        sizes.set(src, [probe.naturalWidth, probe.naturalHeight]);
        onChange();
      };
      probe.src = src;

      editor.chain().focus().insertContent({
        type: 'imageResize',
        attrs: { src, containerStyle: styleFor(100) },
      }).run();
    },
    insertText(text) { editor.chain().focus().insertContent(text).run(); },
    /** 고른 줄의 정렬을 정한다 — 'left' | 'center' | 'right'. */
    setAlign(where) { editor.chain().focus().setTextAlign(where).run(); },
    /** 지금 줄의 정렬. 표시가 없으면 왼쪽이다. */
    align: () => (editor.isActive({ textAlign: 'center' }) ? 'center'
      : editor.isActive({ textAlign: 'right' }) ? 'right' : 'left'),

    /** 지금 고른 사진의 폭(%) — 고른 사진이 없으면 null. */
    imageWidth() {
      const node = editor.state.selection.node;
      if (!node || node.type.name !== 'imageResize') return null;
      return nearest(widthFromStyle(node.attrs.containerStyle, editor.view.dom.clientWidth));
    },
    /** 고른 사진의 폭을 네 칸 중 하나로 정한다. */
    setImageWidth(pct) {
      const { selection } = editor.state;
      const node = selection.node;
      if (!node || node.type.name !== 'imageResize') return;
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(selection.from, undefined, { ...node.attrs, containerStyle: styleFor(pct) }),
      );
      onChange();
    },
    isImageSelected: () => editor.isActive('imageResize'),
    onSelection(fn) { editor.on('selectionUpdate', fn); },
    focus() { editor.commands.focus(); },
    destroy() { editor.destroy(); },
  };
}
