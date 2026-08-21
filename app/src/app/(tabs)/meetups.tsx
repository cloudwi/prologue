import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { BottomTabInset, Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { isSessionExpired } from '@/lib/api';
import {
  applyMeetup,
  cancelMeetup,
  getMeetupHistory,
  getMeetups,
  type Meetup,
  type MeetupHistory,
} from '@/lib/meetups';

/**
 * 모임 — 모임장이 여는 오프라인 모임에 손을 드는 곳.
 *
 * 앱은 신청까지만 한다. 참가비 입금과 대화는 모임장의 카카오 오픈채팅에서 이뤄지고
 * (링크는 신청해야 열린다), 모임장이 입금을 확인하면 "참여 확정" 표시가 돌아온다.
 * 지난 모임 기록(개최 횟수·참여 인원)을 함께 보여준다 — 잘 굴러가는 모임이라는
 * 증거는 우리가 말하는 것보다 기록이 말하는 게 낫다.
 */
export default function MeetupsScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [history, setHistory] = useState<MeetupHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ups, done] = await Promise.all([
        getMeetups(),
        getMeetupHistory().catch(() => []),
      ]);
      setMeetups(ups);
      setHistory(done);
    } catch (e) {
      if (isSessionExpired(e)) {
        router.replace('/');
        return;
      }
      // 구버전 서버 등 — 빈 상태로 둔다
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dateFmt = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  /** 손들기 — 무엇이 어떻게 진행되는지(카카오에서 입금·확정) 먼저 말해준다. */
  function confirmApply(m: Meetup) {
    Alert.alert(
      '모임에 신청할까요?',
      [
        '신청하면 모임장의 카카오 오픈채팅 링크가 열려요.',
        m.fee > 0 ? `참가비 ${m.fee.toLocaleString('ko-KR')}원은 오픈채팅에서 모임장에게 직접 보내요.` : '참가비는 없어요.',
        '모임장이 확인하면 참여가 확정돼요.',
      ].join('\n'),
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신청하기',
          onPress: async () => {
            setBusy(m.meetupId);
            try {
              await applyMeetup(m.meetupId);
              track('meetup_applied');
              await load();
            } catch (e) {
              Alert.alert('신청하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
            } finally {
              setBusy(null);
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
          setBusy(m.meetupId);
          try {
            await cancelMeetup(m.meetupId);
            await load();
          } catch (e) {
            Alert.alert('취소하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  function openKakao(link: string) {
    void Linking.openURL(link).catch(() => Alert.alert('링크를 열지 못했어요', link));
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {loading ? (
          <View style={[styles.flex, styles.center]}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + 24 }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>모임</Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                {meetups.length > 0 ? '가까운 날짜의 모임부터 보여드려요' : '오프라인에서 만나는 작은 모임'}
              </Text>
            </View>

            {meetups.length === 0 ? (
              <Animated.View entering={FadeInDown.duration(380)} style={[styles.emptyCard, { backgroundColor: c.backgroundElement }]}>
                <Image source={require('@/assets/images/brand-mark.png')} style={styles.emptyMark} contentFit="contain" />
                <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>준비 중인 모임이 없어요</Text>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                  새 모임이 열리면 여기에 도착해요.{'\n'}알림을 켜두시면 놓치지 않아요.
                </Text>
              </Animated.View>
            ) : (
              meetups.map((m, i) => (
                <Animated.View
                  key={m.meetupId}
                  entering={FadeInDown.duration(380).delay(i * 60)}
                  style={[styles.card, { backgroundColor: c.backgroundElement }]}
                >
                  <View style={styles.cardHead}>
                    <Text style={[styles.cardTitle, { color: c.text, fontFamily: Fonts.serif }]}>{m.title}</Text>
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: m.status === 'OPEN' ? c.primary + '22' : c.backgroundSelected },
                      ]}
                    >
                      <Text style={[styles.statusChipText, { color: m.status === 'OPEN' ? c.primaryStrong : c.textSecondary }]}>
                        {m.status === 'OPEN' ? '모집 중' : '모집 마감'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.cardMeta, { color: c.textSecondary }]}>
                    {dateFmt.format(new Date(m.meetAt))} · {m.place}
                  </Text>
                  <Text style={[styles.cardMeta, { color: c.textSecondary }]}>
                    확정 {m.confirmedCount}/{m.capacity}명 · {m.fee > 0 ? `참가비 ${m.fee.toLocaleString('ko-KR')}원` : '무료'}
                  </Text>
                  {/* 모임장 신뢰 신호 — 이름과 함께 개최 기록을 숫자로. */}
                  <Text style={[styles.hostLine, { color: c.textSecondary }]}>
                    모임장 {m.hostNickname ?? '(알 수 없음)'}
                    {m.hostDoneCount > 0 ? ` · 지금까지 ${m.hostDoneCount}회 개최` : ' · 첫 모임'}
                  </Text>

                  {m.description ? (
                    <Text style={[styles.cardDesc, { color: c.text }]}>{m.description}</Text>
                  ) : null}

                  {/* 내 상태에 따라 다음 할 일 하나만 보여준다. */}
                  {m.myStatus === 'CONFIRMED' ? (
                    <View style={styles.actionRow}>
                      <View style={[styles.confirmedChip, { backgroundColor: c.primary }]}>
                        <Ionicons name="checkmark" size={14} color={c.primaryText} />
                        <Text style={[styles.confirmedText, { color: c.primaryText }]}>참여 확정</Text>
                      </View>
                      {m.kakaoLink && (
                        <Pressable onPress={() => openKakao(m.kakaoLink!)} style={[styles.kakaoBtn, { borderColor: c.border }]}>
                          <Text style={[styles.kakaoBtnText, { color: c.text }]}>오픈채팅 열기</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : m.myStatus === 'APPLIED' ? (
                    <View>
                      <Text style={[styles.appliedNote, { color: c.primaryStrong }]}>
                        신청했어요 — 오픈채팅에서 인사를 남기면 모임장이 확정해 드려요.
                      </Text>
                      <View style={styles.actionRow}>
                        {m.kakaoLink && (
                          <Pressable
                            onPress={() => openKakao(m.kakaoLink!)}
                            style={[styles.applyBtn, { backgroundColor: c.text }]}
                          >
                            <Text style={[styles.applyBtnText, { color: c.background }]}>오픈채팅 열기</Text>
                          </Pressable>
                        )}
                        <Pressable onPress={() => confirmCancel(m)} hitSlop={8} disabled={busy != null}>
                          <Text style={[styles.cancelLink, { color: c.textSecondary }]}>신청 취소</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : m.myStatus === 'DECLINED' ? (
                    <Text style={[styles.appliedNote, { color: c.textSecondary }]}>
                      이번에는 함께하지 못했어요. 다음 모임에서 만나요.
                    </Text>
                  ) : m.status === 'OPEN' ? (
                    <Pressable
                      onPress={() => confirmApply(m)}
                      disabled={busy != null}
                      style={({ pressed }) => [
                        styles.applyBtn,
                        styles.applyBtnFull,
                        { backgroundColor: c.primary, opacity: pressed || busy === m.meetupId ? 0.7 : 1 },
                      ]}
                    >
                      <Text style={[styles.applyBtnText, { color: c.primaryText }]}>신청하기</Text>
                    </Pressable>
                  ) : null}
                </Animated.View>
              ))
            )}

            {/* 지난 모임 — 접힌 기록. 모임이 실제로 열리고 있다는 증거. */}
            {history.length > 0 && (
              <View style={styles.section}>
                <Pressable
                  onPress={() => setHistoryOpen((v) => !v)}
                  accessibilityRole="button"
                  hitSlop={6}
                  style={styles.sectionHead}
                >
                  <Text style={[styles.sectionEyebrow, { color: c.primaryStrong }]}>지난 모임</Text>
                  <View style={styles.sectionToggle}>
                    <Text style={[styles.sectionCount, { color: c.textSecondary }]}>{history.length}</Text>
                    <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={15} color={c.textSecondary} />
                  </View>
                </Pressable>
                {historyOpen && (
                  <View style={[styles.historyCard, { backgroundColor: c.backgroundElement }]}>
                    {history.map((h, i) => (
                      <View
                        key={`${h.title}-${h.meetAt}`}
                        style={[
                          styles.historyRow,
                          i < history.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
                        ]}
                      >
                        <View style={styles.flex}>
                          <Text style={[styles.historyTitle, { color: c.text }]}>{h.title}</Text>
                          <Text style={[styles.historyMeta, { color: c.textSecondary }]}>
                            {new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(h.meetAt))} · {h.place} ·{' '}
                            {h.hostNickname ?? ''}
                          </Text>
                        </View>
                        <Text style={[styles.historyCount, { color: c.primaryStrong }]}>{h.confirmedCount}명 참여</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  header: { paddingHorizontal: 4, paddingTop: 6, paddingBottom: 18 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 14.5, marginTop: 4 },

  card: { borderRadius: Radius.lg, padding: 18, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  statusChip: { height: 24, paddingHorizontal: 10, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  statusChipText: { fontSize: 12.5, fontWeight: '700' },
  cardMeta: { fontSize: 14, marginTop: 5 },
  hostLine: { fontSize: 13.5, marginTop: 8, fontWeight: '600' },
  cardDesc: { fontSize: 15.5, lineHeight: 23, marginTop: 12 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  applyBtn: { height: 44, paddingHorizontal: 22, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  applyBtnFull: { marginTop: 14, alignSelf: 'stretch' },
  applyBtnText: { fontSize: 15.5, fontWeight: '700' },
  cancelLink: { fontSize: 14, textDecorationLine: 'underline' },
  appliedNote: { fontSize: 14, lineHeight: 20, marginTop: 12, fontWeight: '600' },
  confirmedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 13, borderRadius: Radius.pill },
  confirmedText: { fontSize: 14, fontWeight: '700' },
  kakaoBtn: { height: 36, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kakaoBtnText: { fontSize: 14, fontWeight: '600' },

  section: { marginTop: 14, marginBottom: 26 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 },
  sectionEyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  sectionToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionCount: { fontSize: 13.5, fontWeight: '600' },
  historyCard: { borderRadius: Radius.lg, paddingHorizontal: 16 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  historyTitle: { fontSize: 15.5, fontWeight: '700' },
  historyMeta: { fontSize: 13, marginTop: 2 },
  historyCount: { fontSize: 13.5, fontWeight: '700' },

  emptyCard: { borderRadius: Radius.lg, alignItems: 'center', paddingVertical: 40, paddingHorizontal: 28 },
  emptyMark: { width: 54, height: 40, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 14.5, lineHeight: 22, textAlign: 'center', marginTop: 8 },
});
