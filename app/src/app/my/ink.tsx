import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getInkWallet, inkReasonLabel, INK_PRICE, type InkWallet } from '@/lib/ink';

/**
 * 잉크 지갑 — 잔액과 증감 내역. 재화는 매칭 메뉴가 아니라 제 방을 가진다.
 * 이벤트는 하위 화면(my/events)으로 한 뎁스 내렸다 — 이벤트가 늘어도 지갑은 조용하게.
 */
export default function InkScreen() {
  const c = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<InkWallet | null>(null);

  // 이벤트 화면에서 돌아왔을 때 지급된 잉크가 바로 보이도록 포커스마다 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getInkWallet()
        .then((w) => active && setWallet(w))
        .catch(() => {})
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, []),
  );

  const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });

  return (
    <SubScreen title="잉크" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* 잔액 — 이 화면의 주인공. 숫자 하나를 크게. */}
          <View style={[styles.balanceCard, { backgroundColor: c.backgroundElement }]}>
            {/* 재화는 잉크다 — 우표는 편지를 부치는 행위의 은유로 따로 남는다 */}
            <Ionicons name="water" size={36} color={c.primaryStrong} style={styles.inkIcon} />
            <Text style={[styles.balanceNumber, { color: c.text, fontFamily: Fonts.serif }]}>
              {wallet?.balance ?? 0}
            </Text>
            <Text style={[styles.balanceHint, { color: c.textSecondary }]}>
              편지 한 통에 잉크 {INK_PRICE.MAIL},{'\n'}사흘이 지난 프로필을 다시 여는 데 {INK_PRICE.PROFILE_UNLOCK}이 쓰여요.
            </Text>
          </View>

          {/* 충전 — 잔액 바로 아래. 모자란 걸 확인한 자리에서 채울 수 있어야 한다. */}
          <Pressable
            onPress={() => router.push('/my/ink-topup')}
            accessibilityRole="button"
            accessibilityLabel="잉크 충전하기"
            style={({ pressed }) => [styles.topupBtn, { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={[styles.topupText, { color: c.primaryText }]}>잉크 충전</Text>
          </Pressable>

          {/* 이벤트 — 자세한 건 하위 화면에서. 지갑에는 문 하나만 둔다. */}
          <Pressable
            onPress={() => router.push('/my/events')}
            style={({ pressed }) => [
              styles.eventEntry,
              { backgroundColor: c.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.flex}>
              <Text style={[styles.eventEntryLabel, { color: c.text }]}>이벤트</Text>
              <Text style={[styles.eventEntryHint, { color: c.textSecondary }]}>참여하고 잉크를 선물로 받아보세요</Text>
            </View>
            <Text style={[styles.chevron, { color: c.textSecondary }]}>›</Text>
          </Pressable>

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
                      <Text style={[styles.historyLabel, { color: c.text }]}>{inkReasonLabel(item.reason)}</Text>
                      <Text style={[styles.historyDate, { color: c.textSecondary }]}>
                        {dateFmt.format(new Date(item.createdAt))}
                      </Text>
                    </View>
                    <Text
                      style={[styles.historyAmount, { color: item.amount > 0 ? c.primaryStrong : c.textSecondary }]}
                    >
                      {item.amount > 0 ? `+${item.amount}` : item.amount}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },

  balanceCard: { borderRadius: Radius.md, alignItems: 'center', paddingVertical: 36, marginBottom: 14 },
  inkIcon: { marginBottom: 14 },
  balanceNumber: { fontSize: 44, fontWeight: '700' },
  balanceHint: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 14 },

  topupBtn: {
    height: 50,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  topupText: { fontSize: 15.5, fontWeight: '700' },

  eventEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 28,
  },
  eventEntryLabel: { fontSize: 15, fontWeight: '600' },
  eventEntryHint: { fontSize: 12.5, marginTop: 3 },
  chevron: { fontSize: 20, fontWeight: '300' },

  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8 },
  historyCard: { borderRadius: Radius.md, paddingHorizontal: 18 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  historyLabel: { fontSize: 15, fontWeight: '600' },
  historyDate: { fontSize: 12.5, marginTop: 3 },
  historyAmount: { fontSize: 15, fontWeight: '700' },
});
