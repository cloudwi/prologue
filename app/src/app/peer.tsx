import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoPager } from '@/components/photo-pager';
import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Peer } from '@/lib/daily';

/**
 * 오늘의 상대 프로필 상세 — 사진 전부와 프로필을 넉넉하게 본다.
 *
 * 상대는 개별 조회 API가 없어서(오늘의 상대는 목록으로만 내려온다)
 * 발견 탭이 이미 들고 있는 데이터를 params로 직렬화해 넘긴다. 조회 전용이라 충분하다.
 * 하트·대화 신청은 카드에서만 한다 — 상태를 두 화면이 나눠 갖지 않도록.
 */
export default function PeerDetailScreen() {
  const c = useTheme();
  const { data } = useLocalSearchParams<{ data?: string }>();

  const peer = useMemo<Peer | null>(() => {
    try {
      return JSON.parse(typeof data === 'string' ? data : '') as Peer;
    } catch {
      return null;
    }
  }, [data]);

  if (!peer) {
    return (
      <SubScreen title="프로필" c={c}>
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary }}>프로필을 불러오지 못했어요</Text>
        </View>
      </SubScreen>
    );
  }

  const meta = [
    peer.age != null ? `${peer.age}세` : null,
    peer.heightCm ? `${peer.heightCm}cm` : null,
    peer.region,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SubScreen title={peer.nickname ?? '프로필'} c={c}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {peer.photoUrls.length > 0 && (
          <PhotoPager photos={peer.photoUrls} backgroundColor={c.backgroundSelected} />
        )}

        <View style={styles.body}>
          {peer.nickname ? (
            <Text style={[styles.name, { color: c.text, fontFamily: Fonts.serif }]}>{peer.nickname}</Text>
          ) : null}
          <Text style={[styles.meta, { color: c.textSecondary }]}>{meta}</Text>

          {peer.bio ? <Text style={[styles.bio, { color: c.text }]}>{peer.bio}</Text> : null}

          <Chips title="관심사" items={peer.interests} c={c} />
          <Chips title="취미" items={peer.hobbies} c={c} />
          <Chips title="강점" items={peer.strengths} c={c} />

          {peer.answerUnlocked && peer.peerAnswer ? (
            <View style={styles.answerSection}>
              <Text style={[styles.answerHead, { color: c.textSecondary }]}>오늘의 답변</Text>
              <View style={[styles.answerCard, { backgroundColor: c.backgroundElement }]}>
                <Text style={[styles.answerText, { color: c.text, fontFamily: Fonts.serif }]}>{peer.peerAnswer}</Text>
              </View>
            </View>
          ) : null}
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
          <View key={item} style={[styles.chip, { backgroundColor: c.backgroundElement }]}>
            <Text style={{ color: c.text, fontSize: 13 }}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  name: { fontSize: 26, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 4 },
  bio: { fontSize: 15, lineHeight: 23, marginTop: 16 },
  chipSection: { marginTop: 22 },
  chipTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill },
  answerSection: { marginTop: 26 },
  answerHead: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8 },
  answerCard: { borderRadius: Radius.md, padding: 20 },
  answerText: { fontSize: 16, lineHeight: 26 },
});
