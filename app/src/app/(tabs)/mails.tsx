import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Avatar } from '@/components/avatar';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSessionExpired } from '@/lib/api';
import { getPeerProfile, getReceivedHearts, type ReceivedHeart } from '@/lib/daily';
import { declineMail, getReceivedMails, openMail, type ReceivedMail } from '@/lib/mails';
import { INK_PRICE } from '@/lib/ink';
import { RevealableContact } from '@/components/revealable-contact';
import { promptReport } from '@/lib/reports';

/**
 * 편지함 — 인앱 채팅 없이, 마음이 닿은 흔적이 도착하는 곳.
 * 나에게 온 하트(프로필을 보고 상세에서 되보내면 서로 하트 → 편지 쓸 차례)와 받은 편지(내용·연락처 바로 보임)가 쌓인다.
 * 목록에서는 하트를 보내지 않는다 — 이름과 사진 한 장만 보고 마음을 돌려보내게 두면 하트가 가벼워진다.
 * 사람을 먼저 보고(프로필 상세), 그 자리에서 보낸다.
 * 편지를 받았다면 다음 대화는 앱 밖(전화·카카오톡)에서 이어진다.
 */
export default function MailsScreen() {
  const c = useTheme();
  const router = useRouter();

  const [hearts, setHearts] = useState<ReceivedHeart[]>([]);
  const [mails, setMails] = useState<ReceivedMail[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [h, m] = await Promise.all([getReceivedHearts(), getReceivedMails()]);
      setHearts(h);
      setMails(m);
    } catch (e) {
      // 세션 만료를 조용히 삼키면 화면이 멈춘 것처럼 보인다 — 로그인으로 보낸다.
      if (isSessionExpired(e)) {
        router.replace('/');
        return;
      }
      // 그 외 실패는 무시 — 빈 상태로 둠
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
      setMails((prev) => prev.map((x) => (x.mailId === m.mailId ? opened : x)));
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
            setMails((prev) => prev.filter((x) => x.mailId !== m.mailId));
          } catch (e) {
            Alert.alert('거절하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  const isEmpty = hearts.length === 0 && mails.length === 0;
  const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.flex}>
        <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>편지함</Text>

        {loading ? (
          <View style={[styles.flex, styles.center]}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : isEmpty ? (
          <View style={[styles.flex, styles.center, { paddingHorizontal: 40 }]}>
            <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>아직 도착한 편지가 없어요</Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              발견에서 마음에 드는 상대에게{'\n'}하트와 편지를 보내보세요.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {hearts.length > 0 && (
              <>
                <Text style={[styles.sectionEyebrow, { color: c.primary }]}>나에게 온 하트 {hearts.length}</Text>
                {hearts.map((h, i) => (
                  <Pressable
                    key={h.peerAnswerId ?? `${h.nickname}-${i}`}
                    onPress={() => openPeerDetail(h.peerAnswerId)}
                    disabled={!h.peerAnswerId}
                    accessibilityRole="button"
                    accessibilityLabel={`${h.nickname}님의 프로필 보기`}
                    style={({ pressed }) => [
                      styles.heartCard,
                      { backgroundColor: c.backgroundElement, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    {h.photoUrl ? (
                      <Image
                        source={{ uri: h.photoUrl }}
                        style={[styles.profilePhoto, { backgroundColor: c.backgroundSelected }]}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <Avatar avatarId={h.avatarId} nickname={h.nickname} size={48} c={c} />
                    )}
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowName, { color: c.text }]}>{h.nickname}</Text>
                      <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
                        {h.locked
                          ? '사흘이 지나 프로필이 닫혔어요'
                          : h.mutual
                            ? '서로 하트 · 편지를 보낼 차례예요'
                            : `만 ${h.age}세 · ${h.region}`}
                      </Text>
                    </View>
                    {h.peerAnswerId && h.locked && (
                      // 프로필이 닫혔으면 행동도 닫는다 — 보지 못하는 상대에게 하트를 보내게 두면
                      // 잠근 의미가 없다. 카드를 누르면 상세에서 잉크로 열 수 있다.
                      <View style={[styles.mailBtn, { borderColor: c.border }]}>
                        <Text style={[styles.mailBtnText, { color: c.textSecondary }]}>프로필 열기</Text>
                      </View>
                    )}
                    {h.peerAnswerId &&
                      !h.locked &&
                      (h.mailSent || h.mutual ? (
                        <Pressable
                          onPress={() => openCompose(h)}
                          accessibilityRole="button"
                          accessibilityLabel={h.mailSent ? `${h.nickname}님에게 보낸 편지 확인` : `${h.nickname}님에게 편지 쓰기`}
                          style={[styles.mailBtn, { borderColor: h.mailSent ? c.border : c.primaryStrong }]}
                        >
                          <Text style={[styles.mailBtnText, { color: h.mailSent ? c.textSecondary : c.primaryStrong }]}>
                            {h.mailSent ? '편지 확인' : '편지 쓰기'}
                          </Text>
                        </Pressable>
                      ) : (
                        // 하트 되보내기는 프로필 상세에서만 — 카드 전체가 상세로 가는 버튼이라 이 칩은 그 길을 가리킬 뿐이다.
                        <View style={[styles.mailBtn, { borderColor: c.primaryStrong }]}>
                          <Text style={[styles.mailBtnText, { color: c.primaryStrong }]}>프로필 보기</Text>
                        </View>
                      ))}
                  </Pressable>
                ))}
              </>
            )}

            {mails.length > 0 && (
              <>
                <Text style={[styles.sectionEyebrow, { color: c.primary, marginTop: hearts.length > 0 ? 26 : 0 }]}>
                  받은 편지 {mails.length}
                </Text>
                {mails.map((m) => (
                  <View key={m.mailId} style={[styles.mailCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                    {/* 머리(사진·이름)를 누르면 보낸 사람의 프로필 상세로. */}
                    <Pressable
                      onPress={() => openPeerDetail(m.peerAnswerId)}
                      disabled={!m.peerAnswerId}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.nickname}님의 프로필 보기`}
                      style={({ pressed }) => [styles.mailHead, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      {m.photoUrl ? (
                        <Image
                          source={{ uri: m.photoUrl }}
                          style={[styles.profilePhoto, { backgroundColor: c.backgroundSelected }]}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <Avatar avatarId={m.avatarId} nickname={m.nickname} size={48} c={c} />
                      )}
                      <View style={styles.rowBody}>
                        <Text style={[styles.rowName, { color: c.text }]}>{m.nickname}</Text>
                        <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
                          만 {m.age}세 · {m.region} · {dateFmt.format(new Date(m.createdAt))}
                        </Text>
                      </View>
                    </Pressable>

                    {m.status === 'PENDING' ? (
                      <>
                        {/* 봉투 — 열어야 내용과 연락처가 보인다. 여는 것도 마음의 선택이라서. */}
                        <View style={[styles.sealedBox, { backgroundColor: c.backgroundSelected }]}>
                          <Text style={[styles.sealedText, { color: c.text, fontFamily: Fonts.serif }]}>
                            편지가 도착했어요
                          </Text>
                          <Text style={[styles.sealedHint, { color: c.textSecondary }]}>
                            열어보면 메시지를 읽을 수 있어요.
                          </Text>
                        </View>
                        <View style={styles.sealedActions}>
                          <Pressable
                            onPress={() => confirmDecline(m)}
                            disabled={busy != null}
                            accessibilityRole="button"
                            style={({ pressed }) => [
                              styles.declineBtn,
                              { borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                            ]}
                          >
                            <Text style={{ color: c.textSecondary, fontWeight: '700' }}>거절</Text>
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
                            <Text style={{ color: c.primaryText, fontWeight: '700' }}>열어보기</Text>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.mailContent, { color: c.text, fontFamily: Fonts.serif }]}>{m.content}</Text>

                        {/* 연락처 — 답장(내 연락처를 건네는 것)을 해야 열린다. 열린 뒤에도 기본은 가려둔다. */}
                        {m.phone || m.kakaoId ? (
                          <RevealableContact phone={m.phone} kakaoId={m.kakaoId} c={c} />
                        ) : (
                          <View style={[styles.contactBox, { backgroundColor: c.backgroundSelected }]}>
                            <Text style={[styles.contactLocked, { color: c.textSecondary }]}>
                              답장을 보내면 상대의 연락처가 열려요. 답장은 한 번뿐이에요.
                            </Text>
                          </View>
                        )}

                        {/* 답장 — 나도 연락처를 건네고 싶을 때. 답장은 절반값(잉크 25) — 상대가 이미 값을 치른 마음이라.
                            이미 보냈으면 다시 쓰는 대신 보낸 편지를 보여준다 — 부친 편지는 고칠 수 없다. */}
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
                              { borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                            ]}
                          >
                            <Text style={[styles.replyBtnText, { color: m.replied ? c.textSecondary : c.primaryStrong }]}>
                              {m.replied ? '보낸 편지 확인' : `답장하기 (잉크 ${INK_PRICE.MAIL_REPLY})`}
                            </Text>
                          </Pressable>
                        )}

                        {/* 신고 — 발밑에 조용히. */}
                        <Pressable
                          onPress={() => promptReport({ mailId: m.mailId })}
                          hitSlop={10}
                          accessibilityRole="button"
                          style={styles.reportLink}
                        >
                          <Text style={[styles.reportLinkText, { color: c.textSecondary }]}>이 편지 신고하기</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                ))}
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
  title: { fontSize: 26, fontWeight: '700', paddingHorizontal: 25, paddingTop: 8, paddingBottom: 4 },
  content: { paddingHorizontal: 25, paddingTop: 12, paddingBottom: 40 },
  sectionEyebrow: { fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },

  heartCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  profilePhoto: { width: 48, height: 48, borderRadius: 24 },
  rowBody: { marginLeft: 14, flex: 1 },
  rowName: { fontSize: 17, fontWeight: '700' },
  rowMeta: { fontSize: 13, marginTop: 3 },
  mailBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mailBtnText: { fontSize: 13.5, fontWeight: '700' },

  mailCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  mailHead: { flexDirection: 'row', alignItems: 'center' },
  mailContent: { fontSize: 15.5, lineHeight: 25, marginTop: 14 },
  contactBox: { borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14, gap: 6 },
  contactLocked: { fontSize: 13, lineHeight: 19 },
  replyBtn: { height: 42, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  replyBtnText: { fontSize: 14, fontWeight: '700' },

  sealedBox: { borderRadius: Radius.md, alignItems: 'center', paddingVertical: 22, marginTop: 14 },
  sealedText: { fontSize: 16, fontWeight: '700' },
  sealedHint: { fontSize: 12.5, marginTop: 6 },
  sealedActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  declineBtn: { flex: 1, height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  openBtn: { flex: 2, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },

  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },

  reportLink: { alignItems: 'center', marginTop: 14 },
  reportLinkText: { fontSize: 12, textDecorationLine: 'underline' },
});
