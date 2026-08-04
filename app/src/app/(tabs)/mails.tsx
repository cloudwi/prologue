import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Avatar } from '@/components/avatar';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getReceivedHearts, sendHeart, type ReceivedHeart } from '@/lib/daily';
import { getReceivedMails, type ReceivedMail } from '@/lib/mails';
import { formatPhoneDigits } from '@/lib/phone';

/**
 * 편지함 — 인앱 채팅 없이, 마음이 닿은 흔적이 도착하는 곳.
 * 나에게 온 하트(되보내면 서로 하트 → 편지 쓸 차례)와 받은 편지(내용·연락처 바로 보임)가 쌓인다.
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
    } catch {
      // 무시 — 빈 상태로 둠
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** 편지 쓰기로. */
  function openCompose(h: ReceivedHeart) {
    if (!h.peerAnswerId) return;
    router.push({
      pathname: '/mail-compose',
      params: { peerAnswerId: h.peerAnswerId, nickname: h.nickname },
    });
  }

  /** 받은 하트에 하트를 돌려보낸다 — 상대는 이미 나를 좋아하니 그 자리에서 상호가 된다. */
  async function heartBack(h: ReceivedHeart) {
    if (!h.peerAnswerId || busy) return;
    setBusy(h.peerAnswerId);
    try {
      const result = await sendHeart(h.peerAnswerId);
      if (result.matched) {
        Alert.alert('서로 호감이에요!', `${h.nickname}님에게 편지로 연락처를 건네보세요.`, [
          { text: '나중에', style: 'cancel' },
          { text: '편지 쓰기', onPress: () => openCompose(h) },
        ]);
      }
      await load();
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : '잠시 후 다시');
    } finally {
      setBusy(null);
    }
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
                  <View
                    key={h.peerAnswerId ?? `${h.nickname}-${i}`}
                    style={[styles.heartCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}
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
                        {h.mutual ? '서로 하트 · 편지를 보낼 차례예요' : `만 ${h.age}세 · ${h.region}`}
                      </Text>
                    </View>
                    {h.peerAnswerId &&
                      (h.mutual ? (
                        <Pressable
                          onPress={() => openCompose(h)}
                          accessibilityRole="button"
                          accessibilityLabel={`${h.nickname}님에게 편지 쓰기`}
                          style={[styles.mailBtn, { borderColor: c.primaryStrong }]}
                        >
                          <Text style={[styles.mailBtnText, { color: c.primaryStrong }]}>편지 쓰기</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => heartBack(h)}
                          disabled={busy === h.peerAnswerId}
                          accessibilityRole="button"
                          accessibilityLabel={`${h.nickname}님에게 하트 돌려보내기`}
                          style={[styles.heartBackBtn, { backgroundColor: c.primary, opacity: busy === h.peerAnswerId ? 0.6 : 1 }]}
                        >
                          <Image
                            source={require('@/assets/images/match-heart.png')}
                            style={styles.heartBackIcon}
                            contentFit="contain"
                            tintColor={c.primaryText}
                          />
                        </Pressable>
                      ))}
                  </View>
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
                    <View style={styles.mailHead}>
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
                    </View>

                    <Text style={[styles.mailContent, { color: c.text, fontFamily: Fonts.serif }]}>{m.content}</Text>

                    {/* 연락처 — 보낸 사람이 스스로 건넨 것이라 바로 보인다. 길게 눌러 복사. */}
                    <View style={[styles.contactBox, { backgroundColor: c.backgroundSelected }]}>
                      {m.phone && (
                        <Text selectable style={[styles.contactLine, { color: c.text }]}>
                          전화번호  {formatPhoneDigits(m.phone)}
                        </Text>
                      )}
                      {m.kakaoId && (
                        <Text selectable style={[styles.contactLine, { color: c.text }]}>
                          카카오톡  {m.kakaoId}
                        </Text>
                      )}
                    </View>
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
  heartBackBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heartBackIcon: { width: 17, height: 17 },
  mailBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mailBtnText: { fontSize: 13.5, fontWeight: '700' },

  mailCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  mailHead: { flexDirection: 'row', alignItems: 'center' },
  mailContent: { fontSize: 15.5, lineHeight: 25, marginTop: 14 },
  contactBox: { borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, marginTop: 14, gap: 6 },
  contactLine: { fontSize: 14, fontVariant: ['tabular-nums'] },

  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
