import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SkeletonList, Skeleton, SkeletonTextCard } from '@/components/skeleton';
import { JobBadge } from '@/components/job-badge';
import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  cancelHosting,
  closeHosting,
  completeHosting,
  confirmApplication,
  declineApplication,
  getMyMeetups,
  reopenHosting,
  type HostApplication,
  type HostMeetup,
} from '@/lib/meetups';

/**
 * 모임 관리 — 내가 연 모임의 신청자를 확정/거절하고, 모집을 여닫고, 개최를 마무리한다.
 *
 * 확정은 "카카오에서 입금을 확인했다"는 모임장의 표시다. 확정하면 신청자에게 푸시가 간다.
 * 개최 완료를 눌러야 히스토리(개최 횟수 = 신뢰 신호)에 쌓인다.
 */
export default function MyMeetupsScreen() {
  const c = useTheme();
  const router = useRouter();
  const [meetups, setMeetups] = useState<HostMeetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // 목록을 읽은 시각 — '모임 시각이 지났는지'를 렌더 중 Date.now()로 묻지 않기 위해 stamp를 둔다.
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    try {
      setNow(Date.now());
      setMeetups(await getMyMeetups());
    } catch {
      // 세션 만료 등 — 빈 상태로 둔다
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
      await load();
    } catch (e) {
      Alert.alert('처리하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setBusy(null);
    }
  }

  function confirmCancelMeetup(m: HostMeetup) {
    Alert.alert('모임을 취소할까요?', '신청한 사람들에게 취소 알림이 가요. 되돌릴 수 없어요.', [
      { text: '그냥 둘게요', style: 'cancel' },
      { text: '모임 취소', style: 'destructive', onPress: () => void run(m.meetupId, () => cancelHosting(m.meetupId)) },
    ]);
  }

  const dateFmt = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  const active = meetups.filter((m) => m.status === 'OPEN' || m.status === 'CLOSED');
  const past = meetups.filter((m) => m.status === 'DONE' || m.status === 'CANCELED');

  return (
    <SubScreen title="모임 관리" c={c}>
      {loading ? (
        <SkeletonList c={c}>
          <Skeleton c={c} height={150} radius={Radius.lg} />
          <SkeletonTextCard c={c} bodyLines={2} />
        </SkeletonList>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {meetups.length > 0 && (
            <View style={[styles.searchBox, { backgroundColor: c.backgroundElement }]}>
              <Ionicons name="search" size={15} color={c.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="신청자 닉네임 검색"
                placeholderTextColor={c.textSecondary}
                style={[styles.searchInput, { color: c.text }]}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={15} color={c.textSecondary} />
                </Pressable>
              )}
            </View>
          )}
          {meetups.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.emptyTitle, { color: c.text }]}>아직 연 모임이 없어요</Text>
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                첫 모임을 열어보세요. 신청·확정·개최 기록이{'\n'}모임장님의 공개 프로필이 돼요.
              </Text>
              <Pressable onPress={() => router.push('/meetup-create')} style={[styles.emptyBtn, { backgroundColor: c.primary }]}>
                <Text style={[styles.emptyBtnText, { color: c.primaryText }]}>모임 열기</Text>
              </Pressable>
            </View>
          )}

          {[...active, ...past].map((m) => {
            /*
             * 개최 완료를 막는 이유 — 없으면 null(누를 수 있음).
             * 버튼을 숨기는 대신 흐리게 두고, 누르면 이유를 말한다:
             * 할 수 있는 일의 목록이 상태에 따라 들쭉날쭉하면 무엇을 할 수 있는 화면인지 배우기 어렵다.
             */
            const completeBlocked =
              new Date(m.meetAt).getTime() > now
                ? '개최 시간이 아직 지나지 않았어요.\n모임 시각이 지난 뒤에 완료로 남겨주세요.'
                : m.confirmedCount === 0
                  ? '확정된 참가자가 한 명 이상 있어야 해요.\n신청자를 먼저 확정해주세요.'
                  : null;
            return (
            <View key={m.meetupId} style={[styles.card, { backgroundColor: c.backgroundElement }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                  {m.title}
                </Text>
                <StatusChip status={m.status} c={c} />
              </View>
              <Text style={[styles.cardMeta, { color: c.textSecondary }]}>
                {dateFmt.format(new Date(m.meetAt))} · {m.place}
              </Text>
              <Text style={[styles.cardMeta, { color: c.textSecondary }]}>
                확정 {m.confirmedCount}/{m.capacity}명 ·{' '}
                {m.feeFemale != null && m.feeFemale !== m.fee
                  ? `남 ${m.fee.toLocaleString('ko-KR')}원 · 여 ${m.feeFemale > 0 ? `${m.feeFemale.toLocaleString('ko-KR')}원` : '무료'}`
                  : m.fee > 0
                    ? `참가비 ${m.fee.toLocaleString('ko-KR')}원`
                    : '무료'}
              </Text>

              {/* 신청자 — 확정은 입금 확인의 표시. */}
              {(m.status === 'OPEN' || m.status === 'CLOSED') && (
                <View style={[styles.applicants, { borderTopColor: c.border }]}>
                  {m.applications.filter((a) => a.status !== 'CANCELED' && (query.trim() === '' || (a.nickname ?? '').includes(query.trim()))).length === 0 ? (
                    <Text style={[styles.noApplicants, { color: c.textSecondary }]}>
                      {query.trim() !== '' ? '검색과 일치하는 신청자가 없어요.' : '아직 신청이 없어요 — 신청이 오면 알려드릴게요.'}
                    </Text>
                  ) : (
                    m.applications
                      .filter((a) => a.status !== 'CANCELED' && (query.trim() === '' || (a.nickname ?? '').includes(query.trim())))
                      .map((a) => (
                        <ApplicantRow
                          key={a.applicationId}
                          a={a}
                          c={c}
                          busy={busy === a.applicationId}
                          onConfirm={() => void run(a.applicationId, () => confirmApplication(a.applicationId))}
                          onDecline={() =>
                            Alert.alert('거절할까요?', `${a.nickname ?? '신청자'} 님의 신청을 거절해요.`, [
                              { text: '취소', style: 'cancel' },
                              {
                                text: '거절',
                                style: 'destructive',
                                onPress: () => void run(a.applicationId, () => declineApplication(a.applicationId)),
                              },
                            ])
                          }
                        />
                      ))
                  )}
                </View>
              )}

              {/*
                * 개최를 마친 모임은 '다음 회차'를 열 수 있다 — 같은 내용이 그대로 채워지고,
                * 지난 회차를 따라가던 사람들에게 알림이 간다. 단발 모임에 연속성을 주는 유일한 길.
                */}
              {m.status === 'DONE' && m.seriesId != null && (
                <View style={styles.actions}>
                  <ActionBtn
                    label="다음 회차 열기"
                    c={c}
                    primary
                    onPress={() => router.push(`/meetup-create?repeat=${m.meetupId}`)}
                  />
                </View>
              )}

              {/* 모임 상태 동작 — 지금 할 수 있는 것만. */}
              {(m.status === 'OPEN' || m.status === 'CLOSED') && (
                <View style={styles.actions}>
                  <ActionBtn label="수정" c={c} onPress={() => router.push(`/meetup-create?edit=${m.meetupId}`)} />
                  {m.status === 'OPEN' ? (
                    <ActionBtn label="모집 마감" c={c} onPress={() => void run(m.meetupId, () => closeHosting(m.meetupId))} />
                  ) : (
                    <ActionBtn label="다시 열기" c={c} onPress={() => void run(m.meetupId, () => reopenHosting(m.meetupId))} />
                  )}
                  {/*
                    * 개최 횟수는 모임장의 공개 신뢰 신호라, 모임 시각이 지나고 확정 참가자가 있어야 남길 수 있다
                    * (서버도 같은 규칙으로 막는다). 조건이 안 맞으면 버튼을 흐리게 두고 누르면 이유를 말한다.
                    */}
                  <ActionBtn
                    label="개최 완료"
                    c={c}
                    primary
                    dimmed={completeBlocked != null}
                    onPress={() =>
                      completeBlocked != null
                        ? Alert.alert('아직 개최 완료를 할 수 없어요', completeBlocked)
                        : Alert.alert('개최 완료로 표시할까요?', '모임이 잘 끝났다면 완료로 남겨요. 개최 기록이 돼요.', [
                            { text: '취소', style: 'cancel' },
                            { text: '개최 완료', onPress: () => void run(m.meetupId, () => completeHosting(m.meetupId)) },
                          ])
                    }
                  />
                  <Pressable onPress={() => confirmCancelMeetup(m)} hitSlop={8} style={styles.cancelWrap}>
                    <Text style={[styles.cancelLink, { color: c.textSecondary }]}>모임 취소</Text>
                  </Pressable>
                </View>
              )}

            </View>
            );
          })}
        </ScrollView>
      )}
    </SubScreen>
  );
}

function StatusChip({ status, c }: { status: string; c: ThemeColors }) {
  const label =
    status === 'OPEN' ? '모집 중' : status === 'CLOSED' ? '모집 마감' : status === 'DONE' ? '개최 완료' : '취소됨';
  const strong = status === 'OPEN';
  return (
    <View style={[styles.statusChip, { backgroundColor: strong ? c.primary + '22' : c.backgroundSelected }]}>
      <Text style={[styles.statusChipText, { color: strong ? c.primaryStrong : c.textSecondary }]}>{label}</Text>
    </View>
  );
}

function ApplicantRow({
  a,
  c,
  busy,
  onConfirm,
  onDecline,
}: {
  a: HostApplication;
  c: ThemeColors;
  busy: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const meta = [a.gender === 'MALE' ? '남' : a.gender === 'FEMALE' ? '여' : null, a.age ? `${a.age}세` : null, a.region]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.applicantRow}>
      <View style={styles.flex}>
        <View style={styles.applicantNameRow}>
          <Text style={[styles.applicantName, { color: c.text }]}>{a.nickname ?? '(알 수 없음)'}</Text>
          {/* 확정할지 말지 정하는 자리 — 신뢰 신호가 가장 값진 곳이다. 회사가 어디인지는 프로필에서. */}
          {a.jobVerified ? <JobBadge c={c} label="인증" /> : null}
        </View>
        {meta ? <Text style={[styles.applicantMeta, { color: c.textSecondary }]}>{meta}</Text> : null}
      </View>
      {a.status === 'CONFIRMED' ? (
        <View style={[styles.confirmedChip, { backgroundColor: c.primary }]}>
          <Ionicons name="checkmark" size={13} color={c.primaryText} />
          <Text style={[styles.confirmedChipText, { color: c.primaryText }]}>확정</Text>
        </View>
      ) : a.status === 'DECLINED' ? (
        <Text style={[styles.declinedText, { color: c.textSecondary }]}>거절함</Text>
      ) : busy ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        <View style={styles.applicantBtns}>
          <Pressable onPress={onConfirm} style={[styles.smallBtn, { backgroundColor: c.text }]}>
            <Text style={[styles.smallBtnText, { color: c.background }]}>확정</Text>
          </Pressable>
          <Pressable onPress={onDecline} style={[styles.smallBtn, styles.smallBtnGhost, { borderColor: c.border }]}>
            <Text style={[styles.smallBtnText, { color: c.textSecondary }]}>거절</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * 카드 안의 작은 동작 버튼.
 * [dimmed]는 '지금은 못 누른다'는 표시일 뿐 실제로 막지는 않는다 — 눌러야 이유를 들을 수 있어서다.
 */
function ActionBtn({
  label,
  c,
  primary,
  onPress,
  dimmed,
}: {
  label: string;
  c: ThemeColors;
  primary?: boolean;
  onPress: () => void;
  dimmed?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        primary ? { backgroundColor: c.primary } : { borderWidth: 1, borderColor: c.border },
        { opacity: dimmed ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.actionBtnText, { color: primary ? c.primaryText : c.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, borderRadius: Radius.pill, paddingHorizontal: 13, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 },

  emptyCard: { borderRadius: Radius.lg, alignItems: 'center', paddingVertical: 36, paddingHorizontal: 28 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  emptyBtn: { height: 44, paddingHorizontal: 26, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  emptyBtnText: { fontSize: 15, fontWeight: '700' },

  card: { borderRadius: Radius.lg, padding: 18, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  statusChip: { height: 24, paddingHorizontal: 10, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  statusChipText: { fontSize: 12.5, fontWeight: '700' },
  cardMeta: { fontSize: 14, marginTop: 5 },

  applicants: { marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  noApplicants: { fontSize: 14, paddingVertical: 8 },
  applicantRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  applicantNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  applicantName: { fontSize: 15, fontWeight: '600' },
  applicantMeta: { fontSize: 13, marginTop: 1 },
  applicantBtns: { flexDirection: 'row', gap: 8 },
  smallBtn: { height: 32, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  smallBtnGhost: { borderWidth: 1 },
  smallBtnText: { fontSize: 13.5, fontWeight: '700' },
  confirmedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 11, borderRadius: Radius.pill },
  confirmedChipText: { fontSize: 13, fontWeight: '700' },
  declinedText: { fontSize: 13.5 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  actionBtn: { height: 38, paddingHorizontal: 16, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  cancelWrap: { marginLeft: 'auto' },
  cancelLink: { fontSize: 13.5, textDecorationLine: 'underline' },
});
