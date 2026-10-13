import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { JobBadge } from '@/components/job-badge';
import { PhotoPager } from '@/components/photo-pager';
import { RichText } from '@/components/rich-text';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { conditionLabel, feeValue, type Meetup } from '@/lib/meetups';
import { WEEKDAYS, ddayLabel, mapQuery, numeralDate, timeRangeLabel, venueOf, weekdayLabel } from '@/lib/meetup-format';

/**
 * 모임 초대장 — 상세 화면과 모임 열기의 미리보기가 같은 것을 그린다.
 *
 * 사진과 초대장의 분위기는 남기되, 일정·장소·비용은 글보다 먼저 읽히게 모은다.
 * 소개와 사진은 숨기지 않는다. 긴 글은 왼쪽 정렬과 제한된 읽기 폭으로 정돈한다.
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
  const insets = useSafeAreaInsets();

  const [calendarOpen, setCalendarOpen] = useState(false);
  const description = meetup.descriptionRich ?? meetup.description;
  const remaining = Math.max(0, meetup.capacity - meetup.confirmedCount);
  const recruitment = preview ? '신청을 받을 예정이에요'
    : meetup.status === 'OPEN' ? (remaining > 0 ? `${remaining}자리 남았어요` : '정원이 찼어요')
    : '모집이 끝났어요';

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1) 전면 사진 — 청첩장의 첫 장. 둥근 카드가 아니라 화면 폭 그대로. */}
        {meetup.coverUrls.length > 0 ? (
          <PhotoPager
            photos={meetup.coverUrls}
            aspectRatio={16 / 10}
            backgroundColor={c.backgroundSelected}
            onPressImage={onPressImage}
          />
        ) : meetup.emoji != null ? (
          <View style={[styles.coverBanner, { backgroundColor: meetup.color ?? c.backgroundSelected }]}>
            <Text style={styles.coverBannerEmoji}>{meetup.emoji}</Text>
          </View>
        ) : null}

        {/* 제목 다음에 바로 핵심 정보. 작은 영어 제목과 가는 숫자로 중요도를 흐리지 않는다. */}
        <View style={styles.headline}>
          <View style={styles.headlineMeta}>
            <Text style={[styles.eyebrow, { color: c.textSecondary }]}>
              {(meetup.occurrenceTotal ?? 1) > 1 ? `${meetup.occurrence ?? 1}번째 만남` : '프롤로그 모임'}
            </Text>
            <Text style={[styles.dateBadge, { color: c.text, backgroundColor: c.backgroundSelected }]}>{ddayLabel(meetDate)}</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>{meetup.title}</Text>
          <View style={[styles.summaryCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
            <InfoRow label="일시" value={`${numeralDate(meetDate)} (${weekdayLabel(meetDate)})\n${timeRangeLabel(meetDate, meetup.durationMinutes)}`} c={c} />
            <InfoRow label="장소" value={venue.name || venue.address || meetup.place} c={c} />
            <InfoRow label="참가비" value={feeValue(meetup)} c={c} />
            <InfoRow label="인원" value={`정원 ${meetup.capacity}명 · 확정 ${meetup.confirmedCount}명`} c={c} last />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={calendarOpen ? '달력 접기' : '달력 보기'}
              accessibilityState={{ expanded: calendarOpen }}
              onPress={() => setCalendarOpen(!calendarOpen)}
              style={[styles.calendarToggle, { borderTopColor: c.border }]}
            >
              <Text style={[styles.calendarToggleText, { color: c.textSecondary }]}>{calendarOpen ? '달력 접기' : '달력으로 보기'}</Text>
              <Ionicons name={calendarOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.textSecondary} />
            </Pressable>
            {calendarOpen && <MonthCalendar date={meetDate} c={c} />}
          </View>
        </View>

        {/* 3) 모시는 글 + 여는 사람 — 인사말 아래 이름이 오는 청첩장의 순서. */}
        <Section title="모임 소개" c={c}>
          {/*
            표시가 살아 있는 원문이 오면 그걸로 그린다 — 사진이 글 사이에 놓인다.
            옛 서버(또는 표시가 없는 글)는 description만 오므로 그때는 지금까지처럼 글만 그린다.
          */}
          <RichText
            text={description}
            images={meetup.bodyImageUrls ?? []}
            c={c}
          />
          <Pressable
            accessibilityRole={onPressHost ? 'button' : undefined}
            accessibilityLabel={onPressHost ? '여는 사람 프로필 보기' : undefined}
            onPress={onPressHost}
            disabled={onPressHost == null}
            hitSlop={8}
            style={({ pressed }) => [styles.hostBlock, { backgroundColor: c.backgroundSelected, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.hostCaption, { color: c.textSecondary }]}>여는 사람</Text>
            <Text style={[styles.hostName, { color: c.text }]}>{meetup.hostNickname ?? '(알 수 없음)'}</Text>
            <Text style={[styles.hostMeta, { color: c.textSecondary }]}>
              {preview ? '내가 여는 모임' : `${meetup.hostDoneCount > 0 ? `지금까지 ${meetup.hostDoneCount}회 개최` : '첫 모임이에요'}${onPressHost ? ' · 프로필 보기 ›' : ''}`}
            </Text>
          </Pressable>
        </Section>

        {/* 5) 오시는 길 — 이름·주소, 그리고 지도 버튼 둘. */}
        <Section title="오시는 길" c={c}>
          {venue.name ? <Text style={[styles.venueName, { color: c.text }]}>{venue.name}</Text> : null}
          {venue.address ? <Text style={[styles.venueAddress, { color: c.text }]}>{venue.address}</Text> : null}
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
        <Section title="참가 안내" c={c}>
          <View style={[styles.infoCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
            <InfoRow label="모집" value={recruitment} c={c} last={!conditionLabel(meetup)} />
            {conditionLabel(meetup) ? <InfoRow label="참석 조건" value={conditionLabel(meetup)!} c={c} last /> : null}
            {isPaid && (
              // 결제 로드맵 사전 고지 — 지금은 이체, 향후 앱 결제 전환(2026-08-24 결정).
              <Text style={[styles.infoHint, { color: c.textSecondary }]}>
                {(meetup.myStatus === 'APPLIED' || meetup.myStatus === 'CONFIRMED') && !meetup.kakaoLink
                  ? '여는 사람이 연락 방법을 준비 중이에요. 연락 링크가 생기면 납부 방법을 확인해주세요. 참가비를 먼저 보내지 마세요.'
                  : '신청 후 연락 링크에서 납부 방법을 확인한 뒤 여는 사람에게 직접 보내주세요.'}
              </Text>
            )}
          </View>
        </Section>

        {/* 7) 함께하는 사람들 — 확정된 이름들. */}
        {meetup.participants.length > 0 && (
          <Section title="함께하는 사람들" c={c}>
            <View style={styles.participantWrap}>
              {/* 이름을 다 늘어놓으면 그 자체가 한 화면이 된다 — 여덟 명까지만, 나머지는 숫자로. */}
              {meetup.participants.slice(0, 8).map((p) => (
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
              {meetup.participants.length > 8 && (
                <View style={[styles.participantChip, { backgroundColor: c.backgroundElement }]}>
                  <Text style={[styles.participantName, { color: c.textSecondary }]}>외 {meetup.participants.length - 8}명</Text>
                </View>
              )}
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
          <Section title="그날의 기록" c={c}>
            <RichText text={meetup.recap} images={meetup.recapImageUrls ?? []} c={c} />
          </Section>
        ) : null}

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
      {!preview && (
        <RsvpBar
          meetup={meetup}
          c={c}
          busy={busy}
          insetBottom={insets.bottom}
          onApply={onApply}
          onCancel={onCancel}
          onOpenKakao={onOpenKakao}
        />
      )}
    </View>
  );
}

/**
 * 하단 고정 RSVP 바 — 초대장이 길어도 결정은 늘 손 닿는 곳에 둔다.
 *
 * 예전에는 스크롤 맨 아래 절 하나가 이 일을 했다. 그러면 끝까지 읽어야만 신청할 수 있어서
 * "글이 길다"는 말이 곧 "신청이 멀다"는 뜻이 된다. 요즘 행사 페이지가 값과 남은 자리를
 * 왼쪽에, 버튼을 오른쪽에 붙여두는 이유가 이것이다.
 *
 * 절 하나가 통째로 사라지므로 초대장도 그만큼 짧아진다.
 */
function RsvpBar({
  meetup,
  c,
  busy,
  insetBottom,
  onApply,
  onCancel,
  onOpenKakao,
}: {
  meetup: Meetup;
  c: ThemeColors;
  busy?: boolean;
  insetBottom: number;
  onApply?: () => void;
  onCancel?: () => void;
  onOpenKakao?: (link: string) => void;
}) {
  const remaining = Math.max(0, meetup.capacity - meetup.confirmedCount);
  const kakao = meetup.kakaoLink;

  let title: string;
  let sub: string | null = null;
  let onSub: (() => void) | null = null;
  let action: { label: string; onPress: () => void; primary: boolean } | null = null;

  if (meetup.isMine) {
    title = '내가 여는 모임';
    sub = `확정 ${meetup.confirmedCount}/${meetup.capacity}명`;
  } else if (meetup.myStatus === 'CONFIRMED') {
    title = '참석 확정';
    sub = kakao ? '당일 안내는 연락 링크에서' : '연락 방법은 여는 사람이 준비 중이에요';
    if (kakao && onOpenKakao) action = { label: '연락하기', onPress: () => onOpenKakao(kakao), primary: false };
  } else if (meetup.myStatus === 'APPLIED') {
    title = '확정을 기다리는 중';
    sub = '신청 취소';
    onSub = onCancel ?? null;
    if (kakao && onOpenKakao) action = { label: '연락하기', onPress: () => onOpenKakao(kakao), primary: false };
  } else if (meetup.myStatus === 'DECLINED') {
    title = '이번에는 함께하지 못했어요';
  } else if (meetup.status === 'OPEN') {
    title = feeValue(meetup);
    sub = remaining > 0 ? `${remaining}자리 남음` : '자리가 찼어요';
    if (onApply) action = { label: '참가 신청', onPress: onApply, primary: true };
  } else {
    title = '모집이 끝났어요';
    sub = '다음 모임을 기다려 주세요';
  }

  return (
    <View style={[styles.bar, { backgroundColor: c.background, borderTopColor: c.border, paddingBottom: insetBottom + 12 }]}>
      <View style={styles.barText}>
        <Text style={[styles.barTitle, { color: c.text }]}>{title}</Text>
        {sub ? (
          onSub ? (
            <Pressable accessibilityRole="button" onPress={onSub} disabled={busy} hitSlop={8}>
              <Text style={[styles.barSubLink, { color: c.textSecondary }]}>{sub}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.barSub, { color: c.textSecondary }]}>{sub}</Text>
          )
        ) : null}
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: !!busy }}
          onPress={action.onPress}
          disabled={busy}
          style={({ pressed }) => [
            styles.barBtn,
            { backgroundColor: action.primary ? c.primary : c.text, opacity: pressed || busy ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.barBtnText, { color: action.primary ? c.primaryText : c.background }]}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** 읽기 폭과 왼쪽 기준선을 공유한다. 제목과 구분선으로 내용을 빠르게 찾을 수 있다. */
function Section({ title, c, children }: { title: string; c: ThemeColors; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: c.text, borderTopColor: c.border }]}>{title}</Text>
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
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.mapBtn, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // 사진도 과도하게 커지지 않게 제한한다. 본문은 좌우 여백을 뺀 최대 560px.
  content: { width: '100%', maxWidth: 608, alignSelf: 'center', paddingBottom: 32 },

  coverBanner: { height: 200, alignItems: 'center', justifyContent: 'center' },
  coverBannerEmoji: { fontSize: 64 },

  // ── 표지 ──
  headline: { paddingTop: 20, paddingHorizontal: 24 },
  headlineMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { ...Type.caption, fontWeight: '600' },
  dateBadge: { ...Type.caption, fontWeight: '600', borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  title: { ...Type.display, marginTop: 12 },
  summaryCard: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 16, marginTop: 20 },
  calendarToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  calendarToggleText: { ...Type.label },

  // ── 절 ──
  section: { alignItems: 'stretch', paddingHorizontal: 24, marginTop: 28 },
  sectionTitle: { ...Type.title, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 24, marginBottom: 16 },

  hostBlock: { alignItems: 'flex-start', borderRadius: Radius.md, padding: 16, marginTop: 20 },
  hostCaption: { ...Type.caption, marginBottom: 6 },
  hostName: { ...Type.title },
  hostMeta: { ...Type.caption, marginTop: 5 },

  // ── 달력 ──
  calendar: { width: '100%', maxWidth: 360, gap: 4, alignSelf: 'center', paddingBottom: 16 },
  calRow: { flexDirection: 'row' },
  calCell: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  calHead: { ...Type.caption, fontWeight: '600' },
  calDay: { ...Type.body },
  calMark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  // ── 오시는 길 ──
  venueName: { ...Type.body, fontWeight: '600' },
  venueAddress: { ...Type.body, marginTop: 8 },
  mapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.sm, borderWidth: 1 },
  mapBtnText: { ...Type.label, flexShrink: 1 },

  // ── 안내 카드 ──
  infoCard: { width: '100%', borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  infoLabel: { ...Type.label, fontWeight: '400', width: 56, flexShrink: 0 },
  infoValue: { ...Type.body, fontWeight: '600', flex: 1 },
  infoHint: { ...Type.body, paddingBottom: 16, paddingTop: 8 },

  // ── 함께하는 사람들 ──
  participantWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  participantChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 44, paddingVertical: 10, paddingHorizontal: 14, borderRadius: Radius.pill },
  participantName: { ...Type.label },

  // ── 하단 고정 RSVP 바 ──
  bar: {
    width: '100%', maxWidth: 608, alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barText: { flex: 1, minWidth: 0 },
  barTitle: { ...Type.read, fontWeight: '600' },
  barSub: { ...Type.caption, marginTop: 2 },
  barSubLink: { ...Type.caption, marginTop: 2, textDecorationLine: 'underline' },
  barBtn: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  barBtnText: { ...Type.button },

  // 전하기·따라가기 — 테두리 알약. 둘 다 있으면 한 줄에 서고, 좁으면 아래로 접힌다.
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 24, marginTop: 28 },
  pill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    minHeight: 44, maxWidth: '100%', paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.pill, borderWidth: 1,
  },
  pillText: { ...Type.label, flexShrink: 1 },
  closing: { ...Type.caption, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
});
