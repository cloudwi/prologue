import { getAccessToken } from './auth-storage';
import { ApiError } from './api';

/**
 * 프로필 사진 업로드/삭제 클라이언트.
 * multipart/form-data를 사용하므로 authedRequest(JSON)와 별도로 fetch를 직접 호출한다.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://prologue-backend.onrender.com';

export type PhotoUploadResult = {
  photoUrls: string[];
};

/** 로컬 이미지 URI → multipart로 POST /members/me/photos 업로드. 업데이트된 프로필(photoUrls 포함)을 반환. */
export async function uploadPhoto(localUri: string): Promise<PhotoUploadResult> {
  const token = await getAccessToken();

  // 파일 확장자로 MIME type 결정
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const type = mimeMap[ext] ?? 'image/jpeg';
  const name = `photo.${ext}`;

  const formData = new FormData();
  formData.append('file', { uri: localUri, type, name } as unknown as Blob);

  const res = await fetch(`${API_BASE}/members/me/photos`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Content-Type은 FormData가 자동으로 boundary 포함하여 설정
    },
    body: formData,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code, data?.message);
  }
  return data as PhotoUploadResult;
}

/** 프로필 사진 삭제. DELETE /members/me/photos?url=... */
export async function deletePhoto(publicUrl: string): Promise<PhotoUploadResult> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/members/me/photos?url=${encodeURIComponent(publicUrl)}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code, data?.message);
  }
  return data as PhotoUploadResult;
}
