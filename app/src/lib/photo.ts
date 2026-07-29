import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { ApiError, authedFetch } from './api';

/**
 * 프로필 사진 업로드/삭제 클라이언트.
 * multipart/form-data라 authedRequest(JSON) 대신 authedFetch를 직접 쓴다 — 토큰 재발급·재시도는 공유한다.
 */

export type PhotoUploadResult = {
  photoUrls: string[];
};

/** 업로드 사진의 긴 변 상한. 프로필 사진이 화면에서 이보다 크게 보일 일이 없다. */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/**
 * 업로드 전에 사진을 줄인다 — 긴 변 1600px 상한 + JPEG 재인코딩.
 *
 * 폰 카메라 원본(12~48MP, 2~5MB)을 그대로 올리면 저장소·전송량이 몇 배로 낭비되고,
 * 발견 탭에서 상대 사진을 내려받을 때도 느리다. 여기서 줄이면 한 장이 수백 KB로 떨어진다.
 * 재인코딩은 항상 JPEG라서 HEIC 같은 비호환 형식도 이 단계에서 함께 사라진다.
 * 실패하면 원본을 그대로 반환한다 — 축소는 최적화지 업로드의 전제 조건이 아니다.
 */
async function shrinkForUpload(localUri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(localUri);
    const original = await context.renderAsync();
    if (Math.max(original.width, original.height) > MAX_DIMENSION) {
      // 한 축만 지정하면 비율은 자동 유지된다. 긴 변 기준으로 잡아야 세로 사진도 같은 상한을 받는다.
      context.resize(original.width >= original.height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
    return saved.uri;
  } catch {
    return localUri;
  }
}

/**
 * 멀티파트에 실을 파일 파트를 만든다.
 *
 * Expo SDK 56의 fetch는 RN 고유의 `{ uri, type, name }` 파트를 읽지 못하고
 * "Unsupported FormDataPart implementation"으로 던진다. 바이트를 직접 읽을 수 있는 값만 받는다.
 * 네이티브는 expo-file-system의 File(= bytes()·name·type을 가진 Blob 호환 객체)을 쓰고,
 * 웹은 표준 Blob을 파일명과 함께 넣는다.
 */
async function appendPhotoPart(formData: FormData, localUri: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(localUri)).blob();
    const ext = blob.type.split('/').pop() ?? 'jpg';
    formData.append('file', blob, `photo.${ext === 'jpeg' ? 'jpg' : ext}`);
    return;
  }
  formData.append('file', new File(localUri) as unknown as Blob);
}

/** 로컬 이미지 URI → multipart로 POST /members/me/photos 업로드. 업데이트된 프로필(photoUrls 포함)을 반환. */
export async function uploadPhoto(localUri: string): Promise<PhotoUploadResult> {
  const formData = new FormData();
  await appendPhotoPart(formData, await shrinkForUpload(localUri));

  // Content-Type은 FormData가 자동으로 boundary 포함하여 설정
  const res = await authedFetch('/members/me/photos', { method: 'POST', body: formData });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code, data?.message);
  }
  return data as PhotoUploadResult;
}

/** 프로필 사진 삭제. DELETE /members/me/photos?url=... */
export async function deletePhoto(publicUrl: string): Promise<PhotoUploadResult> {
  const res = await authedFetch(`/members/me/photos?url=${encodeURIComponent(publicUrl)}`, { method: 'DELETE' });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code, data?.message);
  }
  return data as PhotoUploadResult;
}
