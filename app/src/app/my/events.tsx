import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getInkEvents, submitInkEvent, type InkEventSubmission } from '@/lib/ink';
import { showToast } from '@/components/toast';

/**
 * 이벤트 — 잉크를 받을 수 있는 참여 목록.
 * 지금은 블로그 이벤트 하나지만, 이벤트가 늘면 이 화면에 카드가 쌓인다.
 * (잉크 화면에 직접 두면 재화 화면이 이벤트판이 되어 한 뎁스 내렸다)
 */
export default function EventsScreen() {
  const c = useTheme();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<InkEventSubmission[]>([]);
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getInkEvents()
      .then((e) => active && setEvents(e))
      .catch(() => {}) // 목록이 없어도 제출 폼은 보여준다
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const hasPending = events.some((e) => e.status === 'PENDING');

  async function submit() {
    const trimmed = url.trim();
    if (trimmed.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      setEvents(await submitInkEvent(trimmed));
      setUrl('');
      showToast('접수했어요 · 확인 후 잉크를 보내드려요');
    } catch (e) {
      Alert.alert('접수 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SubScreen title="이벤트" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* 블로그 이벤트 — 후기 링크를 남기면 검토 후 잉크 지급 */}
            <View style={[styles.eventCard, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.eventTitle, { color: c.text, fontFamily: Fonts.serif }]}>
                프롤로그 이야기를 들려주세요
              </Text>
              <Text style={[styles.eventDesc, { color: c.textSecondary }]}>
                프롤로그를 소개하는 글을 블로그에 남기고 링크를 보내주세요.{'\n'}확인 후 잉크를 선물로 보내드려요.
              </Text>

              {hasPending ? (
                <View style={[styles.eventPending, { backgroundColor: c.backgroundSelected }]}>
                  <Text style={[styles.eventPendingText, { color: c.textSecondary }]}>
                    검토 중이에요. 결과가 나오면 내역에 남아요.
                  </Text>
                </View>
              ) : (
                <>
                  <TextInput
                    value={url}
                    onChangeText={setUrl}
                    placeholder="https://... 블로그 글 링크"
                    placeholderTextColor={c.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={[styles.eventInput, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                  />
                  <Pressable
                    onPress={submit}
                    disabled={url.trim().length === 0 || submitting}
                    style={[
                      styles.eventSubmit,
                      { backgroundColor: c.primary, opacity: url.trim().length === 0 || submitting ? 0.5 : 1 },
                    ]}
                  >
                    <Text style={[styles.eventSubmitText, { color: c.primaryText }]}>
                      {submitting ? '보내는 중...' : '링크 보내기'}
                    </Text>
                  </Pressable>
                </>
              )}

              {events.length > 0 && (
                <View style={styles.eventHistory}>
                  {events.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.eventRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}
                    >
                      <Text numberOfLines={1} style={[styles.eventUrl, { color: c.textSecondary }]}>
                        {item.url}
                      </Text>
                      <Text
                        style={[
                          styles.eventStatus,
                          { color: item.status === 'APPROVED' ? c.primaryStrong : c.textSecondary },
                        ]}
                      >
                        {eventStatusLabel(item)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SubScreen>
  );
}

/** 제출 상태 → 사용자 문구. */
function eventStatusLabel(item: InkEventSubmission): string {
  if (item.status === 'APPROVED') return `+${item.grantedAmount ?? 0}장`;
  if (item.status === 'REJECTED') return '반려';
  return '검토 중';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },

  eventCard: { borderRadius: Radius.md, padding: 18 },
  eventTitle: { fontSize: 17, fontWeight: '700' },
  eventDesc: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  eventInput: { height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, marginTop: 14 },
  eventSubmit: { height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  eventSubmitText: { fontSize: 15.5, fontWeight: '700' },
  eventPending: { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  eventPendingText: { fontSize: 14 },
  eventHistory: { marginTop: 14 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  eventUrl: { flex: 1, fontSize: 13.5 },
  eventStatus: { fontSize: 14, fontWeight: '700' },
});
