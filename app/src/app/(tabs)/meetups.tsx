import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { BottomTabInset, Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSessionExpired } from '@/lib/api';
import { feeLabel, getMeetupHistory, getMeetups, type Meetup, type MeetupHistory } from '@/lib/meetups';

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
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'APPLIED' | 'MINE'>('ALL');

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

  // 검색·필터 — 목록이 작아 서버 없이 화면에서 거른다.
  const q = query.trim();
  const visible = meetups
    .filter((m) => (filter === 'APPLIED' ? m.myStatus != null : filter === 'MINE' ? m.isMine : true))
    .filter((m) => q === '' || m.title.includes(q) || m.place.includes(q) || (m.description ?? '').includes(q));
  const appliedCount = meetups.filter((m) => m.myStatus != null).length;
  const mineCount = meetups.filter((m) => m.isMine).length;

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
              <View style={styles.headerRow}>
                <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>모임</Text>
                <Pressable
                  onPress={() => router.push('/meetup-create')}
                  style={({ pressed }) => [styles.hostBtn, { backgroundColor: c.text, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="add" size={16} color={c.background} />
                  <Text style={[styles.hostBtnText, { color: c.background }]}>모임 열기</Text>
                </Pressable>
              </View>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                {meetups.length > 0 ? '가까운 날짜의 모임부터 보여드려요' : '오프라인에서 만나는 작은 모임'}
              </Text>
              {meetups.some((m) => m.isMine) && (
                <Pressable onPress={() => router.push('/my-meetups')} hitSlop={6} style={styles.manageLink}>
                  <Text style={[styles.manageLinkText, { color: c.primaryStrong }]}>내가 여는 모임 관리</Text>
                  <Ionicons name="chevron-forward" size={14} color={c.primaryStrong} />
                </Pressable>
              )}
            </View>

            {/* 검색과 필터 — 모임이 늘면 '내 것'부터 찾게 된다. */}
            {meetups.length > 0 && (
              <View style={styles.filterArea}>
                <View style={[styles.searchBox, { backgroundColor: c.backgroundElement }]}>
                  <Ionicons name="search" size={16} color={c.textSecondary} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="모임 이름·장소 검색"
                    placeholderTextColor={c.textSecondary}
                    returnKeyType="search"
                    style={[styles.searchInput, { color: c.text }]}
                  />
                  {query.length > 0 && (
                    <Pressable onPress={() => setQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={c.textSecondary} />
                    </Pressable>
                  )}
                </View>
                <View style={styles.filterChips}>
                  {([
                    ['ALL', '전체', meetups.length],
                    ['APPLIED', '신청한 모임', appliedCount],
                    ['MINE', '내 모임', mineCount],
                  ] as const).map(([value, label, count]) =>
                    value !== 'ALL' && count === 0 ? null : (
                      <Pressable
                        key={value}
                        onPress={() => setFilter(value)}
                        style={[
                          styles.filterChip,
                          filter === value
                            ? { backgroundColor: c.text }
                            : { backgroundColor: c.backgroundElement },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            { color: filter === value ? c.background : c.textSecondary },
                          ]}
                        >
                          {label} {count}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            )}

            {meetups.length === 0 ? (
              <Animated.View entering={FadeInDown.duration(380)} style={[styles.emptyCard, { backgroundColor: c.backgroundElement }]}>
                <Image source={require('@/assets/images/brand-mark.png')} style={styles.emptyMark} contentFit="contain" />
                <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>준비 중인 모임이 없어요</Text>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                  새 모임이 열리면 여기에 도착해요.{'\n'}먼저 열어보는 건 어때요?
                </Text>
                <Pressable
                  onPress={() => router.push('/meetup-create')}
                  style={({ pressed }) => [styles.emptyHostBtn, { backgroundColor: c.primary, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.applyBtnText, { color: c.primaryText }]}>첫 모임 열기</Text>
                </Pressable>
              </Animated.View>
            ) : visible.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: c.backgroundElement }]}>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                  {q !== '' ? `'${q}'에 맞는 모임이 없어요.` : '조건에 맞는 모임이 없어요.'}
                </Text>
              </View>
            ) : (
              visible.map((m, i) => (
                <Animated.View key={m.meetupId} entering={FadeInDown.duration(380).delay(i * 60)}>
                  {/* 카드는 훑는 곳 — 핵심만 남기고, 결정은 상세에서. */}
                  <Pressable
                    onPress={() => router.push(`/meetup/${m.meetupId}`)}
                    style={({ pressed }) => [
                      styles.card,
                      { backgroundColor: c.backgroundElement, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <View style={styles.cardHead}>
                      <Text style={[styles.cardTitle, { color: c.text, fontFamily: Fonts.serif }]} numberOfLines={1}>
                        {m.title}
                      </Text>
                      {m.isMine ? (
                        <View style={[styles.statusChip, { backgroundColor: c.backgroundSelected }]}>
                          <Text style={[styles.statusChipText, { color: c.textSecondary }]}>내 모임</Text>
                        </View>
                      ) : m.myStatus === 'CONFIRMED' ? (
                        <View style={[styles.statusChip, { backgroundColor: c.primary }]}>
                          <Text style={[styles.statusChipText, { color: c.primaryText }]}>참여 확정</Text>
                        </View>
                      ) : m.myStatus === 'APPLIED' ? (
                        <View style={[styles.statusChip, { backgroundColor: c.primary + '22' }]}>
                          <Text style={[styles.statusChipText, { color: c.primaryStrong }]}>신청함</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.statusChip,
                            { backgroundColor: m.status === 'OPEN' ? c.primary + '22' : c.backgroundSelected },
                          ]}
                        >
                          <Text
                            style={[styles.statusChipText, { color: m.status === 'OPEN' ? c.primaryStrong : c.textSecondary }]}
                          >
                            {m.status === 'OPEN' ? '모집 중' : '모집 마감'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.cardMeta, { color: c.textSecondary }]}>
                      {dateFmt.format(new Date(m.meetAt))} · {m.place}
                    </Text>
                    <Text style={[styles.cardMeta, { color: c.textSecondary }]}>
                      {feeLabel(m)} · 확정 {m.confirmedCount}/{m.capacity}명
                    </Text>

                    <View style={styles.cardFoot}>
                      <Text style={[styles.cardFootText, { color: c.primaryStrong }]}>자세히 보기</Text>
                      <Ionicons name="chevron-forward" size={14} color={c.primaryStrong} />
                    </View>
                  </Pressable>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 14.5, marginTop: 4 },
  hostBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingLeft: 12, paddingRight: 15, borderRadius: Radius.pill },
  hostBtnText: { fontSize: 14, fontWeight: '700' },
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 10, alignSelf: 'flex-start' },
  manageLinkText: { fontSize: 14, fontWeight: '700' },

  card: { borderRadius: Radius.lg, padding: 18, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  statusChip: { height: 24, paddingHorizontal: 10, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  statusChipText: { fontSize: 12.5, fontWeight: '700' },
  cardMeta: { fontSize: 14, marginTop: 5 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 12 },
  filterArea: { marginBottom: 14, gap: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, borderRadius: Radius.pill, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filterChips: { flexDirection: 'row', gap: 8 },
  filterChip: { height: 32, paddingHorizontal: 13, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  filterChipText: { fontSize: 13.5, fontWeight: '700' },
  cardFootText: { fontSize: 13.5, fontWeight: '700' },

  applyBtnText: { fontSize: 15.5, fontWeight: '700' },

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
  emptyHostBtn: { height: 44, paddingHorizontal: 26, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
});
