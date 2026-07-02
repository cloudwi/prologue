import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, type ThemeColors } from '@/constants/theme';
import {
  acceptRequest,
  getConversations,
  getReceivedRequests,
  rejectRequest,
  type Conversation,
  type ReceivedRequest,
} from '@/lib/conversation';

function koreanAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear + 1;
}

export default function ChatsScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [requests, setRequests] = useState<ReceivedRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, cv] = await Promise.all([getReceivedRequests(), getConversations()]);
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
    Alert.alert(
      `${cv.nickname} 님과의 대화`,
      `${koreanAge(cv.birthYear)}세 · ${cv.region}\n\n1:1 문답 화면은 곧 열려요 (P3).`,
    );
  }

  const isEmpty = requests.length === 0 && conversations.length === 0;

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
            {requests.length > 0 && (
              <>
                <Text style={[styles.sectionEyebrow, { color: c.primary }]}>받은 대화 신청 {requests.length}</Text>
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
                <Text style={[styles.sectionEyebrow, { color: c.primary, marginTop: requests.length > 0 ? 26 : 0 }]}>대화 중</Text>
                {conversations.map((cv) => (
                  <Pressable
                    key={cv.conversationId}
                    onPress={() => openConversation(cv)}
                    style={[styles.convCard, { backgroundColor: c.backgroundElement, borderColor: c.border }]}
                  >
                    <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                      <Text style={[styles.avatarText, { color: c.primaryText, fontFamily: Fonts.serif }]}>{cv.nickname.slice(0, 1)}</Text>
                    </View>
                    <View style={styles.convBody}>
                      <Text style={[styles.convName, { color: c.text }]}>{cv.nickname}</Text>
                      <Text style={[styles.convMeta, { color: c.textSecondary }]}>
                        {koreanAge(cv.birthYear)}세 · {cv.region}
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
