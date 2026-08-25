import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ImageViewerModal } from '@/components/image-viewer';
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
 * 모임 상세 — 정보 화면이 아니라 초대장이다(유저 결정 2026-08-24).
 *
 * 2026-08-25: "현대적인 모바일 청첩장"의 문법으로 다시 조판했다.
 * 전면 사진 → 영문 눈썹·제목·숫자 날짜 → 모시는 글·여는 사람 → 달력(그 날 표시)·D-day
 * → 오시는 길(지도 버튼) → 안내 카드(참가비·조건) → 함께하는 사람들 → RSVP 카드.
 * 세리프 없이도 청첩장으로 읽히게 하는 건 가운데 정렬·자간 넓은 영문 눈썹·달력·넉넉한 여백이다.
 * 신청/취소/오픈채팅/관리/이미지 뷰어 동작은 그대로.
 */
export default function MeetupDetailScreen() {
  const c = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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

  /** 장소 이름과 주소를 가른다 — place는 "주소 · 상세" 꼴로 저장된다. */
  function venueOf(m: Meetup): { name: string | null; address: string | null } {
    if (!m.placeAddress) return { name: m.place, address: null };
    const detail = m.place.startsWith(m.placeAddress) ? m.place.slice(m.placeAddress.length).replace(/^ · /, '') : '';
    return { name: detail || null, address: m.placeAddress };
  }

  const isPaid = meetup != null && (meetup.fee > 0 || (meetup.feeFemale ?? 0) > 0);
  const venue = meetup ? venueOf(meetup) : { name: null, address: null };
  const meetDate = meetup ? new Date(meetup.meetAt) : null;
  const remaining = meetup ? Math.max(0, meetup.capacity - meetup.confirmedCount) : 0;

  return (
    <SubScreen
      title=""
      c={c}
      onSave={meetup?.isMine ? () => router.push('/my-meetups') : undefined}
      saveLabel="관리"
    >
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : meetup == null || meetDate == null ? (
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary, fontSize: 15 }}>모임을 찾을 수 없어요 — 마감됐거나 취소됐을 수 있어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* 1) 전면 사진 — 청첩장의 첫 장. 둥근 카드가 아니라 화면 폭 그대로. */}
          {meetup.coverUrls.length > 0 ? (
            <PhotoPager
              photos={meetup.coverUrls}
              aspectRatio={4 / 3}
              backgroundColor={c.backgroundSelected}
              onPressImage={setViewerIndex}
            />
          ) : meetup.emoji != null ? (
            <View style={[styles.coverBanner, { backgroundColor: meetup.color ?? c.backgroundSelected }]}>
              <Text style={styles.coverBannerEmoji}>{meetup.emoji}</Text>
            </View>
          ) : null}

          {/* 2) 표지 — 영문 눈썹, 제목, 숫자 날짜. 숫자는 가늘고 자간 넓게 — 청첩장의 서명 같은 줄. */}
          <View style={styles.headline}>
            <Text style={[styles.eyebrow, { color: c.textSecondary }]}>INVITATION</Text>
            <Text style={[styles.title, { color: c.text }]}>{meetup.title}</Text>
            <Text style={[styles.dateNumerals, { color: c.text }]}>{numeralDate(meetDate)}</Text>
            <Text style={[styles.dateWords, { color: c.textSecondary }]}>
              {weekdayLabel(meetDate)} {timeLabel(meetDate)}
              {venue.name ? ` · ${venue.name}` : ''}
            </Text>
          </View>

          {/* 3) 모시는 글 + 여는 사람 — 인사말 아래 이름이 오는 청첩장의 순서. */}
          <Section eyebrow="GREETING" title="모시는 글" c={c}>
            {meetup.description ? (
              <Text style={[styles.greeting, { color: c.text }]}>{meetup.description}</Text>
            ) : null}
            <Pressable
              onPress={() => router.push(`/meetup-member/${meetup.hostAccountId}?role=host`)}
              hitSlop={8}
              style={({ pressed }) => [styles.hostBlock, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.hostCaption, { color: c.textSecondary }]}>여는 사람</Text>
              <Text style={[styles.hostName, { color: c.text }]}>{meetup.hostNickname ?? '(알 수 없음)'}</Text>
              <Text style={[styles.hostMeta, { color: c.textSecondary }]}>
                {meetup.hostDoneCount > 0 ? `지금까지 ${meetup.hostDoneCount}회 개최` : '첫 모임이에요'} · 프로필 보기 ›
              </Text>
            </Pressable>
          </Section>

          {/* 4) 달력 — 그 달을 펼쳐 그 날에 동그라미. 모바일 청첩장에서 가장 먼저 알아보는 장면. */}
          <Section eyebrow="CALENDAR" title={`${meetDate.getFullYear()}년 ${meetDate.getMonth() + 1}월`} c={c}>
            <MonthCalendar date={meetDate} c={c} />
            <Text style={[styles.dday, { color: c.text }]}>{ddayLabel(meetDate)}</Text>
          </Section>

          {/* 5) 오시는 길 — 이름·주소, 그리고 지도 버튼 둘. */}
          <Section eyebrow="LOCATION" title="오시는 길" c={c}>
            {venue.name ? <Text style={[styles.venueName, { color: c.text }]}>{venue.name}</Text> : null}
            {venue.address ? <Text style={[styles.venueAddress, { color: c.textSecondary }]}>{venue.address}</Text> : null}
            {meetup.placeAddress != null ? (
              <View style={styles.mapRow}>
                <MapButton
                  label="네이버 지도"
                  c={c}
                  onPress={() => void Linking.openURL(`https://map.naver.com/p/search/${encodeURIComponent(mapQuery(meetup.placeAddress!))}`)}
                />
                <MapButton
                  label="카카오맵"
                  c={c}
                  onPress={() => void Linking.openURL(`https://map.kakao.com/link/search/${encodeURIComponent(mapQuery(meetup.placeAddress!))}`)}
                />
              </View>
            ) : meetup.placeUrl != null ? (
              <View style={styles.mapRow}>
                <MapButton label="지도 보기" c={c} onPress={() => void Linking.openURL(meetup.placeUrl!)} />
              </View>
            ) : null}
          </Section>

          {/* 6) 안내 — 참가비·조건을 카드 한 장에. 청첩장의 '마음 전하실 곳' 자리. */}
          <Section eyebrow="INFORMATION" title="안내" c={c}>
            <View style={[styles.infoCard, { backgroundColor: c.backgroundElement }]}>
              <InfoRow label="참가비" value={feeLabel(meetup)} c={c} />
              {conditionLabel(meetup) ? <InfoRow label="참석 조건" value={conditionLabel(meetup)!} c={c} /> : null}
              <InfoRow label="정원" value={`${meetup.capacity}명 · 확정 ${meetup.confirmedCount}명`} c={c} last />
              {isPaid && (
                // 결제 로드맵 사전 고지 — 지금은 이체, 향후 앱 결제 전환(2026-08-24 결정).
                <Text style={[styles.infoHint, { color: c.textSecondary }]}>
                  참가비는 오픈채팅에서 모임장에게 직접 보내요. 앱에서 결제하는 방식을 준비하고 있어요.
                </Text>
              )}
            </View>
          </Section>

          {/* 7) 함께하는 사람들 — 확정된 이름들. */}
          {meetup.participants.length > 0 && (
            <Section eyebrow="GUESTS" title="함께하는 사람들" c={c}>
              <View style={styles.participantWrap}>
                {meetup.participants.map((p) => (
                  <Pressable
                    key={p.accountId}
                    onPress={() => router.push(`/meetup-member/${p.accountId}`)}
                    style={({ pressed }) => [styles.participantChip, { backgroundColor: c.backgroundElement, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.participantName, { color: c.text }]}>{p.nickname ?? '(알 수 없음)'}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          )}

          {/* 8) RSVP — 청첩장의 마지막 장. 내 상태에 따라 한 가지 할 일만. */}
          <Section eyebrow="RSVP" title={rsvpTitle(meetup)} c={c}>
            <View style={styles.rsvp}>
              {meetup.isMine ? (
                <Text style={[styles.rsvpNote, { color: c.textSecondary }]}>
                  {"내가 여는 모임이에요. 신청자 확인과 수정은 오른쪽 위 '관리'에서 해요."}
                </Text>
              ) : meetup.myStatus === 'CONFIRMED' ? (
                <>
                  <Text style={[styles.rsvpNote, { color: c.textSecondary }]}>
                    자리가 확정됐어요. 당일 안내는 오픈채팅에서 이어져요.
                  </Text>
                  {meetup.kakaoLink && <BigButton label="오픈채팅 열기" onPress={() => openKakao(meetup.kakaoLink!)} c={c} />}
                </>
              ) : meetup.myStatus === 'APPLIED' ? (
                <>
                  <Text style={[styles.rsvpNote, { color: c.textSecondary }]}>
                    참석 의사를 전했어요. 오픈채팅에서 인사를 남기면 모임장이 자리를 확정해 드려요.
                  </Text>
                  {meetup.kakaoLink && <BigButton label="오픈채팅 열기" onPress={() => openKakao(meetup.kakaoLink!)} c={c} />}
                  <Pressable onPress={() => confirmCancel(meetup)} hitSlop={8} disabled={busy} style={styles.cancelWrap}>
                    <Text style={[styles.cancelLink, { color: c.textSecondary }]}>신청 취소</Text>
                  </Pressable>
                </>
              ) : meetup.myStatus === 'DECLINED' ? (
                <Text style={[styles.rsvpNote, { color: c.textSecondary }]}>이번에는 함께하지 못했어요. 다음 모임에서 만나요.</Text>
              ) : meetup.status === 'OPEN' ? (
                <>
                  <Text style={[styles.rsvpNote, { color: c.textSecondary }]}>
                    {remaining > 0 ? `자리가 ${remaining}개 남았어요. ` : ''}
                    신청하면 모임장의 오픈채팅이 열리고, 모임장이 확인하면 자리가 확정돼요.
                  </Text>
                  <BigButton label="참석할게요" onPress={() => confirmApply(meetup)} c={c} disabled={busy} primary />
                </>
              ) : (
                <Text style={[styles.rsvpNote, { color: c.textSecondary }]}>모집이 마감됐어요. 다음 모임을 기다려 주세요.</Text>
              )}
            </View>
          </Section>

          <Text style={[styles.closing, { color: c.textSecondary }]}>프롤로그에서 보내는 초대장이에요</Text>
        </ScrollView>
      )}

      {meetup != null && meetup.coverUrls.length > 0 && (
        <ImageViewerModal
          photos={meetup.coverUrls}
          initialIndex={viewerIndex ?? 0}
          visible={viewerIndex != null}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </SubScreen>
  );
}

/** 지도 검색어 — 주소 끝의 "(양재동)" 같은 동 표기는 지도 검색을 흐리므로 떼고 보낸다. */
function mapQuery(address: string): string {
  return address.replace(/\s*\([^)]*\)\s*$/, '');
}

/** "2026. 09. 26" — 청첩장의 날짜는 글보다 숫자가 먼저다. 두 자리로 맞춰 자간이 고르게. */
function numeralDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}. ${mm}. ${dd}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function weekdayLabel(d: Date): string {
  return `${WEEKDAYS[d.getDay()]}요일`;
}

function timeLabel(d: Date): string {
  return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(d);
}

/** 오늘 자정 기준 며칠 남았는지 — 청첩장의 "결혼식이 N일 남았습니다" 줄. */
function ddayLabel(d: Date): string {
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((b - a) / 86_400_000);
  if (diff === 0) return '오늘 열리는 모임이에요';
  if (diff > 0) return `모임까지 ${diff}일 남았어요`;
  return `${-diff}일 전에 열린 모임이에요`;
}

function rsvpTitle(m: Meetup): string {
  if (m.isMine) return '내가 여는 모임';
  if (m.myStatus === 'CONFIRMED') return '참석이 확정됐어요';
  if (m.myStatus === 'APPLIED') return '확정을 기다리는 중';
  if (m.myStatus === 'DECLINED') return '다음에 만나요';
  return m.status === 'OPEN' ? '함께하시겠어요?' : '모집이 끝났어요';
}

/**
 * 절 — 자간 넓은 영문 눈썹 + 한글 제목 + 내용. 전부 가운데.
 * 절 사이는 선이 아니라 여백(56)으로 가른다 — 여백이 넉넉해야 종이처럼 읽힌다.
 */
function Section({ eyebrow, title, c, children }: { eyebrow: string; title: string; c: ThemeColors; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionEyebrow, { color: c.textSecondary }]}>{eyebrow}</Text>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * 그 달의 달력. 그 날만 잉크색 동그라미 — 포인트 컬러는 아래 RSVP 버튼 한 곳에 남겨둔다.
 * 일요일은 색 대신 흐린 글자로 구분한다.
 */
function MonthCalendar({ date, c }: { date: Date; c: ThemeColors }) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={styles.calendar}>
      <View style={styles.calRow}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={styles.calCell}>
            <Text style={[styles.calHead, { color: c.textSecondary }]}>{w}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.calRow}>
          {row.map((d, i) => (
            <View key={i} style={styles.calCell}>
              {d == null ? null : d === date.getDate() ? (
                <View style={[styles.calMark, { backgroundColor: c.text }]}>
                  <Text style={[styles.calDay, { color: c.background, fontWeight: '700' }]}>{d}</Text>
                </View>
              ) : (
                <Text style={[styles.calDay, { color: i === 0 ? c.textSecondary : c.text }]}>{d}</Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function InfoRow({ label, value, c, last }: { label: string; value: string; c: ThemeColors; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      <Text style={[styles.infoLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

/** 지도 버튼 — 테두리만 있는 알약. 포인트 컬러는 쓰지 않는다. */
function MapButton({ label, onPress, c }: { label: string; onPress: () => void; c: ThemeColors }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.mapBtn, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name="location-outline" size={14} color={c.textSecondary} />
      <Text style={[styles.mapBtnText, { color: c.text }]}>{label}</Text>
    </Pressable>
  );
}

function BigButton({ label, onPress, c, disabled, primary }: { label: string; onPress: () => void; c: ThemeColors; disabled?: boolean; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.bigBtn, { backgroundColor: primary ? c.primary : c.text, opacity: pressed || disabled ? 0.7 : 1 }]}
    >
      <Text style={[styles.bigBtnText, { color: primary ? c.primaryText : c.background }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  // 좌우 여백은 절마다 준다 — 첫 장(사진)은 화면 폭 그대로 깔린다.
  content: { paddingBottom: 48 },

  coverBanner: { height: 200, alignItems: 'center', justifyContent: 'center' },
  coverBannerEmoji: { fontSize: 64 },

  // ── 표지 ──
  headline: { alignItems: 'center', paddingTop: 36, paddingHorizontal: 32 },
  eyebrow: { fontSize: 11.5, fontWeight: '600', letterSpacing: 4 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 36, marginTop: 14, letterSpacing: -0.3 },
  // 숫자 날짜 — 가늘고 넓게. 청첩장에서 제목 다음으로 큰 글자.
  dateNumerals: { fontSize: 22, fontWeight: '300', letterSpacing: 3, marginTop: 18, fontVariant: ['tabular-nums'] },
  dateWords: { fontSize: 14, marginTop: 8, letterSpacing: 0.3, textAlign: 'center' },

  // ── 절 ──
  section: { alignItems: 'center', paddingHorizontal: 24, marginTop: 56 },
  sectionEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 20 },

  greeting: { fontSize: 16, lineHeight: 29, textAlign: 'center', paddingHorizontal: 8 },
  hostBlock: { alignItems: 'center', marginTop: 28 },
  hostCaption: { fontSize: 12.5, letterSpacing: 2, marginBottom: 8 },
  hostName: { fontSize: 19, fontWeight: '700' },
  hostMeta: { fontSize: 13, marginTop: 5 },

  // ── 달력 ──
  calendar: { width: '100%', maxWidth: 320, gap: 4 },
  calRow: { flexDirection: 'row' },
  calCell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  calHead: { fontSize: 12, fontWeight: '600' },
  calDay: { fontSize: 15 },
  calMark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dday: { fontSize: 15, fontWeight: '600', marginTop: 22 },

  // ── 오시는 길 ──
  venueName: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  venueAddress: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 21 },
  mapRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: Radius.pill, borderWidth: 1 },
  mapBtnText: { fontSize: 14, fontWeight: '600' },

  // ── 안내 카드 ──
  infoCard: { width: '100%', borderRadius: Radius.lg, paddingHorizontal: 20, paddingVertical: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 14 },
  infoLabel: { fontSize: 14, flexShrink: 0 },
  infoValue: { fontSize: 15, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  infoHint: { fontSize: 12.5, lineHeight: 18, paddingBottom: 14, paddingTop: 2 },

  // ── 함께하는 사람들 ──
  participantWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  participantChip: { height: 34, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  participantName: { fontSize: 14, fontWeight: '600' },

  // ── RSVP ──
  rsvp: { width: '100%', alignItems: 'center', gap: 16 },
  rsvpNote: { fontSize: 14.5, lineHeight: 22, textAlign: 'center', paddingHorizontal: 8 },
  bigBtn: { alignSelf: 'stretch', height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  bigBtnText: { fontSize: 16, fontWeight: '700' },
  cancelWrap: { marginTop: -4 },
  cancelLink: { fontSize: 14, textDecorationLine: 'underline' },

  closing: { fontSize: 12, textAlign: 'center', marginTop: 48, letterSpacing: 0.5 },
});
