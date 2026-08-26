import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { JobBadge } from '@/components/job-badge';
import { Skeleton, SkeletonLines } from '@/components/skeleton';
import { Fonts, Radius, type ThemeColors } from '@/constants/theme';
import type { LastActive } from '@/lib/daily';

const ACTIVITY_LABEL: Record<LastActive, string> = {
  TODAY: '오늘 활동했어요',
  THIS_WEEK: '이번 주에 활동했어요',
  WEEKS_AGO: '몇 주 전에 활동했어요',
};

/**
 * 프로필을 청첩장처럼 펼치는 공용 렌더러.
 * 상대 상세와 내 미리보기가 같은 화면을 쓴다 — "상대에게 보이는 화면"이 말 그대로가 되도록.
 * 대표 사진은 표지, 나머지 사진은 글 블록 사이에 화보처럼 흩는다(시드 고정 배치).
 */

export type InvitationLetter = {
  key: string;
  question: string | null;
  content: string;
  /** 잠긴 문답 — 질문은 보이되 답 대신 잠김 안내를 놓는다(지난 상대의 Give&Take). */
  locked?: boolean;
};

export function ProfileInvitation({
  nickname,
  meta,
  lastActive,
  jobVerified,
  jobDomain,
  photoUrls,
  letters,
  keywords,
  seed,
  c,
  onReport,
}: {
  nickname: string | null;
  meta: string;
  /** 최근 접속 버킷 — 상대 프로필에서만 넘긴다(내 미리보기에는 없음). */
  lastActive?: LastActive | null;
  /** 직장 인증 배지 — 모임 프로필과 같은 신뢰 신호. 미인증이면 아예 그리지 않는다. */
  jobVerified?: boolean;
  /** 인증한 회사 이메일 도메인 — 있으면 배지에 도메인을 그대로 쓴다("jobplanet.com 인증"). */
  jobDomain?: string | null;
  photoUrls: string[];
  letters: InvitationLetter[];
  keywords: string[];
  /** 사진 배치용 시드 — 같은 프로필은 항상 같은 배치. */
  seed: string;
  c: ThemeColors;
  /** 신고 진입점 — 상대 프로필에서만 넘긴다(내 미리보기에는 없음). */
  onReport?: () => void;
}) {
  const [cover, ...restPhotos] = photoUrls;
  const photoSlots = scatter(restPhotos.length, letters.length, seed);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {cover && (
        <Image source={{ uri: cover }} style={[styles.photo, { backgroundColor: c.backgroundSelected }]} contentFit="cover" transition={150} />
      )}

      {/* 표지 — 이름과 한 줄 정보, 그 아래 키워드. 긴 글 전에 훑는 요약은 표지 몫이다. */}
      <View style={styles.cover}>
        {nickname ? <Text style={[styles.name, { color: c.text, fontFamily: Fonts.serif }]}>{nickname}</Text> : null}
        <Text style={[styles.meta, { color: c.textSecondary }]}>{meta}</Text>
        {(jobVerified || lastActive) && (
          <View style={styles.badgeRow}>
            {jobVerified ? (
              <JobBadge c={c} domain={jobDomain} />
            ) : null}
            {lastActive ? (
              <View style={[styles.activity, { backgroundColor: c.backgroundElement }]}>
                {lastActive === 'TODAY' ? <View style={[styles.activityDot, { backgroundColor: c.primary }]} /> : null}
                <Text style={{ color: c.textSecondary, fontSize: 13 }}>{ACTIVITY_LABEL[lastActive]}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {keywords.length > 0 && (
        <View style={styles.chipWrap}>
          {keywords.map((item) => (
            <View key={item} style={[styles.chip, { backgroundColor: c.backgroundElement }]}>
              <Text style={{ color: c.textSecondary, fontSize: 14 }}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      <Divider c={c} />

      {/* 인사 — 편지는 인사로 시작한다. 쓸 말이 있는 사람에게만. */}
      {letters.length > 0 && (
        <Text style={[styles.greeting, { color: c.textSecondary, fontFamily: Fonts.serif }]}>안녕하세요,</Text>
      )}

      {letters.map((block, i) => (
        <View key={block.key}>
          <View style={styles.letter}>
            {block.question ? (
              <Text style={[styles.letterQuestion, { color: c.textSecondary }]}>{block.question}</Text>
            ) : null}
            {block.locked ? (
              <Text style={[styles.letterLocked, { color: c.textSecondary }]}>
                그날 질문에 답하지 않아{'\n'}잠긴 채로 남은 답장이에요
              </Text>
            ) : (
              <Text style={[styles.letterContent, { color: c.text, fontFamily: Fonts.serif }]}>{block.content}</Text>
            )}
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

      {/* 문답이 없어 자리를 못 얻은 사진들은 키워드 앞에 이어 붙인다 */}
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

      {/* 서명 — 부치는 사람이 보여야 편지다. */}
      {nickname && (
        <View style={styles.signature}>
          <Text style={[styles.signatureLead, { color: c.textSecondary }]}>마음을 담아,</Text>
          <Text style={[styles.signatureName, { color: c.text, fontFamily: Fonts.serif }]}>{nickname} 드림</Text>
        </View>
      )}

      {/* 신고 — 발밑에 조용히. 필요한 사람에게만 보이면 되는 문이다. */}
      {onReport && (
        <Pressable onPress={onReport} hitSlop={10} accessibilityRole="button" style={styles.report}>
          <Text style={[styles.reportText, { color: c.textSecondary }]}>이 프로필 신고하기</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

/**
 * 사진 n장을 블록 0..blockCount-1 뒤에 뿌릴 위치. 시드 고정 배치는 유지하되,
 * 블록을 사진 수만큼 구간으로 나눠 구간마다 한 장씩 놓는다 — 순수 난수는 슬롯이
 * 한곳에 몰려 사진이 연달아 나온 뒤에야 글이 시작되는 배치가 나올 수 있어서.
 * 구간 안에서 어디에 놓일지만 시드가 정한다.
 */
function scatter(photoCount: number, blockCount: number, seed: string): number[] {
  if (photoCount === 0 || blockCount === 0) return [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const slots: number[] = [];
  for (let i = 0; i < photoCount; i++) {
    const lo = Math.floor((i * blockCount) / photoCount);
    const hi = Math.floor(((i + 1) * blockCount) / photoCount);
    h = (h * 1103515245 + 12345) >>> 0;
    slots.push(lo + (h % Math.max(1, hi - lo)));
  }
  return slots;
}

/** 구분 장식 — 짧은 가는 선 하나. 청첩장의 여백을 가르는 데는 이걸로 충분하다. */
function Divider({ c }: { c: ThemeColors }) {
  return (
    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 64 },

  photo: { width: '100%', aspectRatio: 4 / 5 },
  interPhoto: { marginBottom: 34 },

  cover: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 32 },
  name: { fontSize: 30, fontWeight: '700', letterSpacing: 1 },
  meta: { fontSize: 14, letterSpacing: 1, marginTop: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 28, borderRadius: Radius.pill },
  activityDot: { width: 6, height: 6, borderRadius: 3 },

  divider: { alignItems: 'center', marginVertical: 30 },
  dividerLine: { width: 40, height: StyleSheet.hairlineWidth },

  greeting: { fontSize: 17, textAlign: 'center', marginBottom: 26 },

  letter: { paddingHorizontal: 32, marginBottom: 34 },
  letterQuestion: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  letterContent: { fontSize: 18, lineHeight: 30, textAlign: 'center', marginTop: 12 },
  letterLocked: { fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 12, opacity: 0.7 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 28, marginTop: 20 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: Radius.pill },
  skeletonLines: { width: '100%', marginTop: 14 },

  signature: { alignItems: 'center', marginTop: 44 },
  signatureLead: { fontSize: 13.5, letterSpacing: 0.5 },
  signatureName: { fontSize: 19, fontWeight: '700', marginTop: 6 },

  report: { alignItems: 'center', marginTop: 36 },
  reportText: { fontSize: 13.5, textDecorationLine: 'underline' },
});

/**
 * 초대장이 도착하기 전의 자리 표시 — [ProfileInvitation]과 같은 조판을 회색 면으로 먼저 세운다.
 *
 * 스피너는 "기다리라"고만 말하고, 내용이 들어오는 순간 화면이 통째로 바뀌어 눈이 다시 자리를
 * 찾는다. 이 화면은 사진 한 장·이름·한 줄 정보·키워드·문답이라는 **정해진 모양**이 있으므로
 * 그 모양을 미리 그려두면 무엇이 올지 읽히고, 채워질 때 화면이 튀지 않는다.
 *
 * 치수는 진짜 조판에서 그대로 가져온다 — 자리가 어긋나면 스켈레톤이 오히려 화면을 흔든다.
 */
export function ProfileInvitationSkeleton({ c }: { c: ThemeColors }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Skeleton c={c} width="100%" height={undefined} radius={0} style={styles.photo} />
      <View style={styles.cover}>
        <Skeleton c={c} width={132} height={30} />
        <Skeleton c={c} width={96} height={14} style={{ marginTop: 12 }} />
        <Skeleton c={c} width={104} height={23} radius={999} style={{ marginTop: 14 }} />
      </View>
      <View style={styles.chipWrap}>
        {[74, 58, 88, 66].map((w) => (
          <Skeleton key={w} c={c} width={w} height={30} radius={999} />
        ))}
      </View>
      {/* 문답 두 장 — 셋 이상 그리면 실제보다 길어 보여 화면이 줄어드는 인상을 준다. */}
      {[0, 1].map((i) => (
        <View key={i} style={[styles.letter, { marginTop: i === 0 ? 34 : 0, alignItems: 'center' }]}>
          <Skeleton c={c} width="72%" height={14} />
          <SkeletonLines c={c} lines={3} lineHeight={18} gap={12} style={styles.skeletonLines} />
        </View>
      ))}
    </ScrollView>
  );
}
