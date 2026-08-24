import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMeetupMemberProfile, type MeetupMemberHistoryRow, type MeetupMemberProfile } from '@/lib/meetups';

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
  const { id, role } = useLocalSearchParams<{ id: string; role?: string }>();
  const asHost = role === 'host';

  const [profile, setProfile] = useState<MeetupMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMeetupMemberProfile(String(id))
      .then((p) => active && setProfile(p))
      .catch(() => active && setProfile(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const meta =
    profile == null
      ? ''
      : [profile.gender === 'MALE' ? '남성' : profile.gender === 'FEMALE' ? '여성' : null, profile.age ? `${profile.age}세` : null, profile.region]
          .filter(Boolean)
          .join(' · ');

  return (
    <SubScreen title="모임 프로필" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : profile == null ? (
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary, fontSize: 15 }}>프로필을 불러오지 못했어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* 프로필 — 여기까지만 공개. */}
          <View style={[styles.card, styles.profileCard, { backgroundColor: c.backgroundElement }]}>
            <Avatar avatarId={profile.avatarId} nickname={profile.nickname ?? undefined} size={64} c={c} />
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text style={[styles.nickname, { color: c.text }]}>{profile.nickname ?? '(알 수 없음)'}</Text>
                {profile.jobVerified && (
                  <View style={[styles.jobBadge, { backgroundColor: c.primary }]}>
                    <Ionicons name="briefcase" size={11} color={c.primaryText} />
                    <Text style={[styles.jobBadgeText, { color: c.primaryText }]}>
                      {profile.jobDomain ? `${profile.jobDomain} 인증` : '직장 인증'}
                    </Text>
                  </View>
                )}
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
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nickname: { fontSize: 19, fontWeight: '700' },
  jobBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, paddingHorizontal: 8, borderRadius: 11 },
  jobBadgeText: { fontSize: 11.5, fontWeight: '700' },
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
