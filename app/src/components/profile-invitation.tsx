import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, type ThemeColors } from '@/constants/theme';

/**
 * 프로필을 청첩장처럼 펼치는 공용 렌더러.
 * 상대 상세와 내 미리보기가 같은 화면을 쓴다 — "상대에게 보이는 화면"이 말 그대로가 되도록.
 * 대표 사진은 표지, 나머지 사진은 글 블록 사이에 화보처럼 흩는다(시드 고정 배치).
 */

export type InvitationLetter = { key: string; question: string | null; content: string };

export function ProfileInvitation({
  nickname,
  meta,
  photoUrls,
  letters,
  keywords,
  seed,
  c,
}: {
  nickname: string | null;
  meta: string;
  photoUrls: string[];
  letters: InvitationLetter[];
  keywords: string[];
  /** 사진 배치용 시드 — 같은 프로필은 항상 같은 배치. */
  seed: string;
  c: ThemeColors;
}) {
  const [cover, ...restPhotos] = photoUrls;
  const photoSlots = scatter(restPhotos.length, letters.length, seed);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {cover && (
        <Image source={{ uri: cover }} style={[styles.photo, { backgroundColor: c.backgroundSelected }]} contentFit="cover" transition={150} />
      )}

      {/* 표지 — 이름과 한 줄 정보만 가운데에 */}
      <View style={styles.cover}>
        {nickname ? <Text style={[styles.name, { color: c.text, fontFamily: Fonts.serif }]}>{nickname}</Text> : null}
        <Text style={[styles.meta, { color: c.textSecondary }]}>{meta}</Text>
      </View>

      <Seal c={c} />

      {letters.map((block, i) => (
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

      {/* 편지가 없어 자리를 못 얻은 사진들은 키워드 앞에 이어 붙인다 */}
      {letters.length === 0 &&
        restPhotos.map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            style={[styles.photo, styles.interPhoto, { backgroundColor: c.backgroundSelected }]}
            contentFit="cover"
            transition={150}
          />
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
  );
}

/** 사진 n장을 블록 0..blockCount-1 뒤에 뿌릴 위치. 시드 기반 의사 난수 — 항상 같은 배치. */
function scatter(photoCount: number, blockCount: number, seed: string): number[] {
  if (photoCount === 0 || blockCount === 0) return [];
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
