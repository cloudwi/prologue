import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { avatarSource } from '@/constants/avatars';
import { Fonts, type ThemeColors } from '@/constants/theme';
import { getMyProfile, type MemberProfile } from '@/lib/member';
import { ageFrom } from '@/lib/profile-form';
import { useTheme } from '@/hooks/use-theme';

/** 상대에게 보이는 그대로의 내 프로필. 편집 요소를 두지 않는다. */
export default function PreviewScreen() {
  const c = useTheme();
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<MemberProfile | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await getMyProfile();
        if (active) setP(profile);
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

  if (loading) {
    return (
      <SubScreen title="상대에게 보이는 화면" c={c}>
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SubScreen>
    );
  }

  if (!p) {
    return (
      <SubScreen title="상대에게 보이는 화면" c={c}>
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary }}>아직 프로필이 없어요</Text>
        </View>
      </SubScreen>
    );
  }

  const age = ageFrom(p.birthDate);
  const photos = p.photoUrls ?? [];

  return (
    <SubScreen title="상대에게 보이는 화면" c={c}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {photos.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {photos.map((url) => (
              <Image key={url} source={{ uri: url }} style={styles.photo} contentFit="cover" />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.photo, styles.center, { backgroundColor: c.backgroundElement }]}>
            {p.avatarId != null ? (
              <Image source={avatarSource(p.avatarId)!} style={styles.avatar} contentFit="contain" />
            ) : (
              <Text style={{ color: c.textSecondary }}>등록된 사진이 없어요</Text>
            )}
          </View>
        )}

        {photos.length > 1 && (
          <Text style={[styles.pageHint, { color: c.textSecondary }]}>옆으로 넘겨 {photos.length}장을 볼 수 있어요</Text>
        )}

        <View style={styles.body}>
          <Text style={[styles.name, { color: c.text, fontFamily: Fonts.serif }]}>{p.nickname}</Text>
          <Text style={[styles.meta, { color: c.textSecondary }]}>
            {[age != null ? `${age}세` : null, p.region, p.heightCm ? `${p.heightCm}cm` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>

          {p.bio?.trim() ? <Text style={[styles.bio, { color: c.text }]}>{p.bio.trim()}</Text> : null}

          <Chips title="관심사" items={p.interests} c={c} />
          <Chips title="취미" items={p.hobbies} c={c} />
          <Chips title="강점" items={p.strengths} c={c} />
        </View>
      </ScrollView>
    </SubScreen>
  );
}

function Chips({ title, items, c }: { title: string; items: string[]; c: ThemeColors }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.chipSection}>
      <Text style={[styles.chipTitle, { color: c.textSecondary }]}>{title}</Text>
      <View style={styles.chipWrap}>
        {items.map((item) => (
          <View key={item} style={[styles.chip, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
            <Text style={{ color: c.text, fontSize: 13 }}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  gallery: { height: WIDTH },
  photo: { width: WIDTH, height: WIDTH },
  avatar: { width: 140, height: 140 },
  pageHint: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  name: { fontSize: 26, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 4 },
  bio: { fontSize: 15, lineHeight: 23, marginTop: 16 },
  chipSection: { marginTop: 22 },
  chipTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
