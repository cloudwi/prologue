/**
 * 모임 글의 표시 문법 — 소개와 후기가 함께 쓴다.
 *
 * 글은 평문이고, 그 안에 우리가 정한 표시만 들어 있다.
 *
 *   `[사진1]`                 그 자리에 첫 번째 사진
 *   `[사진1:50]`              카드 폭의 절반으로
 *   `[사진1:50:1200x900]`     원본 크기까지 (자리를 미리 잡아 글이 밀리지 않게)
 *   `[가운데]`, `[오른쪽]`     그 줄의 정렬. 왼쪽이 기본이라 표시가 없다.
 *
 * HTML을 저장하지 않은 이유가 여기 있다. 저장 형식이 평문이라 서버도 초대장도 앱도 각자의
 * 방식으로 그리면 되고, 남의 HTML을 받아 소독할 일이 없다. 문법은 세 곳이 함께 안다 —
 * 백엔드(MeetupInvitationPage), 콘솔(desc-editor.js), 그리고 여기.
 *
 * **표시를 모르던 시절의 앱을 위해 서버는 description에서 표시를 걷어내 보낸다.**
 * 그래서 이 파서는 descriptionRich·recap처럼 표시가 살아 있는 자리에만 쓴다.
 */

export type RichAlign = 'left' | 'center' | 'right';

export type RichBlock =
  | { kind: 'text'; text: string; align: RichAlign }
  | { kind: 'photo'; url: string; width: number; ratio: number | null };

const PHOTO = /^\[사진(\d+)(?::(\d+))?(?::(\d+)x(\d+))?]$/;
const ALIGN = /^\s*\[(가운데|오른쪽)]\s?/;

/** 폭은 네 칸뿐이다 — 콘솔에서 정할 수 있는 것도 이 넷이다. */
const WIDTHS = [25, 50, 75, 100];
const snap = (pct: number): number =>
  WIDTHS.reduce((a, b) => (Math.abs(b - pct) < Math.abs(a - pct) ? b : a), 100);

const sane = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 20000;

/**
 * 평문 → 그릴 것들.
 *
 * 이어지는 글줄은 한 덩이로 묶는다 — 줄마다 따로 그리면 줄 간격이 벌어진다.
 * 가리키는 사진이 없는 표시는 조용히 지운다: 화면에 `[사진3]`이 글자로 남는 것보다 낫다.
 * 초대장과 같은 규칙이다.
 */
export function parseRich(text: string | null | undefined, images: string[] = []): RichBlock[] {
  if (!text) return [];
  const out: RichBlock[] = [];
  let buf: string[] = [];
  let align: RichAlign = 'left';

  const flush = () => {
    if (!buf.length) return;
    const joined = buf.join('\n').replace(/\s+$/, '');
    if (joined.trim()) out.push({ kind: 'text', text: joined, align });
    buf = [];
  };

  for (const raw of String(text).split('\n')) {
    const photo = PHOTO.exec(raw.trim());
    if (photo) {
      const url = images[Number(photo[1]) - 1];
      // 표시가 가리키는 사진이 없으면 그 줄은 없던 것으로 둔다.
      if (!url) continue;
      flush();
      const w = Number(photo[3]);
      const h = Number(photo[4]);
      out.push({
        kind: 'photo',
        url,
        width: snap(Number(photo[2]) || 100),
        ratio: sane(w) && sane(h) ? w / h : null,
      });
      continue;
    }
    const marked = ALIGN.exec(raw);
    const where: RichAlign = marked ? (marked[1] === '가운데' ? 'center' : 'right') : 'left';
    // 정렬이 바뀌면 덩이를 끊는다 — 한 덩이는 한 정렬이다.
    if (buf.length && where !== align) flush();
    align = where;
    buf.push(marked ? raw.slice(marked[0].length) : raw);
  }
  flush();
  return out;
}

/**
 * 표시를 걷어낸 평문 — 카드의 한 줄 요약처럼 조판할 자리가 없는 곳에서 쓴다.
 *
 * 서버의 stripPhotoTokens와 같은 일을 한다. 서버가 이미 걷어낸 [Meetup.description]이
 * 있는데도 여기 두는 이유는, 후기(recap)에는 걷어낸 판이 따로 오지 않기 때문이다.
 */
export function plainText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/\[사진(\d+)(?::(\d+))?(?::(\d+)x(\d+))?]/g, '')
    .replace(/(?:^|\n)[ \t]*\[(?:가운데|오른쪽)][ \t]?/g, (m) => (m.startsWith('\n') ? '\n' : ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
