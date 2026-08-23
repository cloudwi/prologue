import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';

import { BottomTabInset, Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSessionExpired } from '@/lib/api';
import { getJobStatus } from '@/lib/job';
import { getMyProfile } from '@/lib/member';
import { feeLabel, getMeetupHistory, getMeetups, type Meetup, type MeetupHistory } from '@/lib/meetups';

/**
 * 모임 — 모임장이 여는 오프라인 모임에 손을 드는 곳.
 *
 * 앱은 신청까지만 한다. 참가비 입금과 대화는 모임장의 카카오 오픈채팅에서 이뤄지고
 * (링크는 신청해야 열린다), 모임장이 입금을 확인하면 "참여 확정" 표시가 돌아온다.
 * 지난 모임 기록(개최 횟수·참여 인원)을 함께 보여준다 — 잘 굴러가는 모임이라는
 * 증거는 우리가 말하는 것보다 기록이 말하는 게 낫다.
 */
type DateFilter = 'ALL' | 'TODAY' | 'WEEKEND' | 'WEEK';
type FeeFilter = 'ALL' | 'FREE' | 'PAID';

/** 신청 가능 판정에 쓰는 내 정보 — 서버가 최종 판정하지만, 목록에서 미리 걸러주는 게 친절이다. */
type MyEligibility = { gender: 'MALE' | 'FEMALE'; age: number; heightCm: number | null; jobVerified: boolean };

function ageFrom(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age -= 1;
  return age;
}

function inDateFilter(meetAt: string, filter: DateFilter): boolean {
  if (filter === 'ALL') return true;
  const d = new Date(meetAt);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const today = startOfDay(now);
  const dayAfter = (base: Date, n: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
  if (filter === 'TODAY') return d >= today && d < dayAfter(today, 1);
  if (filter === 'WEEK') return d >= today && d < dayAfter(today, 8);
  // WEEKEND: 다가오는 토·일(오늘이 주말이면 오늘부터 일요일까지)
  const dow = now.getDay(); // 0=일
  const satOffset = dow === 0 ? -1 : 6 - dow;
  const saturday = dayAfter(today, satOffset);
  const start = today > saturday ? today : saturday;
  return d >= start && d < dayAfter(saturday, 2);
}

/** 조건(성별·나이·키·직장인증)을 내 프로필로 미리 대조 — 모집 중이고 내가 연 게 아닌 것만. */
function isEligible(m: Meetup, my: MyEligibility): boolean {
  if (m.status !== 'OPEN' || m.isMine) return false;
  if (m.genderLimit != null && m.genderLimit !== my.gender) return false;
  const isMale = my.gender === 'MALE';
  const minAge = isMale ? m.minAgeMale : m.minAgeFemale;
  const maxAge = isMale ? m.maxAgeMale : m.maxAgeFemale;
  const minHeight = isMale ? m.minHeightMaleCm : m.minHeightFemaleCm;
  if (minAge != null && my.age < minAge) return false;
  if (maxAge != null && my.age > maxAge) return false;
  if (minHeight != null && (my.heightCm == null || my.heightCm < minHeight)) return false;
  if (m.requireJobVerified && !my.jobVerified) return false;
  return true;
}

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
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('ALL');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [my, setMy] = useState<MyEligibility | null>(null);

  const load = useCallback(async () => {
    try {
      const [ups, done, profile, job] = await Promise.all([
        getMeetups(),
        getMeetupHistory().catch(() => []),
        getMyProfile().catch(() => null),
        getJobStatus().catch(() => ({ verified: false, domain: null })),
      ]);
      setMeetups(ups);
      setHistory(done);
      if (profile) {
        setMy({
          gender: profile.gender,
          age: ageFrom(profile.birthDate),
          heightCm: profile.heightCm ?? null,
          jobVerified: job.verified,
        });
      }
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
    .filter((m) => inDateFilter(m.meetAt, dateFilter))
    .filter((m) => (feeFilter === 'FREE' ? m.fee === 0 && (m.feeFemale ?? 0) === 0 : feeFilter === 'PAID' ? m.fee > 0 || (m.feeFemale ?? 0) > 0 : true))
    .filter((m) => (eligibleOnly && my != null ? isEligible(m, my) : true))
    .filter((m) => q === '' || m.title.includes(q) || m.place.includes(q) || (m.description ?? '').includes(q));
  const activeFilterCount = (dateFilter !== 'ALL' ? 1 : 0) + (feeFilter !== 'ALL' ? 1 : 0) + (eligibleOnly ? 1 : 0);
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
                <View style={styles.searchRow}>
                <View style={[styles.searchBox, styles.flex, { backgroundColor: c.backgroundElement }]}>
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
                <Pressable
                  onPress={() => setFilterOpen(true)}
                  style={[styles.filterBtn, { backgroundColor: activeFilterCount > 0 ? c.text : c.backgroundElement }]}
                >
                  <Ionicons name="options-outline" size={17} color={activeFilterCount > 0 ? c.background : c.textSecondary} />
                  {activeFilterCount > 0 && (
                    <View style={[styles.filterBadge, { backgroundColor: c.primary }]}>
                      <Text style={[styles.filterBadgeText, { color: c.primaryText }]}>{activeFilterCount}</Text>
                    </View>
                  )}
                </Pressable>
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
                      styles.cardClip,
                      { backgroundColor: c.backgroundElement, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    {/* 메인 사진 — 첫 장이 카드의 얼굴. 자를 때 보여준 16:9 그대로다. */}
                    {m.coverUrls.length > 0 && (
                      <Image source={{ uri: m.coverUrls[0] }} style={styles.cardCover} contentFit="cover" transition={150} />
                    )}
                    <View style={styles.cardBody}>
                    <View style={styles.cardHead}>
                      <View style={styles.cardTitleWrap}>
                        {m.coverUrls.length === 0 && m.emoji != null ? (
                          <View style={[styles.coverTile, { backgroundColor: m.color ?? c.backgroundSelected }]}>
                            <Text style={styles.coverTileEmoji}>{m.emoji}</Text>
                          </View>
                        ) : null}
                        <Text style={[styles.cardTitle, { color: c.text, fontFamily: Fonts.serif }]} numberOfLines={1}>
                          {m.title}
                        </Text>
                      </View>
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

      {/* 필터 시트 — 기간·참가비·신청 가능만. */}
      <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.background }]}>
          <Text style={[styles.sheetTitle, { color: c.text }]}>필터</Text>

          <Text style={[styles.sheetLabel, { color: c.textSecondary }]}>기간</Text>
          <View style={[styles.segment, { backgroundColor: c.backgroundElement }]}>
            {([
              ['ALL', '전체'],
              ['TODAY', '오늘'],
              ['WEEKEND', '이번 주말'],
              ['WEEK', '7일 이내'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setDateFilter(value)}
                style={[styles.segmentItem, dateFilter === value && { backgroundColor: c.background }]}
              >
                <Text style={[styles.segmentText, { color: dateFilter === value ? c.text : c.textSecondary }, dateFilter === value && styles.segmentTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sheetLabel, { color: c.textSecondary }]}>참가비</Text>
          <View style={[styles.segment, { backgroundColor: c.backgroundElement }]}>
            {([
              ['ALL', '전체'],
              ['FREE', '무료'],
              ['PAID', '유료'],
            ] as const).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setFeeFilter(value)}
                style={[styles.segmentItem, feeFilter === value && { backgroundColor: c.background }]}
              >
                <Text style={[styles.segmentText, { color: feeFilter === value ? c.text : c.textSecondary }, feeFilter === value && styles.segmentTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={() => setEligibleOnly((v) => !v)} hitSlop={6} style={styles.checkRow}>
            <View style={[styles.checkbox, { borderColor: c.border }, eligibleOnly && { backgroundColor: c.primary, borderColor: c.primary }]}>
              {eligibleOnly && <Text style={[styles.checkboxMark, { color: c.primaryText }]}>✓</Text>}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.checkLabel, { color: c.text }]}>신청 가능한 모임만</Text>
              <Text style={[styles.checkHint, { color: c.textSecondary }]}>모집 중이고, 나이·성별·키·직장인증 조건에 맞는 모임만 보여요</Text>
            </View>
          </Pressable>

          <View style={styles.sheetFoot}>
            <Pressable
              onPress={() => {
                setDateFilter('ALL');
                setFeeFilter('ALL');
                setEligibleOnly(false);
              }}
              hitSlop={8}
            >
              <Text style={[styles.resetText, { color: c.textSecondary }]}>초기화</Text>
            </Pressable>
            <Pressable onPress={() => setFilterOpen(false)} style={[styles.applyBtn2, { backgroundColor: c.primary }]}>
              <Text style={[styles.applyBtnText, { color: c.primaryText }]}>
                {visible.length}개 보기
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  cardClip: { padding: 0, overflow: 'hidden' },
  cardCover: { width: '100%', aspectRatio: 16 / 9 },
  cardBody: { padding: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  cardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  coverTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  coverTileEmoji: { fontSize: 20 },
  statusChip: { height: 24, paddingHorizontal: 10, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  statusChipText: { fontSize: 12.5, fontWeight: '700' },
  cardMeta: { fontSize: 14, marginTop: 5 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 12 },
  filterArea: { marginBottom: 14, gap: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, borderRadius: Radius.pill, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filterChips: { flexDirection: 'row', gap: 8 },
  searchRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { width: 42, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  sheetLabel: { fontSize: 13.5, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4, minHeight: 44 },
  segmentItem: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 14 },
  segmentTextActive: { fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18 },
  checkbox: { width: 21, height: 21, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxMark: { fontSize: 13, fontWeight: '800' },
  checkLabel: { fontSize: 15, fontWeight: '600' },
  checkHint: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  resetText: { fontSize: 14.5, textDecorationLine: 'underline' },
  applyBtn2: { height: 46, paddingHorizontal: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
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
