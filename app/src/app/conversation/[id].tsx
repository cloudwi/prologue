import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { getMessages, sendMessage, type Message } from '@/lib/conversation';
import { useTheme } from '@/hooks/use-theme';

export default function ConversationScreen() {
  const c = useTheme();
  const router = useRouter();
  const { id, nickname } = useLocalSearchParams<{ id: string; nickname?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await getMessages(id));
    } catch {
      // 유지
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    const content = draft.trim();
    if (content.length === 0 || sending) return;
    setSending(true);
    setDraft('');
    try {
      const msg = await sendMessage(id, content);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setDraft(content); // 실패 시 복원
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={[styles.topbar, { borderBottomColor: c.border }]}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={{ color: c.text, fontSize: 16 }}>‹</Text>
            </Pressable>
            <Text style={[styles.topTitle, { color: c.text, fontFamily: Fonts.serif }]}>{nickname ?? '대화'}</Text>
            <View style={{ width: 20 }} />
          </View>

          {loading ? (
            <View style={[styles.flex, styles.center]}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.thread}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
              {messages.length === 0 && (
                <Text style={[styles.hint, { color: c.textSecondary }]}>
                  서로에게 궁금한 것을 물어보며 알아가 보세요.
                </Text>
              )}
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    m.mine
                      ? { alignSelf: 'flex-end', backgroundColor: c.primary }
                      : { alignSelf: 'flex-start', backgroundColor: c.backgroundElement, borderWidth: 1, borderColor: c.border },
                  ]}
                >
                  <Text style={{ color: m.mine ? c.primaryText : c.text, fontSize: 16, lineHeight: 23 }}>{m.content}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={[styles.inputBar, { borderTopColor: c.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="메시지 입력"
              placeholderTextColor={c.textSecondary}
              multiline
              maxLength={1000}
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
            />
            <Pressable
              onPress={send}
              disabled={draft.trim().length === 0 || sending}
              style={[styles.sendBtn, { backgroundColor: c.primary, opacity: draft.trim().length === 0 || sending ? 0.5 : 1 }]}
            >
              <Text style={{ color: c.primaryText, fontWeight: '700' }}>전송</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  topTitle: { fontSize: 18, fontWeight: '700' },
  thread: { padding: 16, gap: 8, flexGrow: 1 },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 20 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontSize: 16 },
  sendBtn: { height: 44, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
