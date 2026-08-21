import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoCropModal } from '@/components/photo-crop';
import { MAX_PHOTOS, MIN_PHOTOS, PhotoGrid, pickPhotos } from '@/components/photo-grid';
import { SubScreen } from '@/components/sub-screen';
import { ApiError } from '@/lib/api';
import { getMyProfile } from '@/lib/member';
import { deletePhoto, uploadPhoto } from '@/lib/photo';
import { useTheme } from '@/hooks/use-theme';

/**
 * 사진 편집 — 올리기와 지우기만 한다.
 * 다른 편집 화면으로 나가는 동선을 두지 않는다(예전에는 여기 "기본 정보 편집"이 붙어 있어,
 * 기본 정보를 고치려면 사진 화면을 거쳐야 했다). 이동은 MY 허브에서만 한다.
 * 사진은 프로필 수정(PUT)이 아니라 전용 엔드포인트로 즉시 반영되므로 별도 저장 버튼이 없다.
 */
export default function EditPhotosScreen() {
  const c = useTheme();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  // 자르기를 기다리는 사진 줄 — 한 장씩 4:5 창을 거친 뒤에 업로드된다.
  const [cropQueue, setCropQueue] = useState<{ uris: string[]; total: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (active && p) setPhotos(p.photoUrls ?? []);
      } catch (e) {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function add() {
    if (busy) return;
    const picked = await pickPhotos(MAX_PHOTOS - photos.length);
    if (picked.length === 0) return;
    // 바로 올리지 않는다 — 한 장씩 4:5 창에서 자른 뒤 업로드한다.
    setCropQueue({ uris: picked, total: picked.length });
  }

  /** 자르기를 마친 한 장을 업로드한다 — 반려돼도 다음 장 자르기는 이어진다. */
  async function uploadCropped(uri: string) {
    setBusy(true);
    try {
      const res = await uploadPhoto(uri);
      setPhotos(res.photoUrls);
    } catch (e) {
      const rejected = e instanceof ApiError && e.code === 'PHOTO_REJECTED';
      Alert.alert(
        rejected ? '이 사진은 쓸 수 없어요' : '업로드 실패',
        e instanceof Error ? e.message : '잠시 후 다시 시도해주세요',
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(url: string) {
    if (busy) return;
    // 서버도 같은 규칙으로 막지만, 여기서 안내해야 에러가 아니라 순서 문제로 읽힌다.
    if (photos.length === MIN_PHOTOS) {
      Alert.alert(
        `사진은 ${MIN_PHOTOS}장 이상 유지해야 해요`,
        '바꾸고 싶다면 새 사진을 먼저 추가한 뒤 지워주세요.',
      );
      return;
    }
    setBusy(true);
    try {
      const res = await deletePhoto(url);
      setPhotos(res.photoUrls);
    } catch (e) {
      Alert.alert('삭제 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
  }

  const short = photos.length < MIN_PHOTOS;

  return (
    <SubScreen title="사진" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.lead, { color: c.text }]}>
            첫 번째 사진이 대표로 보여요. 얼굴이 잘 보이는 사진만 등록돼요.
            {'\n'}꾹 눌러 순서를 바꾸는 기능은 준비 중이에요.
          </Text>
          <Text style={[styles.sub, { color: short ? c.primary : c.textSecondary }]}>
            {short
              ? `${MIN_PHOTOS}장 이상 등록해야 상대에게 소개돼요 (현재 ${photos.length}장)`
              : `${photos.length}장 / 최대 ${MAX_PHOTOS}장`}
          </Text>

          <View style={styles.grid}>
            <PhotoGrid photos={photos} onAdd={add} onRemove={remove} busy={busy} c={c} />
          </View>

          {busy && (
            <View style={styles.busy}>
              <ActivityIndicator color={c.primary} />
              <Text style={{ color: c.textSecondary, fontSize: 14 }}>처리 중이에요</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* 고른 사진을 한 장씩 4:5 창에서 자른다 — 프로필에 보이는 그대로 올라가도록. */}
      {cropQueue && cropQueue.uris.length > 0 && (
        <PhotoCropModal
          key={cropQueue.uris[0]}
          uri={cropQueue.uris[0]}
          progress={{ index: cropQueue.total - cropQueue.uris.length, total: cropQueue.total }}
          c={c}
          onDone={(cropped) => {
            void uploadCropped(cropped);
            setCropQueue((q) => (q && q.uris.length > 1 ? { ...q, uris: q.uris.slice(1) } : null));
          }}
          onCancel={() => setCropQueue((q) => (q && q.uris.length > 1 ? { ...q, uris: q.uris.slice(1) } : null))}
        />
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  lead: { fontSize: 16, lineHeight: 23 },
  sub: { fontSize: 14, marginTop: 6 },
  grid: { marginTop: 18 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
});
