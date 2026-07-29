import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Peer } from '@/lib/daily';

/**
 * 오늘의 상대 프로필 상세 — 청첩장처럼 담백하게.
 * 가운데 정렬 세리프, 하트 씰 구분선, 넉넉한 여백. 장식은 씰 하나로 충분하다.
 * 대표 사진은 표지로 맨 위에, 나머지 사진은 글 사이사이에 화보처럼 흩어 놓는다.
 *
 * 상대는 개별 조회 API가 없어서(오늘의 상대는 목록으로만 내려온다)
 * 발견 탭이 이미 들고 있는 데이터를 params로 직렬화해 넘긴다. 조회 전용이라 충분하다.
 * 하트는 카드에서만 보낸다 — 상태를 두 화면이 나눠 갖지 않도록.
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
  const [cover, ...restPhotos] = peer.photoUrls;

  // 글 블록(소개·편지·오늘의 답변)을 순서대로 모으고, 나머지 사진을 그 사이에 흩는다.
  const blocks: { key: string; question: string | null; content: string }[] = [];
  if (peer.bio) blocks.push({ key: 'bio', question: null, content: peer.bio });
  for (const letter of peer.letters) {
    blocks.push({ key: `letter-${letter.questionId}`, question: letter.question, content: letter.content });
  }
  if (peer.answerUnlocked && peer.peerAnswer) {
    blocks.push({ key: 'today', question: '오늘의 답변', content: peer.peerAnswer });
  }

  // 어느 블록 뒤에 사진을 놓을지 — 답변 id 기반 의사 난수라 이 상대에게는 항상 같은 배치다.
  const photoSlots = scatter(restPhotos.length, blocks.length, peer.peerAnswerId ?? peer.nickname ?? '');

  return (
    <SubScreen title="" c={c}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {cover && (
          <Image source={{ uri: cover }} style={[styles.photo, { backgroundColor: c.backgroundSelected }]} contentFit="cover" transition={150} />
        )}

        {/* 표지 — 이름과 한 줄 정보만 가운데에 */}
        <View style={styles.cover}>
          {peer.nickname ? (
            <Text style={[styles.name, { color: c.text, fontFamily: Fonts.serif }]}>{peer.nickname}</Text>
          ) : null}
          <Text style={[styles.meta, { color: c.textSecondary }]}>{meta}</Text>
        </View>

        <Seal c={c} />

        {blocks.map((block, i) => (
          <View key={block.key}>
            <View style={styles.letter}>
              {block.question ? (
                <Text style={[styles.letterQuestion, { color: c.textSecondary }]}>{block.question}</Text>
              ) : null}
              <Text style={[styles.letterContent, { color: c.text, fontFamily: Fonts.serif }]}>{block.content}</Text>
            </View>
            {photoSlots
              .map((slot, photoIndex) => ({ slot, photoIndex }))
              .filter(({ slot }) => slot === i)
              .map(({ photoIndex }) => (
                <Image
                  key={restPhotos[photoIndex]}
                  source={{ uri: restPhotos[photoIndex] }}
                  style={[styles.photo, styles.interPhoto, { backgroundColor: c.backgroundSelected }]}
                  contentFit="cover"
                  transition={150}
                />
              ))}
          </View>
        ))}

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

/**
 * 사진 n장을 블록 0..blockCount-1 뒤에 뿌릴 위치를 정한다.
 * seed 기반 의사 난수 — 같은 상대는 항상 같은 배치. 블록이 없으면 전부 마지막(-1 대신 0 처리 불필요, blockCount-1 로).
 */
function scatter(photoCount: number, blockCount: number, seed: string): number[] {
  if (photoCount === 0) return [];
  if (blockCount === 0) return Array(photoCount).fill(-1); // 블록이 없으면 렌더될 자리가 없다 — 표지만 남는다
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const slots: number[] = [];
  for (let i = 0; i < photoCount; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    slots.push(h % blockCount);
  }
  return slots;
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

  photo: { width: '100%', aspectRatio: 4 / 5 },
  interPhoto: { marginBottom: 34 },

  cover: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 32 },
  name: { fontSize: 30, fontWeight: '700', letterSpacing: 1 },
  meta: { fontSize: 13, letterSpacing: 1, marginTop: 10 },

  seal: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 48, marginVertical: 30 },
  sealLine: { flex: 1, height: StyleSheet.hairlineWidth },
  sealHeart: { fontSize: 11 },

  letter: { paddingHorizontal: 32, marginBottom: 34 },
  letterQuestion: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  letterContent: { fontSize: 16, lineHeight: 28, textAlign: 'center', marginTop: 12 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 28 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: Radius.pill },
});
