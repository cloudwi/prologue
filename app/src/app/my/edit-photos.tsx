import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { MAX_PHOTOS, MIN_PHOTOS, PhotoGrid, pickPhotos } from '@/components/photo-grid';
import { SubScreen } from '@/components/sub-screen';
import { Colors } from '@/constants/theme';
import { getMyProfile } from '@/lib/member';
import { deletePhoto, uploadPhoto } from '@/lib/photo';

/**
 * 사진 편집.
 * 사진은 프로필 수정(PUT)이 아니라 전용 엔드포인트로 즉시 반영되므로 별도 저장 버튼이 없다.
 */
export default function EditPhotosScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

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
    setBusy(true);
    try {
      let latest = photos;
      for (const uri of picked) {
        const res = await uploadPhoto(uri);
        latest = res.photoUrls;
      }
      setPhotos(latest);
    } catch (e) {
      Alert.alert('업로드 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
  }

  async function remove(url: string) {
    if (busy) return;
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
            첫 번째 사진이 대표로 보여요. 꾹 눌러 순서를 바꾸는 기능은 준비 중이에요.
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
              <Text style={{ color: c.textSecondary, fontSize: 13 }}>처리 중이에요</Text>
            </View>
          )}

          <Pressable
            onPress={() => router.push('/my/edit-basic')}
            style={({ pressed }) => [styles.next, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>기본 정보 편집</Text>
            <Text style={{ color: c.textSecondary, fontSize: 22, fontWeight: '300' }}>›</Text>
          </Pressable>
        </ScrollView>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  lead: { fontSize: 15, lineHeight: 22 },
  sub: { fontSize: 13, marginTop: 6 },
  grid: { marginTop: 18 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderRadius: 12,
  },
});
