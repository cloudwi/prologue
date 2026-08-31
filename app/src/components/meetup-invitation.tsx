import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { JobBadge } from '@/components/job-badge';
import { PhotoPager } from '@/components/photo-pager';
import { RichText } from '@/components/rich-text';
import { Radius, type ThemeColors } from '@/constants/theme';
import { conditionLabel, feeValue, type Meetup } from '@/lib/meetups';
import { WEEKDAYS, ddayLabel, mapQuery, numeralDate, timeRangeLabel, venueOf, weekdayLabel } from '@/lib/meetup-format';

/**
 * 모임 초대장 — 상세 화면과 모임 열기의 미리보기가 같은 것을 그린다.
 *
 * 요즘 모바일 청첩장의 문법(2026-08-25):
 * 전면 사진 → 영문 눈썹·제목·숫자 날짜 → 모시는 글·여는 사람 → 달력(그 날 표시)·D-day
 * → 오시는 길(지도 버튼) → 안내 카드(참가비·조건) → 함께하는 사람들 → RSVP 카드.
 * 세리프 없이도 청첩장으로 읽히게 하는 건 가운데 정렬·자간 넓은 영문 눈썹·달력·넉넉한 여백이다.
 *
 * 동작(신청·취소·오픈채팅·프로필 이동)은 전부 콜백으로 받는다 — 미리보기는 콜백을 주지 않으면 된다.
 */
type Props = {
  meetup: Meetup;
  c: ThemeColors;
  /** 모임 열기의 미리보기 — 아직 없는 모임이라 이동·신청이 없고, 여는 사람은 '나'로 표시한다. */
  preview?: boolean;
  busy?: boolean;
  onPressImage?: (index: number) => void;
  onPressHost?: () => void;
  /** 이름도 함께 넘긴다 — 상세가 다시 받아오기 전에 이름부터 세울 수 있다. */
  onPressParticipant?: (accountId: string, nickname: string | null) => void;
  onApply?: () => void;
  onCancel?: () => void;
  onOpenKakao?: (link: string) => void;
  /** 모임 따라가기 토글 — 다음 회차가 열리면 알림을 받는다. 미리보기에는 넘기지 않는다. */
  onToggleFollow?: (on: boolean) => void;
  /** 초대장 전하기 — 공유 시트를 연다. 미리보기에는 넘기지 않는다(아직 주소가 없는 모임이라). */
  onShare?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function MeetupInvitation({
  meetup,
  c,
  preview = false,
  busy = false,
  onPressImage,
  onPressHost,
  onPressParticipant,
  onApply,
  onCancel,
  onOpenKakao,
  onToggleFollow,
  onShare,
  contentContainerStyle,
}: Props) {
  const meetDate = new Date(meetup.meetAt);
  const venue = venueOf(meetup);
  const isPaid = meetup.fee > 0 || (meetup.feeFemale ?? 0) > 0;
  const remaining = Math.max(0, meetup.capacity - meetup.confirmedCount);

  return (
    <ScrollView contentContainerStyle={[styles.content, contentContainerStyle]} showsVerticalScrollIndicator={false}>
      {/* 1) 전면 사진 — 청첩장의 첫 장. 둥근 카드가 아니라 화면 폭 그대로. */}
      {meetup.coverUrls.length > 0 ? (
        <PhotoPager
          photos={meetup.coverUrls}
          aspectRatio={4 / 3}
          backgroundColor={c.backgroundSelected}
          onPressImage={onPressImage}
        />
      ) : meetup.emoji != null ? (
        <View style={[styles.coverBanner, { backgroundColor: meetup.color ?? c.backgroundSelected }]}>
          <Text style={styles.coverBannerEmoji}>{meetup.emoji}</Text>
        </View>
      ) : null}

      {/* 2) 표지 — 영문 눈썹, 제목, 숫자 날짜. 숫자는 가늘고 자간 넓게 — 청첩장의 서명 같은 줄. */}
      <View style={styles.headline}>
        <Text style={[styles.eyebrow, { color: c.textSecondary }]}>INVITATION</Text>
        {/* 회차 — 이어져 온 모임이면 "몇 번째 만남"이 초대장의 첫 신뢰 신호다. */}
        {(meetup.occurrenceTotal ?? 1) > 1 && (
          <Text style={[styles.occurrence, { color: c.primaryStrong }]}>{meetup.occurrence ?? 1}번째 만남</Text>
        )}
        <Text style={[styles.title, { color: c.text }]}>{meetup.title}</Text>
        <Text style={[styles.dateNumerals, { color: c.text }]}>{numeralDate(meetDate)}</Text>
        <Text style={[styles.dateWords, { color: c.textSecondary }]}>
          {weekdayLabel(meetDate)} {timeRangeLabel(meetDate, meetup.durationMinutes)}
          {venue.name ? ` · ${venue.name}` : ''}
        </Text>
      </View>

      {/* 3) 모시는 글 + 여는 사람 — 인사말 아래 이름이 오는 청첩장의 순서. */}
      <Section eyebrow="GREETING" title="모시는 글" c={c}>
        {/*
          표시가 살아 있는 원문이 오면 그걸로 그린다 — 사진이 글 사이에 놓인다.
          옛 서버(또는 표시가 없는 글)는 description만 오므로 그때는 지금까지처럼 글만 그린다.
        */}
        <RichText
          text={meetup.descriptionRich ?? meetup.description}
          images={meetup.bodyImageUrls ?? []}
          c={c}
        />
        <Pressable
          onPress={onPressHost}
          disabled={onPressHost == null}
          hitSlop={8}
          style={({ pressed }) => [styles.hostBlock, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.hostCaption, { color: c.textSecondary }]}>여는 사람</Text>
          <Text style={[styles.hostName, { color: c.text }]}>{meetup.hostNickname ?? '(알 수 없음)'}</Text>
          <Text style={[styles.hostMeta, { color: c.textSecondary }]}>
            {preview ? '모임장 · 나' : `${meetup.hostDoneCount > 0 ? `지금까지 ${meetup.hostDoneCount}회 개최` : '첫 모임이에요'} · 프로필 보기 ›`}
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
          <InfoRow label="참가비" value={feeValue(meetup)} c={c} />
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
                onPress={() => onPressParticipant?.(p.accountId, p.nickname)}
                disabled={onPressParticipant == null}
                style={({ pressed }) => [styles.participantChip, { backgroundColor: c.backgroundElement, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.participantName, { color: c.text }]}>{p.nickname ?? '(알 수 없음)'}</Text>
                {/* 인증 표시는 아이콘 하나로 — 이름이 늘어선 자리라 글자를 더하면 줄이 무너진다. 회사는 상세에서만. */}
                {p.jobVerified ? <JobBadge c={c} mark /> : null}
              </Pressable>
            ))}
          </View>
        </Section>
      )}

      {/*
        8) 후기 — 끝난 모임에만 붙는다.

        RSVP 앞에 둔다. 지난 모임의 초대장을 여는 사람에게 마지막에 남을 말은 "이랬어요"가
        아니라 "다음에 만나요"여야 한다. 승인된 후기만 서버가 내려보내므로 여기서는
        있는지만 본다.
      */}
      {meetup.recap || meetup.recapImageUrls?.length ? (
        <Section eyebrow="AFTER" title="그날의 기록" c={c}>
          <RichText text={meetup.recap} images={meetup.recapImageUrls ?? []} c={c} />
        </Section>
      ) : null}

      {/* 9) RSVP — 청첩장의 마지막 장. 내 상태에 따라 한 가지 할 일만. */}
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
              {meetup.kakaoLink && <BigButton label="오픈채팅 열기" onPress={() => onOpenKakao?.(meetup.kakaoLink!)} c={c} />}
            </>
          ) : meetup.myStatus === 'APPLIED' ? (
            <>
              <Text style={[styles.rsvpNote, { color: c.textSecondary }]}>
                참석 의사를 전했어요. 오픈채팅에서 인사를 남기면 모임장이 자리를 확정해 드려요.
              </Text>
              {meetup.kakaoLink && <BigButton label="오픈채팅 열기" onPress={() => onOpenKakao?.(meetup.kakaoLink!)} c={c} />}
              <Pressable onPress={onCancel} hitSlop={8} disabled={busy} style={styles.cancelWrap}>
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
              <BigButton label="참석할게요" onPress={() => onApply?.()} c={c} disabled={busy} primary />
            </>
          ) : (
            <Text style={[styles.rsvpNote, { color: c.textSecondary }]}>모집이 마감됐어요. 다음 모임을 기다려 주세요.</Text>
          )}
        </View>
      </Section>

      {/*
        * 초대장 끝의 두 몸짓 — 전하기와 따라가기.
        *
        * 전하기: 종이 청첩장이 그렇듯 초대장은 건네라고 있는 것이다. 모임장에게는 자리를 채우는
        *   유일한 손이고, 참석자에게는 친구를 데려오는 손이다 — 그래서 누구에게나 보인다.
        * 따라가기: 이 자리가 좋았다면 다음에도 부른다. 모임은 단발이지만 '이 모임'은 이어진다.
        *   seriesId가 없으면 회차를 모르는 구버전 서버다 — 누르면 404가 나므로 아예 그리지 않는다.
        */}
      {!preview && (
        <View style={styles.pillRow}>
          {onShare != null && (
            <Pill icon="share-outline" label="초대장 전하기" onPress={onShare} c={c} />
          )}
          {onToggleFollow != null && !meetup.isMine && meetup.seriesId != null && (
            <Pill
              icon={meetup.following ? 'notifications' : 'notifications-outline'}
              label={meetup.following ? '다음 회차 알림 받는 중' : '다음 회차 알림 받기'}
              onPress={() => onToggleFollow(!(meetup.following ?? false))}
              c={c}
              active={meetup.following ?? false}
            />
          )}
        </View>
      )}

      <Text style={[styles.closing, { color: c.textSecondary }]}>프롤로그에서 보내는 초대장이에요</Text>
    </ScrollView>
  );
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

/**
 * 테두리만 있는 알약 — 초대장 끝의 부차적인 동작들.
 * [active]면 테두리와 글자만 테라코타로 바뀐다(면은 그대로) — 포인트 컬러의 면은 RSVP 하나뿐이다.
 */
function Pill({
  icon,
  label,
  onPress,
  c,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  c: ThemeColors;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pill, { borderColor: active ? c.primary : c.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={15} color={active ? c.primaryStrong : c.textSecondary} />
      <Text style={[styles.pillText, { color: active ? c.primaryStrong : c.text }]}>{label}</Text>
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
  occurrence: { fontSize: 13, fontWeight: '700', marginTop: 10, letterSpacing: 0.3 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 36, marginTop: 14, letterSpacing: -0.3 },
  // 숫자 날짜 — 가늘고 넓게. 청첩장에서 제목 다음으로 큰 글자.
  dateNumerals: { fontSize: 22, fontWeight: '300', letterSpacing: 3, marginTop: 18, fontVariant: ['tabular-nums'] },
  dateWords: { fontSize: 14, marginTop: 8, letterSpacing: 0.3, textAlign: 'center' },

  // ── 절 ──
  section: { alignItems: 'center', paddingHorizontal: 24, marginTop: 56 },
  sectionEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 20 },

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
  participantChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 34, paddingHorizontal: 14, borderRadius: Radius.pill },
  participantName: { fontSize: 14, fontWeight: '600' },

  // ── RSVP ──
  rsvp: { width: '100%', alignItems: 'center', gap: 16 },
  rsvpNote: { fontSize: 14.5, lineHeight: 22, textAlign: 'center', paddingHorizontal: 8 },
  bigBtn: { alignSelf: 'stretch', height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  bigBtnText: { fontSize: 16, fontWeight: '700' },
  cancelWrap: { marginTop: -4 },
  cancelLink: { fontSize: 14, textDecorationLine: 'underline' },

  // 전하기·따라가기 — 테두리 알약. 둘 다 있으면 한 줄에 서고, 좁으면 아래로 접힌다.
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 24, marginTop: 40 },
  pill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 44, paddingHorizontal: 20, borderRadius: Radius.pill, borderWidth: 1,
  },
  pillText: { fontSize: 14.5, fontWeight: '700' },
  closing: { fontSize: 12, textAlign: 'center', marginTop: 48, letterSpacing: 0.5 },
});
