import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoPager } from '@/components/photo-pager';
import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Peer } from '@/lib/daily';

/**
 * 오늘의 상대 프로필 상세 — 청첩장처럼 담백하게.
 * 가운데 정렬 세리프, 하트 씰 구분선, 넉넉한 여백. 장식은 씰 하나로 충분하다.
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
    .join('  ·  ');

  const keywords = [...peer.interests, ...peer.hobbies, ...peer.strengths];

  return (
    <SubScreen title="" c={c}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {peer.photoUrls.length > 0 && (
          <PhotoPager photos={peer.photoUrls} backgroundColor={c.backgroundSelected} />
        )}

        {/* 표지 — 이름과 한 줄 소개만 가운데에 */}
        <View style={styles.cover}>
          {peer.nickname ? (
            <Text style={[styles.name, { color: c.text, fontFamily: Fonts.serif }]}>{peer.nickname}</Text>
          ) : null}
          <Text style={[styles.meta, { color: c.textSecondary }]}>{meta}</Text>
        </View>

        <Seal c={c} />

        {peer.bio ? (
          <Text style={[styles.bio, { color: c.text, fontFamily: Fonts.serif }]}>{peer.bio}</Text>
        ) : null}

        {/* 편지 — 질문과 답이 청첩장의 인사말처럼 이어진다 */}
        {peer.letters.map((letter) => (
          <View key={letter.questionId} style={styles.letter}>
            <Text style={[styles.letterQuestion, { color: c.textSecondary }]}>{letter.question}</Text>
            <Text style={[styles.letterContent, { color: c.text, fontFamily: Fonts.serif }]}>{letter.content}</Text>
          </View>
        ))}

        {peer.answerUnlocked && peer.peerAnswer ? (
          <View style={styles.letter}>
            <Text style={[styles.letterQuestion, { color: c.textSecondary }]}>오늘의 답변</Text>
            <Text style={[styles.letterContent, { color: c.text, fontFamily: Fonts.serif }]}>{peer.peerAnswer}</Text>
          </View>
        ) : null}

        {keywords.length > 0 && (
          <>
            <Seal c={c} />
            <View style={styles.chipWrap}>
              {keywords.map((item) => (
                <View key={item} style={[styles.chip, { backgroundColor: c.backgroundElement }]}>
                  <Text style={{ color: c.textSecondary, fontSize: 13 }}>{item}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SubScreen>
  );
}

/** 청첩장의 구분 장식 — 가는 선 사이의 하트 씰. 브랜드 마크의 씰과 같은 자리다. */
function Seal({ c }: { c: ThemeColors }) {
  return (
    <View style={styles.seal}>
      <View style={[styles.sealLine, { backgroundColor: c.border }]} />
      <Text style={[styles.sealHeart, { color: c.primary }]}>{'\u2665'}</Text>
      <View style={[styles.sealLine, { backgroundColor: c.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 64 },

  cover: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 32 },
  name: { fontSize: 30, fontWeight: '700', letterSpacing: 1 },
  meta: { fontSize: 13, letterSpacing: 1, marginTop: 10 },

  seal: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 48, marginVertical: 30 },
  sealLine: { flex: 1, height: StyleSheet.hairlineWidth },
  sealHeart: { fontSize: 11 },

  bio: { fontSize: 15.5, lineHeight: 26, textAlign: 'center', paddingHorizontal: 36, marginBottom: 30 },

  letter: { paddingHorizontal: 32, marginBottom: 34 },
  letterQuestion: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  letterContent: { fontSize: 16, lineHeight: 28, textAlign: 'center', marginTop: 12 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 28 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: Radius.pill },
});
