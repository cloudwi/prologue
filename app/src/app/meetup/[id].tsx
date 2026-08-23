import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PhotoPager } from '@/components/photo-pager';

import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import {
  applyMeetup,
  cancelMeetup,
  conditionLabel,
  feeLabel,
  getMeetups,
  type Meetup,
} from '@/lib/meetups';

/**
 * 모임 상세 — 목록 카드는 훑는 곳, 여기는 결정하는 곳.
 * 소개·모임장 이력·참가자·조건 전부와 신청/취소/오픈채팅 동작이 여기에 산다.
 */
export default function MeetupDetailScreen() {
  const c = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getMeetups();
      setMeetup(all.find((m) => m.meetupId === id) ?? null);
    } catch {
      // 세션 만료 등 — 빈 상태로 둔다
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dateFmt = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  function confirmApply(m: Meetup) {
    Alert.alert(
      '모임에 신청할까요?',
      [
        '신청하면 모임장의 카카오 오픈채팅 링크가 열려요.',
        m.fee > 0 || (m.feeFemale ?? 0) > 0 ? `참가비(${feeLabel(m)})는 오픈채팅에서 모임장에게 직접 보내요.` : '참가비는 없어요.',
        '모임장이 확인하면 참여가 확정돼요.',
      ].join('\n'),
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신청하기',
          onPress: async () => {
            setBusy(true);
            try {
              await applyMeetup(m.meetupId);
              track('meetup_applied');
              await load();
            } catch (e) {
              Alert.alert('신청하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  function confirmCancel(m: Meetup) {
    Alert.alert('신청을 취소할까요?', '이미 참가비를 보냈다면 모임장에게 오픈채팅으로 알려주세요.', [
      { text: '그냥 둘게요', style: 'cancel' },
      {
        text: '신청 취소',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await cancelMeetup(m.meetupId);
            await load();
          } catch (e) {
            Alert.alert('취소하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  function openKakao(link: string) {
    void Linking.openURL(link).catch(() => Alert.alert('링크를 열지 못했어요', link));
  }

  return (
    <SubScreen title="모임" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : meetup == null ? (
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary, fontSize: 15 }}>모임을 찾을 수 없어요 — 마감됐거나 취소됐을 수 있어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {meetup.coverUrls.length > 0 ? (
            <View style={styles.coverPagerWrap}>
              <PhotoPager photos={meetup.coverUrls} aspectRatio={16 / 9} backgroundColor={c.backgroundSelected} />
            </View>
          ) : meetup.emoji != null ? (
            <View style={[styles.coverBanner, { backgroundColor: meetup.color ?? c.backgroundSelected }]}>
              <Text style={styles.coverBannerEmoji}>{meetup.emoji}</Text>
            </View>
          ) : null}
          <View style={styles.head}>
            <Text style={[styles.title, { color: c.text }]}>{meetup.title}</Text>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: meetup.status === 'OPEN' ? c.primary + '22' : c.backgroundSelected },
              ]}
            >
              <Text style={[styles.statusChipText, { color: meetup.status === 'OPEN' ? c.primaryStrong : c.textSecondary }]}>
                {meetup.status === 'OPEN' ? '모집 중' : '모집 마감'}
              </Text>
            </View>
          </View>

          {/* 핵심 정보 — 한 칸에 한 사실. */}
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            <InfoRow icon="calendar-outline" text={dateFmt.format(new Date(meetup.meetAt))} c={c} />
            <InfoRow icon="location-outline" text={meetup.place} c={c} />
            {/* 지도 — 주소가 있으면 네이버·카카오 둘 다, 옛 데이터는 저장된 링크 하나. */}
            {meetup.placeAddress != null ? (
              <View style={styles.mapRow}>
                <Pressable
                  onPress={() => void Linking.openURL(`https://map.naver.com/p/search/${encodeURIComponent(meetup.placeAddress!)}`)}
                  style={[styles.mapBtn, { borderColor: c.border }]}
                >
                  <Ionicons name="map-outline" size={13} color={c.primaryStrong} />
                  <Text style={[styles.mapBtnText, { color: c.primaryStrong }]}>네이버 지도</Text>
                </Pressable>
                <Pressable
                  onPress={() => void Linking.openURL(`https://map.kakao.com/link/search/${encodeURIComponent(meetup.placeAddress!)}`)}
                  style={[styles.mapBtn, { borderColor: c.border }]}
                >
                  <Ionicons name="map-outline" size={13} color={c.primaryStrong} />
                  <Text style={[styles.mapBtnText, { color: c.primaryStrong }]}>카카오맵</Text>
                </Pressable>
              </View>
            ) : meetup.placeUrl != null ? (
              <View style={styles.mapRow}>
                <Pressable onPress={() => void Linking.openURL(meetup.placeUrl!)} style={[styles.mapBtn, { borderColor: c.border }]}>
                  <Ionicons name="map-outline" size={13} color={c.primaryStrong} />
                  <Text style={[styles.mapBtnText, { color: c.primaryStrong }]}>지도</Text>
                </Pressable>
              </View>
            ) : null}
            <InfoRow icon="cash-outline" text={feeLabel(meetup)} c={c} />
            <InfoRow icon="people-outline" text={`확정 ${meetup.confirmedCount}/${meetup.capacity}명`} c={c} />
            {conditionLabel(meetup) && <InfoRow icon="filter-outline" text={`참가 조건 · ${conditionLabel(meetup)}`} c={c} />}
          </View>

          {/* 모임장 — 이름과 함께 개최 기록을 숫자로. 탭하면 모임 프로필로. */}
          <Text style={[styles.sectionTitle, { color: c.text }]}>모임장</Text>
          <Pressable
            onPress={() => router.push(`/meetup-member/${meetup.hostAccountId}`)}
            style={({ pressed }) => [styles.card, styles.hostCard, { backgroundColor: c.backgroundElement, opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.flex}>
              <Text style={[styles.hostName, { color: c.text }]}>{meetup.hostNickname ?? '(알 수 없음)'}</Text>
              <Text style={[styles.hostMeta, { color: c.textSecondary }]}>
                {meetup.hostDoneCount > 0 ? `지금까지 ${meetup.hostDoneCount}회 개최` : '첫 모임이에요'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
          </Pressable>

          {meetup.description ? (
            <>
              <Text style={[styles.sectionTitle, { color: c.text }]}>소개</Text>
              <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
                <Text style={[styles.desc, { color: c.text }]}>{meetup.description}</Text>
              </View>
            </>
          ) : null}

          {meetup.participants.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: c.text }]}>함께해요 ({meetup.participants.length})</Text>
              <View style={[styles.card, styles.participantWrap, { backgroundColor: c.backgroundElement }]}>
                {meetup.participants.map((p) => (
                  <Pressable
                    key={p.accountId}
                    onPress={() => router.push(`/meetup-member/${p.accountId}`)}
                    style={({ pressed }) => [styles.participantChip, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.participantName, { color: c.text }]}>{p.nickname ?? '(알 수 없음)'}</Text>
                    <Ionicons name="chevron-forward" size={12} color={c.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* 다음 할 일 하나 — 내 상태에 따라. */}
          <View style={styles.actions}>
            {meetup.isMine ? (
              <Pressable
                onPress={() => router.push('/my-meetups')}
                style={({ pressed }) => [styles.bigBtn, { borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.bigBtnText, { color: c.text }]}>내 모임 — 신청자 관리</Text>
              </Pressable>
            ) : meetup.myStatus === 'CONFIRMED' ? (
              <>
                <View style={[styles.confirmedChip, { backgroundColor: c.primary }]}>
                  <Ionicons name="checkmark" size={15} color={c.primaryText} />
                  <Text style={[styles.confirmedText, { color: c.primaryText }]}>참여 확정</Text>
                </View>
                {meetup.kakaoLink && (
                  <Pressable
                    onPress={() => openKakao(meetup.kakaoLink!)}
                    style={({ pressed }) => [styles.bigBtn, { backgroundColor: c.text, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.bigBtnText, { color: c.background }]}>오픈채팅 열기</Text>
                  </Pressable>
                )}
              </>
            ) : meetup.myStatus === 'APPLIED' ? (
              <>
                <Text style={[styles.appliedNote, { color: c.primaryStrong }]}>
                  신청했어요 — 오픈채팅에서 인사를 남기면 모임장이 확정해 드려요.
                </Text>
                {meetup.kakaoLink && (
                  <Pressable
                    onPress={() => openKakao(meetup.kakaoLink!)}
                    style={({ pressed }) => [styles.bigBtn, { backgroundColor: c.text, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.bigBtnText, { color: c.background }]}>오픈채팅 열기</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => confirmCancel(meetup)} hitSlop={8} disabled={busy} style={styles.cancelWrap}>
                  <Text style={[styles.cancelLink, { color: c.textSecondary }]}>신청 취소</Text>
                </Pressable>
              </>
            ) : meetup.myStatus === 'DECLINED' ? (
              <Text style={[styles.appliedNote, { color: c.textSecondary }]}>
                이번에는 함께하지 못했어요. 다음 모임에서 만나요.
              </Text>
            ) : meetup.status === 'OPEN' ? (
              <Pressable
                onPress={() => confirmApply(meetup)}
                disabled={busy}
                style={({ pressed }) => [styles.bigBtn, { backgroundColor: c.primary, opacity: pressed || busy ? 0.7 : 1 }]}
              >
                <Text style={[styles.bigBtnText, { color: c.primaryText }]}>신청하기</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SubScreen>
  );
}

function InfoRow({ icon, text, c }: { icon: keyof typeof Ionicons.glyphMap; text: string; c: ThemeColors }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={c.textSecondary} />
      <Text style={[styles.infoText, { color: c.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  coverBanner: { height: 96, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  coverPagerWrap: { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: 14 },
  coverBannerEmoji: { fontSize: 48 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 2, marginBottom: 14 },
  title: { fontSize: 21, fontWeight: '700', flexShrink: 1 },
  statusChip: { height: 26, paddingHorizontal: 11, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  statusChipText: { fontSize: 13, fontWeight: '700' },

  card: { borderRadius: Radius.lg, padding: 16, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  infoText: { fontSize: 15.5, flexShrink: 1 },
  mapRow: { flexDirection: 'row', gap: 8, paddingLeft: 27, paddingVertical: 4 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 28, paddingHorizontal: 11, borderRadius: Radius.pill, borderWidth: 1 },
  mapBtnText: { fontSize: 12.5, fontWeight: '700' },

  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 14, marginBottom: 8, paddingHorizontal: 2 },
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hostName: { fontSize: 16, fontWeight: '700' },
  hostMeta: { fontSize: 13.5, marginTop: 3 },
  desc: { fontSize: 15.5, lineHeight: 23 },
  participantWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 34,
    paddingLeft: 13,
    paddingRight: 9,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  participantName: { fontSize: 14, fontWeight: '600' },

  actions: { marginTop: 22, gap: 12 },
  bigBtn: { height: 50, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  bigBtnText: { fontSize: 16, fontWeight: '700' },
  confirmedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', height: 34, paddingHorizontal: 14, borderRadius: Radius.pill },
  confirmedText: { fontSize: 14.5, fontWeight: '700' },
  appliedNote: { fontSize: 14.5, lineHeight: 21, fontWeight: '600', paddingHorizontal: 2 },
  cancelWrap: { alignSelf: 'center', marginTop: 2 },
  cancelLink: { fontSize: 14, textDecorationLine: 'underline' },
});
