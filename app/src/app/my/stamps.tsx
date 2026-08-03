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
import { Image } from 'expo-image';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getStampEvents,
  getStampWallet,
  stampReasonLabel,
  submitStampEvent,
  type StampEventSubmission,
  type StampWallet,
} from '@/lib/stamps';

/**
 * 우표 지갑 — 잔액과 증감 내역. 재화는 매칭 메뉴가 아니라 제 방을 가진다.
 * 블로그 이벤트(후기 링크 제출 → 검토 후 지급)도 여기 산다.
 * 충전 버튼은 출시 후 IAP와 함께 이 화면에 붙는다.
 */
export default function StampsScreen() {
  const c = useTheme();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<StampWallet | null>(null);
  const [events, setEvents] = useState<StampEventSubmission[]>([]);
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getStampWallet(), getStampEvents().catch(() => [] as StampEventSubmission[])])
      .then(([w, e]) => {
        if (!active) return;
        setWallet(w);
        setEvents(e);
      })
      .catch((e) => {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      })
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
      setEvents(await submitStampEvent(trimmed));
      setUrl('');
      Alert.alert('접수했어요', '확인 후 우표를 보내드려요. 결과는 이 화면에서 볼 수 있어요.');
    } catch (e) {
      Alert.alert('접수 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  }

  const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });

  return (
    <SubScreen title="우표" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* 잔액 — 이 화면의 주인공. 숫자 하나를 크게. */}
            <View style={[styles.balanceCard, { backgroundColor: c.backgroundElement }]}>
              <Image
                source={require('@/assets/images/stamp.png')}
                style={styles.stampIcon}
                contentFit="contain"
                tintColor={c.primaryStrong}
              />
              <Text style={[styles.balanceNumber, { color: c.text, fontFamily: Fonts.serif }]}>
                {wallet?.balance ?? 0}
                <Text style={[styles.balanceUnit, { color: c.textSecondary }]}> 장</Text>
              </Text>
              <Text style={[styles.balanceHint, { color: c.textSecondary }]}>
                대화 신청 한 번에 우표 1장이 쓰여요.{'\n'}충전은 출시 후에 열릴 예정이에요.
              </Text>
            </View>

            {/* 블로그 이벤트 — 후기 링크를 남기면 검토 후 우표 지급 */}
            <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>블로그 이벤트</Text>
            <View style={[styles.eventCard, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.eventTitle, { color: c.text, fontFamily: Fonts.serif }]}>
                프롤로그 이야기를 들려주세요
              </Text>
              <Text style={[styles.eventDesc, { color: c.textSecondary }]}>
                프롤로그를 소개하는 글을 블로그에 남기고 링크를 보내주세요.{'\n'}확인 후 우표를 선물로 보내드려요.
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

            {(wallet?.history.length ?? 0) > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>내역</Text>
                <View style={[styles.historyCard, { backgroundColor: c.backgroundElement }]}>
                  {wallet?.history.map((item, i) => (
                    <View
                      key={`${item.createdAt}-${i}`}
                      style={[
                        styles.historyRow,
                        i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                      ]}
                    >
                      <View style={styles.flex}>
                        <Text style={[styles.historyLabel, { color: c.text }]}>{stampReasonLabel(item.reason)}</Text>
                        <Text style={[styles.historyDate, { color: c.textSecondary }]}>
                          {dateFmt.format(new Date(item.createdAt))}
                        </Text>
                      </View>
                      <Text
                        style={[styles.historyAmount, { color: item.amount > 0 ? c.primaryStrong : c.textSecondary }]}
                      >
                        {item.amount > 0 ? `+${item.amount}` : item.amount}장
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SubScreen>
  );
}

/** 제출 상태 → 사용자 문구. */
function eventStatusLabel(item: StampEventSubmission): string {
  if (item.status === 'APPROVED') return `+${item.grantedAmount ?? 0}장`;
  if (item.status === 'REJECTED') return '반려';
  return '검토 중';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },

  balanceCard: { borderRadius: Radius.md, alignItems: 'center', paddingVertical: 36, marginBottom: 28 },
  stampIcon: { width: 40, height: 40, marginBottom: 14 },
  balanceNumber: { fontSize: 44, fontWeight: '700' },
  balanceUnit: { fontSize: 18, fontWeight: '400' },
  balanceHint: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 14 },

  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8 },

  eventCard: { borderRadius: Radius.md, padding: 18, marginBottom: 28 },
  eventTitle: { fontSize: 16, fontWeight: '700' },
  eventDesc: { fontSize: 13, lineHeight: 20, marginTop: 6 },
  eventInput: { height: 46, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, marginTop: 14 },
  eventSubmit: { height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  eventSubmitText: { fontSize: 14.5, fontWeight: '700' },
  eventPending: { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  eventPendingText: { fontSize: 13 },
  eventHistory: { marginTop: 14 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  eventUrl: { flex: 1, fontSize: 12.5 },
  eventStatus: { fontSize: 13, fontWeight: '700' },

  historyCard: { borderRadius: Radius.md, paddingHorizontal: 18 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  historyLabel: { fontSize: 15, fontWeight: '600' },
  historyDate: { fontSize: 12.5, marginTop: 3 },
  historyAmount: { fontSize: 15, fontWeight: '700' },
});
