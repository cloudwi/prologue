import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ImageViewerModal } from '@/components/image-viewer';
import { PhotoPager } from '@/components/photo-pager';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius, type ThemeColors } from '@/constants/theme';
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
 * 프로필 상세가 청첩장이듯 여기도 청첩장의 문법을 쓴다:
 * 표지(커버·제목) → 모시는 글(소개) → 일시·장소 → 안내 말씀(참가비·조건) → 여는 사람.
 * 같은 정보도 가운데 정렬 세리프와 여백으로 조판하면 공지가 아니라 초대가 된다.
 * 신청/취소/오픈채팅 동작은 그대로 — 버튼의 말투만 초대에 맞춘다("참석 의사 전하기").
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

  const dateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeFmt = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' });

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
      ) : meetup == null ? (
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary, fontSize: 15 }}>모임을 찾을 수 없어요 — 마감됐거나 취소됐을 수 있어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {meetup.coverUrls.length > 0 ? (
            <View style={styles.coverPagerWrap}>
              <PhotoPager
                photos={meetup.coverUrls}
                aspectRatio={16 / 9}
                backgroundColor={c.backgroundSelected}
                onPressImage={setViewerIndex}
              />
            </View>
          ) : meetup.emoji != null ? (
            <View style={[styles.coverBanner, { backgroundColor: meetup.color ?? c.backgroundSelected }]}>
              <Text style={styles.coverBannerEmoji}>{meetup.emoji}</Text>
            </View>
          ) : null}

          {/* 표지 — 작은 눈썹, 세리프 제목, 상태 한 줄. 전부 가운데. */}
          <View style={styles.headline}>
            <Text style={[styles.eyebrow, { color: c.primaryStrong }]}>모임 초대장</Text>
            <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>{meetup.title}</Text>
            <Text style={[styles.statusLine, { color: c.textSecondary }]}>
              {meetup.status === 'OPEN' ? '모집 중' : '모집 마감'} · 확정 {meetup.confirmedCount}/{meetup.capacity}명
            </Text>
          </View>

          {/* 모시는 글 — 소개를 편지처럼. 청첩장의 인사말 자리. */}
          {meetup.description ? (
            <>
              <Divider c={c} />
              <Text style={[styles.greeting, { color: c.text, fontFamily: Fonts.serif }]}>{meetup.description}</Text>
            </>
          ) : null}

          <Divider c={c} />

          {/* 일시·장소 — 아이콘 나열 대신 청첩장의 문장. */}
          <View style={styles.whenWhere}>
            <Text style={[styles.dateLine, { color: c.text, fontFamily: Fonts.serif }]}>
              {dateFmt.format(new Date(meetup.meetAt))}
            </Text>
            <Text style={[styles.timeLine, { color: c.textSecondary }]}>{timeFmt.format(new Date(meetup.meetAt))}</Text>

            <View style={styles.venueBlock}>
              {venue.name ? (
                <Text style={[styles.venueName, { color: c.text, fontFamily: Fonts.serif }]}>{venue.name}</Text>
              ) : null}
              {venue.address ? <Text style={[styles.venueAddress, { color: c.textSecondary }]}>{venue.address}</Text> : null}
            </View>

            {/* 지도 — 주소가 있으면 네이버·카카오 둘 다, 옛 데이터는 저장된 링크 하나. */}
            {meetup.placeAddress != null ? (
              <View style={styles.mapRow}>
                <Pressable
                  onPress={() => void Linking.openURL(`https://map.naver.com/p/search/${encodeURIComponent(mapQuery(meetup.placeAddress!))}`)}
                  hitSlop={8}
                >
                  <Text style={[styles.mapLink, { color: c.textSecondary }]}>네이버 지도</Text>
                </Pressable>
                <Text style={[styles.mapDot, { color: c.border }]}>·</Text>
                <Pressable
                  onPress={() => void Linking.openURL(`https://map.kakao.com/link/search/${encodeURIComponent(mapQuery(meetup.placeAddress!))}`)}
                  hitSlop={8}
                >
                  <Text style={[styles.mapLink, { color: c.textSecondary }]}>카카오맵</Text>
                </Pressable>
              </View>
            ) : meetup.placeUrl != null ? (
              <View style={styles.mapRow}>
                <Pressable onPress={() => void Linking.openURL(meetup.placeUrl!)} hitSlop={8}>
                  <Text style={[styles.mapLink, { color: c.textSecondary }]}>지도 보기</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Divider c={c} />

          {/* 안내 말씀 — 참가비와 참석 조건. 문턱이 아니라 자리 안내처럼. */}
          <View style={styles.notes}>
            <Text style={[styles.noteLine, { color: c.text }]}>참가비 · {feeLabel(meetup)}</Text>
            {conditionLabel(meetup) && <Text style={[styles.noteLine, { color: c.text }]}>{conditionLabel(meetup)}</Text>}
            {isPaid && (
              // 결제 로드맵 사전 고지 — 지금은 이체, 향후 앱 결제 전환(2026-08-24 결정).
              <Text style={[styles.noteHint, { color: c.textSecondary }]}>
                참가비는 오픈채팅에서 모임장에게 직접 보내요.{'\n'}앱에서 결제하는 방식을 준비하고 있어요.
              </Text>
            )}
          </View>

          <Divider c={c} />

          {/* 여는 사람 — 청첩장의 혼주 자리. 이름을 누르면 개최 이력으로. */}
          <View style={styles.hostBlock}>
            <Text style={[styles.hostCaption, { color: c.textSecondary }]}>여는 사람</Text>
            <Pressable
              onPress={() => router.push(`/meetup-member/${meetup.hostAccountId}?role=host`)}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignItems: 'center' })}
            >
              <Text style={[styles.hostName, { color: c.text, fontFamily: Fonts.serif }]}>
                {meetup.hostNickname ?? '(알 수 없음)'}
              </Text>
              <Text style={[styles.hostMeta, { color: c.textSecondary }]}>
                {meetup.hostDoneCount > 0 ? `지금까지 ${meetup.hostDoneCount}회 개최` : '첫 모임이에요'} · 프로필 보기 ›
              </Text>
            </Pressable>
          </View>

          {meetup.participants.length > 0 && (
            <View style={styles.participantBlock}>
              <Text style={[styles.hostCaption, { color: c.textSecondary }]}>함께하는 사람들</Text>
              <View style={styles.participantWrap}>
                {meetup.participants.map((p) => (
                  <Pressable
                    key={p.accountId}
                    onPress={() => router.push(`/meetup-member/${p.accountId}`)}
                    style={({ pressed }) => [styles.participantChip, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.participantName, { color: c.text }]}>{p.nickname ?? '(알 수 없음)'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* 다음 할 일 하나 — 내 상태에 따라. 말투는 RSVP. */}
          <View style={styles.actions}>
            {meetup.isMine ? null : meetup.myStatus === 'CONFIRMED' ? (
              <>
                <View style={[styles.confirmedChip, { backgroundColor: c.primary }]}>
                  <Ionicons name="checkmark" size={15} color={c.primaryText} />
                  <Text style={[styles.confirmedText, { color: c.primaryText }]}>참석이 확정됐어요</Text>
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
                  참석 의사를 전했어요 — 오픈채팅에서 인사를 남기면 모임장이 확정해 드려요.
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
                <Text style={[styles.bigBtnText, { color: c.primaryText }]}>참석 의사 전하기</Text>
              </Pressable>
            ) : null}
          </View>
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

/** 구분 장식 — 짧은 가는 선 하나. 프로필 청첩장과 같은 문법. */
function Divider({ c }: { c: ThemeColors }) {
  return (
    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  content: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 56 },

  coverBanner: { height: 96, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  coverPagerWrap: { borderRadius: Radius.lg, overflow: 'hidden' },
  coverBannerEmoji: { fontSize: 48 },

  headline: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 8 },
  eyebrow: { fontSize: 12.5, fontWeight: '700', letterSpacing: 3 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 36, marginTop: 12 },
  statusLine: { fontSize: 13.5, marginTop: 10, letterSpacing: 0.5 },

  divider: { alignItems: 'center', marginVertical: 26 },
  dividerLine: { width: 40, height: StyleSheet.hairlineWidth },

  greeting: { fontSize: 16.5, lineHeight: 28, textAlign: 'center', paddingHorizontal: 12 },

  whenWhere: { alignItems: 'center' },
  dateLine: { fontSize: 18, fontWeight: '600' },
  timeLine: { fontSize: 14.5, marginTop: 6, letterSpacing: 0.5 },
  venueBlock: { alignItems: 'center', marginTop: 20 },
  venueName: { fontSize: 19, fontWeight: '700' },
  venueAddress: { fontSize: 13.5, marginTop: 6, textAlign: 'center' },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  mapLink: { fontSize: 13, textDecorationLine: 'underline' },
  mapDot: { fontSize: 13 },

  notes: { alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  noteLine: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  noteHint: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginTop: 4 },

  hostBlock: { alignItems: 'center' },
  hostCaption: { fontSize: 12.5, letterSpacing: 2, marginBottom: 8 },
  hostName: { fontSize: 19, fontWeight: '700' },
  hostMeta: { fontSize: 13, marginTop: 5 },

  participantBlock: { alignItems: 'center', marginTop: 26 },
  participantWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  participantChip: { height: 32, paddingHorizontal: 13, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  participantName: { fontSize: 13.5, fontWeight: '600' },

  actions: { marginTop: 34, gap: 12 },
  bigBtn: { height: 50, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  bigBtnText: { fontSize: 16, fontWeight: '700' },
  confirmedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', height: 34, paddingHorizontal: 14, borderRadius: Radius.pill },
  confirmedText: { fontSize: 14.5, fontWeight: '700' },
  appliedNote: { fontSize: 14.5, lineHeight: 21, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 },
  cancelWrap: { alignSelf: 'center', marginTop: 2 },
  cancelLink: { fontSize: 14, textDecorationLine: 'underline' },
});
