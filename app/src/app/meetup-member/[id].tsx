import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { JobBadge } from '@/components/job-badge';
import { Skeleton, SkeletonLines } from '@/components/skeleton';
import { Image } from 'expo-image';

import { Avatar } from '@/components/avatar';
import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { thumbUrl } from '@/lib/image';
import { getMeetupMemberProfile, type MeetupMemberHistoryRow } from '@/lib/meetups';

/**
 * 모임 멤버 프로필 — 모임 세계의 평판.
 *
 * 프로필(닉네임·성별·나이·지역·아바타·소개)과 모임 이력(개최·참여)까지만 보인다.
 * 문답 답변과 편지는 여기 없다 — 매칭의 사적인 기록은 모임으로 새어 나가지 않는다.
 *
 * 개최 이력은 모임장으로 들어왔을 때(role=host)만 보인다 — 참여자 프로필에서
 * "개최한 모임 0"은 판단에 쓸모없는 소음이다(유저 결정 2026-08-24).
 */
export default function MeetupMemberScreen() {
  const c = useTheme();
  const { id, role, nickname: knownNickname } = useLocalSearchParams<{ id: string; role?: string; nickname?: string }>();
  const asHost = role === 'host';

  /*
   * 두 번째 방문은 기다림이 없다 — 캐시에 남아 있으면 그대로 그리고 갱신은 뒤에서 조용히 한다.
   * 이 화면만 useState + useEffect로 남아 있어서 매번 처음부터 받아오고 있었다.
   */
  const profileQuery = useQuery({ queryKey: ['meetup', 'member', String(id)], queryFn: () => getMeetupMemberProfile(String(id)) });
  const profile = profileQuery.data ?? null;
  const loading = profileQuery.isPending;

  const meta =
    profile == null
      ? ''
      : /*
         * 모임장은 나이·성별을 싣지 않는다.
         *
         * 모임장은 소개받으러 온 사람이 아니라 그 자리를 여는 사람이다. 참여자가 알고 싶은 것은
         * "몇 살인가"가 아니라 "이 사람이 모임을 제대로 여는가"이고, 그 답은 개최 이력에 있다.
         * 매칭의 잣대를 운영자에게 들이대면 모임이 소개팅의 곁가지로만 읽힌다.
         *
         * 참여자 프로필에는 그대로 둔다 — 그쪽은 모임장이 "이 사람을 받을까"를 정하는 자리라
         * 나이와 성별이 실제 판단 재료다.
         */
        [
          asHost ? null : profile.gender === 'MALE' ? '남성' : profile.gender === 'FEMALE' ? '여성' : null,
          asHost ? null : profile.age ? `${profile.age}세` : null,
          profile.region,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <SubScreen title="모임 프로필" c={c}>
      {loading ? (
        /*
         * 아는 것은 즉시 세우고 모르는 것만 회색으로 둔다.
         *
         * 목록에서 이 사람의 이름을 이미 보고 눌렀다. 그걸 버리고 통째로 회색을 그리면,
         * 내가 누른 사람이 맞는지 확인하는 데까지 한 박자가 더 든다. 이름을 넘겨받아 먼저 세우면
         * 그 확인이 즉시 끝나고, 기다림은 소개·이력처럼 원래 모르던 부분에만 남는다.
         *
         * 카드 조판이라 초대장 스켈레톤은 쓰지 않는다 — 자리가 어긋나면 채워질 때 화면이 튄다.
         */
        <View style={styles.content}>
          <View style={[styles.card, styles.profileCard, { backgroundColor: c.backgroundElement }]}>
            <Skeleton c={c} width={64} height={80} radius={Radius.sm} />
            <View style={styles.flex}>
              {knownNickname ? (
                <Text style={[styles.nickname, { color: c.text }]}>{knownNickname}</Text>
              ) : (
                <Skeleton c={c} width={108} height={19} />
              )}
              <Skeleton c={c} width={140} height={14} style={{ marginTop: 9 }} />
            </View>
          </View>
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            <SkeletonLines c={c} lines={3} lineHeight={15} />
          </View>
        </View>
      ) : profile == null ? (
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary, fontSize: 15 }}>프로필을 불러오지 못했어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* 프로필 — 여기까지만 공개. */}
          <View style={[styles.card, styles.profileCard, { backgroundColor: c.backgroundElement }]}>
            {/*
             * 편지함의 봉투와 같은 4:5 조각. 아바타 일러스트보다 실제 얼굴이 낫다 —
             * 모임은 진짜로 만나러 가는 자리라, 누구를 만나는지 아는 편이 안전하다.
             * 사진이 없는 사람은 그대로 아바타로 그린다.
             */}
            {profile.photoUrl ? (
              <Image
                source={{ uri: thumbUrl(profile.photoUrl, 260) }}
                style={[styles.photo, { backgroundColor: c.backgroundSelected }]}
                /*
                 * 잘라내지 않고 줄여서 넣는다.
                 *
                 * cover는 4:5 자리를 꽉 채우는 대신 사진의 바깥을 잘라낸다. 편지함의 봉투처럼
                 * 조각으로 스쳐 지나가는 자리라면 그게 맞지만, 여기는 "이 사람이 누구인가"를
                 * 보러 들어온 화면이다. 전신 사진이나 가로 사진이 허리께만 남으면 얼굴을 보러
                 * 온 사람에게 아무것도 주지 못한다.
                 */
                contentFit="contain"
                transition={150}
              />
            ) : (
              <Avatar avatarId={profile.avatarId} nickname={profile.nickname ?? undefined} size={64} c={c} />
            )}
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text style={[styles.nickname, { color: c.text }]}>{profile.nickname ?? '(알 수 없음)'}</Text>
                {/*
                  모임장에게는 직장 인증을 달지 않는다.

                  나이·성별을 뺀 것과 같은 이유다 — 운영자에게 매칭의 잣대를 대지 않는다.
                  여기서 봐야 할 것은 이 사람이 어떤 자리를 몇 번 열었는가이고, 그건 아래
                  '개최한 모임'이 말한다. 참가자 프로필에서는 그대로 둔다. 함께 앉을 사람이
                  누구인지는 안전의 문제라 신호가 하나라도 더 필요하다.
                */}
                {!asHost && profile.jobVerified && <JobBadge c={c} domain={profile.jobDomain} />}
              </View>
              {meta ? <Text style={[styles.meta, { color: c.textSecondary }]}>{meta}</Text> : null}
            </View>
          </View>
          {profile.bio ? (
            <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.bio, { color: c.text }]}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* 모임 이력 — 숫자가 곧 평판이다. */}
          <View style={styles.statRow}>
            {asHost && (
              <View style={[styles.statCard, { backgroundColor: c.backgroundElement }]}>
                <Text style={[styles.statNum, { color: c.primaryStrong }]}>{profile.hostedCount}</Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>개최한 모임</Text>
              </View>
            )}
            <View style={[styles.statCard, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.statNum, { color: c.primaryStrong }]}>{profile.participatedCount}</Text>
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>참여한 모임</Text>
            </View>
          </View>

          {asHost && (
            <HistorySection title="개최한 모임" rows={profile.hostedRecent} emptyText="아직 개최한 모임이 없어요." withCount c={c} />
          )}
          <HistorySection title="참여한 모임" rows={profile.participatedRecent} emptyText="아직 참여한 모임이 없어요." c={c} />

          <Text style={[styles.note, { color: c.textSecondary }]}>
            모임 프로필에는 모임 활동만 보여요. 문답과 편지는 공개되지 않아요.
          </Text>
        </ScrollView>
      )}
    </SubScreen>
  );
}

function HistorySection({
  title,
  rows,
  emptyText,
  withCount,
  c,
}: {
  title: string;
  rows: MeetupMemberHistoryRow[];
  emptyText: string;
  withCount?: boolean;
  c: ThemeColors;
}) {
  const dateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
        {rows.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>{emptyText}</Text>
        ) : (
          rows.map((row, i) => (
            <View
              key={`${row.title}-${row.meetAt}`}
              style={[styles.historyRow, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
            >
              <View style={styles.flex}>
                <Text style={[styles.historyTitle, { color: c.text }]} numberOfLines={1}>
                  {row.title}
                </Text>
                <Text style={[styles.historyMeta, { color: c.textSecondary }]}>{dateFmt.format(new Date(row.meetAt))}</Text>
              </View>
              {withCount && <Text style={[styles.historyCount, { color: c.primaryStrong }]}>{row.confirmedCount}명 참여</Text>}
            </View>
          ))
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  card: { borderRadius: Radius.lg, padding: 16, marginBottom: 8 },
  photo: { width: 76, height: 95, borderRadius: Radius.sm },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nickname: { fontSize: 19, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 3 },
  bio: { fontSize: 15.5, lineHeight: 23 },

  statRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 3 },

  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 14, marginBottom: 8, paddingHorizontal: 2 },
  emptyText: { fontSize: 14, paddingVertical: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  historyTitle: { fontSize: 15, fontWeight: '600' },
  historyMeta: { fontSize: 13, marginTop: 2 },
  historyCount: { fontSize: 13.5, fontWeight: '700' },

  note: { fontSize: 13, lineHeight: 19, marginTop: 16, paddingHorizontal: 2, textAlign: 'center' },
});
