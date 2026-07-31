import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Avatar } from '@/components/avatar';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  acceptRequest,
  getConversations,
  getReceivedRequests,
  rejectRequest,
  type Conversation,
  type ReceivedRequest,
} from '@/lib/conversation';
import { getReceivedHearts, sendHeart, type ReceivedHeart } from '@/lib/daily';

export default function ChatsScreen() {
  const c = useTheme();
  const router = useRouter();

  const [hearts, setHearts] = useState<ReceivedHeart[]>([]);
  const [requests, setRequests] = useState<ReceivedRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [h, r, cv] = await Promise.all([getReceivedHearts(), getReceivedRequests(), getConversations()]);
      setHearts(h);
      setRequests(r);
      setConversations(cv);
    } catch {
      // 무시 — 빈 상태로 둠
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load().finally(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );

  async function onAccept(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      await acceptRequest(id);
      Alert.alert('대화가 시작됐어요', '이제 상대와 문답을 주고받을 수 있어요.');
      await load();
    } catch (e) {
      Alert.alert('수락 실패', e instanceof Error ? e.message : '잠시 후 다시');
    } finally {
      setBusy(null);
    }
  }

  async function onReject(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      await rejectRequest(id);
      await load();
    } catch (e) {
      Alert.alert('거절 실패', e instanceof Error ? e.message : '잠시 후 다시');
    } finally {
      setBusy(null);
    }
  }

  function openConversation(cv: Conversation) {
    router.push({ pathname: '/conversation/[id]', params: { id: cv.conversationId, nickname: cv.nickname } });
  }

  /** 받은 하트에 하트를 돌려보낸다 — 상대는 이미 나를 좋아하니 그 자리에서 매칭된다. */
  async function heartBack(h: ReceivedHeart) {
    if (!h.peerAnswerId || busy) return;
    setBusy(h.peerAnswerId);
    try {
      const result = await sendHeart(h.peerAnswerId);
      if (result.matched) {
        Alert.alert('서로 호감이에요!', `${h.nickname}님과 대화가 열렸어요.`);
      }
      await load();
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : '잠시 후 다시');
    } finally {
      setBusy(null);
    }
  }

  const isEmpty = hearts.length === 0 && requests.length === 0 && conversations.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.flex}>
        <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>대화</Text>

        {loading ? (
          <View style={[styles.flex, styles.center]}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : isEmpty ? (
          <View style={[styles.flex, styles.center, { paddingHorizontal: 40 }]}>
            <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>아직 대화가 없어요</Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              발견에서 마음에 드는 상대의 답변을 보고{'\n'}대화를 신청해보세요.
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
                    <View style={styles.convBody}>
                      <Text style={[styles.convName, { color: c.text }]}>{h.nickname}</Text>
                      <Text style={[styles.convMeta, { color: c.textSecondary }]}>
                        만 {h.age}세 · {h.region}
                      </Text>
                    </View>
                    {h.peerAnswerId && (
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
                    )}
                  </View>
                ))}
              </>
            )}

            {requests.length > 0 && (
              <>
                <Text style={[styles.sectionEyebrow, { color: c.primary, marginTop: hearts.length > 0 ? 26 : 0 }]}>
                  받은 대화 신청 {requests.length}
                </Text>
                {requests.map((r) => (
                  <View key={r.requestId} style={[styles.reqCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                    <Text style={[styles.reqQ, { color: c.textSecondary }]}>{r.questionContent}</Text>
                    <Text style={[styles.reqA, { color: c.text, fontFamily: Fonts.serif }]}>{r.requesterAnswer}</Text>
                    <View style={styles.reqActions}>
                      <Pressable
                        onPress={() => onReject(r.requestId)}
                        disabled={busy === r.requestId}
                        style={[styles.rejectBtn, { borderColor: c.border }]}
                      >
                        <Text style={{ color: c.textSecondary, fontWeight: '700' }}>거절</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => onAccept(r.requestId)}
                        disabled={busy === r.requestId}
                        style={[styles.acceptBtn, { backgroundColor: c.primary, opacity: busy === r.requestId ? 0.6 : 1 }]}
                      >
                        <Text style={{ color: c.primaryText, fontWeight: '700' }}>수락</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </>
            )}

            {conversations.length > 0 && (
              <>
                <Text style={[styles.sectionEyebrow, { color: c.primary, marginTop: hearts.length > 0 || requests.length > 0 ? 26 : 0 }]}>대화 중</Text>
                {conversations.map((cv) => (
                  <Pressable
                    key={cv.conversationId}
                    onPress={() => openConversation(cv)}
                    style={[styles.convCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}
                  >
                    {cv.photoUrl ? (
                      <Image
                        source={{ uri: cv.photoUrl }}
                        style={[styles.profilePhoto, { backgroundColor: c.backgroundSelected }]}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <Avatar avatarId={cv.avatarId} nickname={cv.nickname} size={48} c={c} />
                    )}
                    <View style={styles.convBody}>
                      <Text style={[styles.convName, { color: c.text }]}>{cv.nickname}</Text>
                      <Text style={[styles.convMeta, { color: c.textSecondary }]}>
                        만 {cv.age}세 · {cv.region}
                      </Text>
                    </View>
                  </Pressable>
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
  heartBackBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heartBackIcon: { width: 17, height: 17 },
  reqCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14 },
  reqQ: { fontSize: 12, marginBottom: 8 },
  reqA: { fontSize: 16, lineHeight: 25 },
  reqActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  rejectBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { flex: 2, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  convCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  convBody: { marginLeft: 14, flex: 1 },
  convName: { fontSize: 17, fontWeight: '700' },
  convMeta: { fontSize: 13, marginTop: 3 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
