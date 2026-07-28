import { File } from 'expo-file-system';
import { Platform } from 'react-native';

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
  const token = await getAccessToken();

  const formData = new FormData();
  await appendPhotoPart(formData, localUri);

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
