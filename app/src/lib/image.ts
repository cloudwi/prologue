/**
 * 목록·썸네일용 이미지 URL — 필요한 크기만 받아온다.
 *
 * 사진은 업로드할 때 긴 변 1600px로 줄여 저장한다(`lib/photo.ts`). 상세 화면에는 그 크기가 맞지만,
 * **26pt짜리 동그란 얼굴에도 같은 225KB를 내려받고 있었다**(2026-08-25). 편지함에 하트가 열 개면
 * 2MB가 넘는다. 무료 티어에서 가장 먼저 닿는 벽이 대역폭이라, 이건 돈이자 속도다.
 *
 * Supabase Storage의 변환 엔드포인트에 폭을 주면 그 크기로 만들어 준다:
 * 225KB → 128px 12KB, 400px 32KB, 800px 57KB.
 *
 * **상세 화면에는 쓰지 않는다.** 사람이 실제로 들여다보는 사진은 원본 그대로여야 한다 —
 * 아끼자고 흐린 얼굴을 보여주면 아낀 것보다 잃는 게 크다.
 */

const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

/**
 * [width]px로 줄인 URL. 우리 저장소 사진이 아니면(로컬 asset, 옛 데이터) 그대로 돌려준다.
 *
 * [width]는 **표시 크기가 아니라 내려받을 픽셀**이다. 고해상도 화면을 감안해
 * 표시 pt의 2~3배로 잡되, 목록에서는 3배까지 갈 필요가 없다(작게 보이는 만큼 덜 티난다).
 */
export function thumbUrl(url: string | null | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (!url.includes(OBJECT_PATH)) return url;
  return `${url.replace(OBJECT_PATH, RENDER_PATH)}?width=${width}&quality=70`;
}
