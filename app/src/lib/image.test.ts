import { thumbUrl } from './image';

/**
 * 목록용 축소 URL — 잘못 만들면 **사진이 통째로 안 보인다**.
 * 화면에서 알아채기 전에 여기서 잡는다.
 */

const OBJECT = 'https://xyz.supabase.co/storage/v1/object/public/profile-photos/acc/abc-123';

describe('축소 URL', () => {
  it('저장소 경로를 변환 경로로 바꾸고 폭을 붙인다', () => {
    expect(thumbUrl(OBJECT, 128)).toBe(
      'https://xyz.supabase.co/storage/v1/render/image/public/profile-photos/acc/abc-123?width=128&quality=70',
    );
  });

  it('우리 저장소가 아니면 손대지 않는다 — 옛 데이터·외부 링크가 깨지면 안 된다', () => {
    expect(thumbUrl('https://example.com/photo.jpg', 128)).toBe('https://example.com/photo.jpg');
  });

  it('없는 사진은 undefined — Image에 그대로 넘겨도 안전하게 비워진다', () => {
    expect(thumbUrl(null, 128)).toBeUndefined();
    expect(thumbUrl(undefined, 128)).toBeUndefined();
    expect(thumbUrl('', 128)).toBeUndefined();
  });

  it('폭은 부르는 쪽이 정한다', () => {
    expect(thumbUrl(OBJECT, 800)).toContain('width=800');
    expect(thumbUrl(OBJECT, 160)).toContain('width=160');
  });
});
