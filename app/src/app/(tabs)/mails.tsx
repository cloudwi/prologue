import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { BottomTabInset, Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRefreshOnFocus, useSessionGuard } from '@/lib/query';
import { Skeleton, SkeletonCard } from '@/components/skeleton';
import { isSessionExpired } from '@/lib/api';
import { getPeerProfile, getReceivedHearts, getSentHearts, type ReceivedHeart } from '@/lib/daily';
import { declineMail, getReceivedMails, openMail, type ReceivedMail } from '@/lib/mails';
import { INK_PRICE } from '@/lib/ink';
import { RevealableContact } from '@/components/revealable-contact';
import { promptReport } from '@/lib/reports';
import { thumbUrl } from '@/lib/image';

/**
 * 편지함 — 인앱 채팅 없이, 마음이 닿은 흔적이 도착하는 곳.
 * 나에게 온 하트(프로필을 보고 상세에서 되보내면 서로 하트 → 편지 쓸 차례)와 받은 편지(내용·연락처 바로 보임)가 쌓인다.
 * 목록에서는 하트를 보내지 않는다 — 이름과 사진 한 장만 보고 마음을 돌려보내게 두면 하트가 가벼워진다.
 * 사람을 먼저 보고(프로필 상세), 그 자리에서 보낸다.
 * 편지를 받았다면 다음 대화는 앱 밖(전화·카카오톡)에서 이어진다.
 */
/** 편지함 한 화면이 쓰는 데이터 묶음 — 셋이 함께 그려지고 함께 갱신된다. */
type Inbox = { hearts: ReceivedHeart[]; sentHearts: ReceivedHeart[] | null; mails: ReceivedMail[] };

const INBOX_KEY = ['mails', 'inbox'] as const;

export default function MailsScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [sentOpen, setSentOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // 남은 기한 셈의 기준 시각 — 렌더 중 Date.now()는 순수성 규칙에 걸려, 목록을 읽는 순간 한 번 고정한다.
  const [now, setNow] = useState(() => Date.now());

  const queryClient = useQueryClient();

  /*
   * 편지함의 세 갈래를 한 쿼리로 묶는다 — 셋이 늘 함께 그려지고 함께 갱신돼야 하는 한 화면이라,
   * 따로 두면 셋 중 하나만 바뀌며 화면이 어긋나 보인다.
   * 보낸 하트는 구버전 서버엔 없다 — 못 받아도 나머지는 그린다(null이면 섹션을 숨긴다).
   */
  const inboxQuery = useQuery({
    queryKey: INBOX_KEY,
    queryFn: async (): Promise<Inbox> => {
      const [hearts, sentHearts, mails] = await Promise.all([
        getReceivedHearts(),
        getSentHearts().catch(() => null),
        getReceivedMails(),
      ]);
      return { hearts, sentHearts, mails };
    },
  });

  /**
   * 목록 하나만 그 자리에서 바꾼다 — 봉투를 열거나 거절했을 때 전체를 다시 읽지 않는다.
   * 캐시를 직접 고치므로 화면이 깜빡이지 않고, 다음 갱신 때 서버 값으로 맞춰진다.
   */
  const patchMails = useCallback(
    (fn: (prev: ReceivedMail[]) => ReceivedMail[]) => {
      queryClient.setQueryData(INBOX_KEY, (old?: Inbox) => (old ? { ...old, mails: fn(old.mails) } : old));
    },
    [queryClient],
  );

  const hearts = inboxQuery.data?.hearts ?? [];
  const sentHearts = inboxQuery.data?.sentHearts ?? null;
  const mails = inboxQuery.data?.mails ?? [];

  // refetch는 React Query가 안정적으로 유지한다 — 쿼리 객체를 의존성에 두면 매 렌더 바뀐다.
  const { refetch: refetchInbox } = inboxQuery;

  /** 목록을 다시 읽는다. 기한 셈의 기준 시각도 함께 새로 잡는다. */
  const load = useCallback(async () => {
    setNow(Date.now());
    await refetchInbox();
  }, [refetchInbox]);

  const refresh = useCallback(() => void load(), [load]);
  useRefreshOnFocus(refresh);

  // 세션 만료를 조용히 삼키면 화면이 멈춘 것처럼 보인다 — 로그인으로 보낸다.
  const toLogin = useCallback(() => router.replace('/'), [router]);
  useSessionGuard(inboxQuery.error, toLogin);

  /** 편지 쓰기로 — 이미 보낸 상대면 쓰기 대신 보낸 편지 확인으로. */
  function openCompose(h: ReceivedHeart) {
    if (!h.peerAnswerId) return;
    router.push({
      pathname: h.mailSent ? '/mail-view' : '/mail-compose',
      params: { peerAnswerId: h.peerAnswerId, nickname: h.nickname },
    });
  }

  /** 카드 → 상대 프로필 상세(청첩장). 하트든 편지든, 이름만 보고 정하기엔 아쉬우니 사람을 먼저 보여준다. */
  async function openPeerDetail(peerAnswerId: string | null) {
    if (!peerAnswerId || busy) return;
    setBusy(`profile-${peerAnswerId}`);
    try {
      const { question, peer } = await getPeerProfile(peerAnswerId);
      router.push({ pathname: '/peer', params: { data: JSON.stringify(peer), question } });
    } catch (e) {
      if (isSessionExpired(e)) {
        router.replace('/');
        return;
      }
      Alert.alert('프로필을 불러오지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
    } finally {
      setBusy(null);
    }
  }

  /** 봉투 열기 — 열린 편지로 그 자리에서 바뀐다. */
  async function openEnvelope(m: ReceivedMail) {
    if (busy) return;
    setBusy(`open-${m.mailId}`);
    try {
      const opened = await openMail(m.mailId);
      patchMails((prev) => prev.map((x) => (x.mailId === m.mailId ? opened : x)));
    } catch (e) {
      Alert.alert('열지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
    } finally {
      setBusy(null);
    }
  }

  /** 거절 — 조용히 사라진다. 상대에게는 알리지 않는다. */
  function confirmDecline(m: ReceivedMail) {
    Alert.alert('편지를 거절할까요?', '거절한 편지는 사라져요. 상대에게는 알리지 않아요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '거절하기',
        style: 'destructive',
        onPress: async () => {
          setBusy(`decline-${m.mailId}`);
          try {
            await declineMail(m.mailId);
            patchMails((prev) => prev.filter((x) => x.mailId !== m.mailId));
          } catch (e) {
            Alert.alert('거절하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  /**
   * 받은 호감이 사라지기까지 남은 시간 — 사흘 창, 서버와 같은 셈.
   * "지금 답해야 할 이유"를 문장으로 만든다. 서로 호감이 되거나 편지를 보내면 시계가 멈춘다.
   */
  function heartTimeLeft(h: ReceivedHeart): string | null {
    if (h.mutual || h.mailSent) return null;
    const expiresAt = new Date(h.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000;
    const msLeft = expiresAt - now;
    if (msLeft <= 0) return null; // 서버가 곧 거른다 — 새로고침 사이의 찰나
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    return daysLeft <= 1 ? '오늘까지만 보여요' : `${daysLeft}일 뒤 사라져요`;
  }

  /**
   * 하트로 이어진 상대 한 줄 — 받은 하트·보낸 하트가 같은 카드를 쓴다.
   * 카드 전체가 프로필 상세로 가는 버튼이고, 오른쪽 칩은 그 다음 할 일(편지 쓰기·편지 확인·프로필 열기/보기)을 가리킨다.
   */
  function renderHeartCard(h: ReceivedHeart, key: string, last: boolean, received = false) {
    const chip = !h.peerAnswerId
      ? null
      : h.locked
        ? { label: '프로필 열기', tone: 'muted' as const, onPress: undefined }
        : h.mailSent
          ? { label: '편지 확인', tone: 'muted' as const, onPress: () => openCompose(h) }
          : h.mutual
            ? { label: '편지 쓰기', tone: 'primary' as const, onPress: () => openCompose(h) }
            : { label: '프로필 보기', tone: 'neutral' as const, onPress: undefined };
    return (
      <Pressable
        key={key}
        onPress={() => openPeerDetail(h.peerAnswerId)}
        disabled={!h.peerAnswerId}
        accessibilityRole="button"
        accessibilityLabel={`${h.nickname}님의 프로필 보기`}
        style={({ pressed }) => [
          styles.heartRow,
          !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        {h.photoUrl ? (
          <Image
            source={{ uri: thumbUrl(h.photoUrl, 160) }}
            style={[styles.profilePhoto, { backgroundColor: c.backgroundSelected }]}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Avatar avatarId={h.avatarId} nickname={h.nickname} size={44} height={55} radius={Radius.sm} c={c} />
        )}
        <View style={styles.rowBody}>
          <Text style={[styles.rowName, { color: c.text }]}>{h.nickname}</Text>
          <Text style={[styles.rowMeta, { color: h.mutual && !h.locked ? c.primaryStrong : c.textSecondary }]}>
            {h.locked
              ? '3일이 지나 프로필이 닫혔어요'
              : h.mutual
                ? '서로 호감 · 편지를 보낼 차례예요'
                : `만 ${h.age}세 · ${h.region}`}
          </Text>
          {/* 받은 호감의 남은 시간 — 사흘 안에 움직임이 없으면 사라진다. */}
          {received && !h.locked && heartTimeLeft(h) ? (
            <Text style={[styles.rowExpiry, { color: c.primaryStrong }]}>{heartTimeLeft(h)}</Text>
          ) : null}
        </View>
        {chip && (
          // 하트 되보내기는 프로필 상세에서만 — 카드 전체가 상세로 가는 버튼이라 이 칩은 그 길을 가리킬 뿐이다.
          <Pressable
            onPress={chip.onPress}
            disabled={!chip.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${h.nickname}님 ${chip.label}`}
            style={[
              styles.chip,
              chip.tone === 'primary' && { backgroundColor: c.primary },
              chip.tone === 'neutral' && { backgroundColor: c.backgroundSelected },
              chip.tone === 'muted' && { borderWidth: 1, borderColor: c.border },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: chip.tone === 'primary' ? c.primaryText : chip.tone === 'neutral' ? c.text : c.textSecondary },
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        )}
      </Pressable>
    );
  }

  /** 봉투가 발신자에게 돌아가기까지 — 이레 창. 천천히 정하되, 무한히는 아니라는 것을 말해준다. */
  function mailDaysLeft(m: ReceivedMail): string {
    const expiresAt = new Date(m.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 1) return '오늘까지 열리지 않으면 보낸 분에게 돌아가요.';
    return `${daysLeft}일 안에 열리지 않으면 보낸 분에게 돌아가요.`;
  }

  const isEmpty = hearts.length === 0 && (sentHearts?.length ?? 0) === 0 && mails.length === 0;
  const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });
  const sealedCount = mails.filter((m) => m.status === 'PENDING').length;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {inboxQuery.isPending && !inboxQuery.data ? (
          /*
           * 생애 첫 로딩 — 카드 세 장이 들어올 자리만 비워 둔다.
           *
           * 제목과 부제는 회색으로 덮지 않는다. "편지함"은 서버에서 오는 글자가 아니고,
           * 부제도 아직 셀 것이 없을 뿐이지 할 말이 없는 게 아니다. 기다리는 동안 회색 막대를
           * 보여주면 어느 탭에 서 있는지조차 알 수 없다 — 기다림은 모르는 것에만 걸어야 한다.
           */
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>편지함</Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>마음이 닿은 흔적이 여기에 도착해요</Text>
            </View>
            {/* 봉투가 들어올 자리 — 면 색까지 봉투의 것이라야 채워질 때 배경이 바뀌지 않는다. */}
            <View style={styles.skeletonList}>
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} c={c} background={c.primary + '14'}>
                  <View style={styles.skeletonEnvelope}>
                    <Skeleton c={c} width={44} height={55} radius={Radius.sm} />
                    <View style={styles.flex}>
                      <Skeleton c={c} width="42%" height={15} />
                      <Skeleton c={c} width="76%" height={12} style={styles.skeletonEnvelopeMeta} />
                    </View>
                  </View>
                </SkeletonCard>
              ))}
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + 24 }]}
            refreshControl={
              <RefreshControl refreshing={inboxQuery.isRefetching} onRefresh={refresh} tintColor={c.textSecondary} />
            }
          >
            {/* 머리 — 발견의 표지와 같은 문법. 제목 하나, 그 아래 오늘의 상태 한 줄. */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>편지함</Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                {isEmpty
                  ? '마음이 닿은 흔적이 여기에 도착해요'
                  : sealedCount > 0
                    ? `열어보지 않은 봉투가 ${sealedCount}통 있어요`
                    : `호감 ${hearts.length} · 편지 ${mails.length}`}
              </Text>
            </View>

            {isEmpty ? (
              <Animated.View entering={FadeInDown.duration(380)} style={[styles.emptyCard, { backgroundColor: c.backgroundElement }]}>
                <Image source={require('@/assets/images/brand-mark.png')} style={styles.emptyMark} contentFit="contain" />
                <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>아직 도착한 편지가 없어요</Text>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                  오늘의 상대에게 호감을 보내면{'\n'}서로의 마음이 여기에 쌓여요.
                </Text>
                <Pressable
                  onPress={() => router.push('/discover')}
                  hitSlop={8}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.emptyCta, { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={[styles.emptyCtaText, { color: c.primaryText }]}>오늘의 상대 보러 가기</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <>
                {/* 받은 편지 — 가장 무거운 신호라 맨 위. 봉투는 봉투처럼, 열린 편지는 편지지처럼. */}
                {mails.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHead}>
                      <Text style={[styles.sectionEyebrow, { color: c.primaryStrong }]}>받은 편지</Text>
                      <Text style={[styles.sectionCount, { color: c.textSecondary }]}>{mails.length}</Text>
                    </View>
                    {mails.map((m, i) =>
                      m.status === 'PENDING' ? (
                        <Animated.View
                          key={m.mailId}
                          entering={FadeInDown.duration(380).delay(i * 60)}
                          style={[styles.envelope, { backgroundColor: c.primary + '14' }]}
                        >
                          <Pressable
                            onPress={() => openPeerDetail(m.peerAnswerId)}
                            disabled={!m.peerAnswerId}
                            accessibilityRole="button"
                            accessibilityLabel={`${m.nickname}님의 프로필 보기`}
                            style={({ pressed }) => [styles.envelopeHead, { opacity: pressed ? 0.7 : 1 }]}
                          >
                            {m.photoUrl ? (
                              <Image source={{ uri: thumbUrl(m.photoUrl, 160) }} style={[styles.profilePhoto, { backgroundColor: c.backgroundSelected }]} contentFit="cover" transition={150} />
                            ) : (
                              <Avatar avatarId={m.avatarId} nickname={m.nickname} size={44} height={55} radius={Radius.sm} c={c} />
                            )}
                            <View style={styles.rowBody}>
                              <Text style={[styles.rowName, { color: c.text }]}>{m.nickname}</Text>
                              <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
                                만 {m.age}세 · {m.region} · {dateFmt.format(new Date(m.createdAt))}
                              </Text>
                            </View>
                            <Text style={[styles.chevron, { color: c.textSecondary }]}>›</Text>
                          </Pressable>
                          {/* 봉투 — 열어야 내용과 연락처가 보인다. 여는 것도 마음의 선택이라서. */}
                          <View style={styles.envelopeBody}>
                            <Image source={require('@/assets/images/brand-mark.png')} style={styles.envelopeMark} contentFit="contain" />
                            <Text style={[styles.sealedText, { color: c.text, fontFamily: Fonts.serif }]}>
                              {m.nickname}님의 편지가 도착했어요
                            </Text>
                            <Text style={[styles.sealedHint, { color: c.textSecondary }]}>
                              연락처가 담긴 한 통이에요. 열어볼지는 천천히 정하셔도 돼요.{'\n'}
                              {mailDaysLeft(m)}
                            </Text>
                          </View>
                          <View style={styles.sealedActions}>
                            <Pressable
                              onPress={() => confirmDecline(m)}
                              disabled={busy != null}
                              accessibilityRole="button"
                              hitSlop={8}
                              style={({ pressed }) => [styles.declineBtn, { opacity: pressed ? 0.6 : 1 }]}
                            >
                              <Text style={[styles.declineText, { color: c.textSecondary }]}>조용히 거절</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => openEnvelope(m)}
                              disabled={busy != null}
                              accessibilityRole="button"
                              style={({ pressed }) => [
                                styles.openBtn,
                                { backgroundColor: c.primary, opacity: pressed || busy === `open-${m.mailId}` ? 0.7 : 1 },
                              ]}
                            >
                              <Text style={[styles.openText, { color: c.primaryText }]}>열어보기</Text>
                            </Pressable>
                          </View>
                        </Animated.View>
                      ) : (
                        <View key={m.mailId} style={[styles.letter, { backgroundColor: c.backgroundElement }]}>
                          <View style={[styles.letterRule, { backgroundColor: c.primary }]} />
                          <Pressable
                            onPress={() => openPeerDetail(m.peerAnswerId)}
                            disabled={!m.peerAnswerId}
                            accessibilityRole="button"
                            accessibilityLabel={`${m.nickname}님의 프로필 보기`}
                            style={({ pressed }) => [styles.letterHead, { opacity: pressed ? 0.7 : 1 }]}
                          >
                            {m.photoUrl ? (
                              <Image source={{ uri: thumbUrl(m.photoUrl, 160) }} style={[styles.profilePhoto, { backgroundColor: c.backgroundSelected }]} contentFit="cover" transition={150} />
                            ) : (
                              <Avatar avatarId={m.avatarId} nickname={m.nickname} size={44} height={55} radius={Radius.sm} c={c} />
                            )}
                            <View style={styles.rowBody}>
                              <Text style={[styles.rowName, { color: c.text }]}>{m.nickname}</Text>
                              <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
                                만 {m.age}세 · {m.region} · {dateFmt.format(new Date(m.createdAt))}
                              </Text>
                            </View>
                            <Text style={[styles.chevron, { color: c.textSecondary }]}>›</Text>
                          </Pressable>

                          <Text style={[styles.mailContent, { color: c.text, fontFamily: Fonts.serif }]}>{m.content}</Text>

                          {/* 연락처 — 답장(내 연락처를 건네는 것)을 해야 열린다. 열린 뒤에도 기본은 가려둔다. */}
                          {m.phone || m.kakaoId ? (
                            <RevealableContact phone={m.phone} kakaoId={m.kakaoId} c={c} />
                          ) : (
                            <View style={[styles.contactBox, { backgroundColor: c.backgroundSelected }]}>
                              <Ionicons name="lock-closed" size={13} color={c.textSecondary} />
                              <Text style={[styles.contactLocked, { color: c.textSecondary }]}>
                                답장을 보내면 상대의 연락처가 열려요. 답장은 한 번뿐이에요.
                              </Text>
                            </View>
                          )}

                          {/* 답장 — 나도 연락처를 건네고 싶을 때. 답장은 절반값 — 상대가 이미 값을 치른 마음이라.
                              이미 보냈으면 다시 쓰는 대신 보낸 편지를 보여준다 — 부친 편지는 고칠 수 없다. */}
                          <View style={styles.letterActions}>
                            {m.replied && !m.peerAnswerId ? null : (
                              <Pressable
                                onPress={() =>
                                  router.push(
                                    m.replied
                                      ? { pathname: '/mail-view', params: { peerAnswerId: m.peerAnswerId!, nickname: m.nickname } }
                                      : { pathname: '/mail-compose', params: { replyMailId: m.mailId, nickname: m.nickname } },
                                  )
                                }
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                  styles.replyBtn,
                                  m.replied ? { borderWidth: 1, borderColor: c.border } : { backgroundColor: c.text },
                                  { opacity: pressed ? 0.7 : 1 },
                                ]}
                              >
                                <Text style={[styles.replyBtnText, { color: m.replied ? c.textSecondary : c.background }]}>
                                  {m.replied ? '보낸 편지 확인' : `답장하기 · 잉크 ${INK_PRICE.MAIL_REPLY}`}
                                </Text>
                              </Pressable>
                            )}
                            {/* 신고 — 발밑에 조용히. */}
                            <Pressable onPress={() => promptReport({ mailId: m.mailId })} hitSlop={10} accessibilityRole="button">
                              <Text style={[styles.reportLinkText, { color: c.textSecondary }]}>신고</Text>
                            </Pressable>
                          </View>
                        </View>
                      ),
                    )}
                  </View>
                )}

                {hearts.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHead}>
                      <Text style={[styles.sectionEyebrow, { color: c.primaryStrong }]}>나에게 온 호감</Text>
                      <Text style={[styles.sectionCount, { color: c.textSecondary }]}>{hearts.length}</Text>
                    </View>
                    <View style={[styles.listCard, { backgroundColor: c.backgroundElement }]}>
                      {hearts.map((h, i) => renderHeartCard(h, h.peerAnswerId ?? `${h.nickname}-${i}`, i === hearts.length - 1, true))}
                    </View>
                  </View>
                )}

                {sentHearts && (
                  <View style={styles.section}>
                    {/* 접힌 섹션 — 궁금할 때만 펼친다. 헤더 전체가 토글. 0이어도 자리를 지켜 어디서 보는지 알려준다. */}
                    <Pressable
                      onPress={() => setSentOpen((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={`내가 보낸 호감 ${sentHearts.length}, ${sentOpen ? '접기' : '펼치기'}`}
                      hitSlop={6}
                      style={styles.sectionHead}
                    >
                      <Text style={[styles.sectionEyebrow, { color: c.primaryStrong }]}>내가 보낸 호감</Text>
                      <View style={styles.sentToggle}>
                        <Text style={[styles.sectionCount, { color: c.textSecondary }]}>{sentHearts.length}</Text>
                        <Ionicons name={sentOpen ? 'chevron-up' : 'chevron-down'} size={15} color={c.textSecondary} />
                      </View>
                    </Pressable>
                    {sentOpen && sentHearts.length === 0 && (
                      <Text style={[styles.sentEmpty, { color: c.textSecondary }]}>
                        아직 보낸 호감이 없어요. 오늘의 상대 프로필에서 보내보세요.
                      </Text>
                    )}
                    {sentOpen && sentHearts.length > 0 && (
                      <View style={[styles.listCard, { backgroundColor: c.backgroundElement }]}>
                        {sentHearts.map((h, i) =>
                          renderHeartCard(h, `sent-${h.peerAnswerId ?? `${h.nickname}-${i}`}`, i === sentHearts.length - 1),
                        )}
                      </View>
                    )}
                  </View>
                )}
              </>
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
  skeletonSub: { marginTop: 10 },
  skeletonEnvelope: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonEnvelopeMeta: { marginTop: 8 },
  skeletonList: { gap: 12, marginTop: 20 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  header: { paddingHorizontal: 4, paddingTop: 6, paddingBottom: 18 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 14.5, marginTop: 4 },

  section: { marginBottom: 26 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 },
  sectionEyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  sectionCount: { fontSize: 13.5, fontWeight: '600' },
  sentToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sentEmpty: { fontSize: 14, lineHeight: 20, paddingHorizontal: 4 },

  // 사람 목록 — 한 카드 안에 줄로. 카드마다 테두리를 두르면 목록이 시끄럽다.
  listCard: { borderRadius: Radius.lg, paddingHorizontal: 16 },
  heartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  /*
   * 프로필 사진 — 원이 아니라 세로 4:5 라운드 사각형(2026-08-25).
   * 세로 사진을 44pt 원에 'cover'로 넣으면 가운데만 남아 얼굴이 토막 난다.
   * 비율을 사진과 맞춰두면 아무것도 잘리지 않고, 작아질 뿐이다.
   */
  profilePhoto: { width: 44, height: 55, borderRadius: Radius.sm },
  rowBody: { marginLeft: 12, flex: 1 },
  rowName: { fontSize: 17, fontWeight: '700' },
  rowMeta: { fontSize: 13.5, marginTop: 2 },
  rowExpiry: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  chip: { height: 32, paddingHorizontal: 13, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13.5, fontWeight: '700' },
  chevron: { fontSize: 20, fontWeight: '300', marginLeft: 6 },

  // 봉투 — 발견의 표지와 같은 테라코타 8% 면. 열린 편지와 한눈에 구분된다.
  envelope: { borderRadius: Radius.lg, padding: 18, marginBottom: 12 },
  envelopeHead: { flexDirection: 'row', alignItems: 'center' },
  envelopeBody: { alignItems: 'center', paddingTop: 22, paddingBottom: 18 },
  envelopeMark: { width: 52, height: 38, marginBottom: 12 },
  sealedText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sealedHint: { fontSize: 13.5, lineHeight: 19, textAlign: 'center', marginTop: 6, paddingHorizontal: 10 },
  sealedActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  declineBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  declineText: { fontSize: 14.5, fontWeight: '600' },
  openBtn: { flex: 1, height: 46, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  openText: { fontSize: 16, fontWeight: '700' },

  // 열린 편지 — 편지지. 왼쪽 위 테라코타 선 한 줄이 "열린 편지"라는 표시.
  letter: { borderRadius: Radius.lg, padding: 18, paddingTop: 20, marginBottom: 12, overflow: 'hidden' },
  letterRule: { position: 'absolute', top: 0, left: 18, width: 36, height: 2, borderRadius: 1 },
  letterHead: { flexDirection: 'row', alignItems: 'center' },
  mailContent: { fontSize: 17, lineHeight: 27, marginTop: 16 },
  contactBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14 },
  contactLocked: { flex: 1, fontSize: 14, lineHeight: 20 },
  letterActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  replyBtn: { flex: 1, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  replyBtnText: { fontSize: 15, fontWeight: '700' },
  reportLinkText: { fontSize: 13, textDecorationLine: 'underline', paddingHorizontal: 4 },

  // 빈 상태 — 박스 대신 마크 한 점과 문장, 그리고 다음 할 일.
  emptyCard: { borderRadius: Radius.lg, alignItems: 'center', paddingVertical: 40, paddingHorizontal: 28 },
  emptyMark: { width: 54, height: 40, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 14.5, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  emptyCta: { marginTop: 18, height: 44, paddingHorizontal: 20, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  emptyCtaText: { fontSize: 15, fontWeight: '700' },
});
