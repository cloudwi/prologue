import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getStampWallet, stampReasonLabel, type StampWallet } from '@/lib/stamps';

/**
 * 우표 지갑 — 잔액과 증감 내역. 재화는 매칭 메뉴가 아니라 제 방을 가진다.
 * 충전 버튼은 출시 후 IAP와 함께 이 화면에 붙는다.
 */
export default function StampsScreen() {
  const c = useTheme();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<StampWallet | null>(null);

  useEffect(() => {
    let active = true;
    getStampWallet()
      .then((w) => active && setWallet(w))
      .catch((e) => {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });

  return (
    <SubScreen title="우표" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* 잔액 — 이 화면의 주인공. 숫자 하나를 크게. */}
          <View style={[styles.balanceCard, { backgroundColor: c.backgroundElement }]}>
            <Text style={[styles.balanceNumber, { color: c.text, fontFamily: Fonts.serif }]}>
              {wallet?.balance ?? 0}
              <Text style={[styles.balanceUnit, { color: c.textSecondary }]}> 장</Text>
            </Text>
            <Text style={[styles.balanceHint, { color: c.textSecondary }]}>
              대화 신청 한 번에 우표 1장이 쓰여요.{'\n'}충전은 출시 후에 열릴 예정이에요.
            </Text>
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
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },

  balanceCard: { borderRadius: Radius.md, alignItems: 'center', paddingVertical: 36, marginBottom: 28 },
  balanceNumber: { fontSize: 44, fontWeight: '700' },
  balanceUnit: { fontSize: 18, fontWeight: '400' },
  balanceHint: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 14 },

  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8 },
  historyCard: { borderRadius: Radius.md, paddingHorizontal: 18 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  historyLabel: { fontSize: 15, fontWeight: '600' },
  historyDate: { fontSize: 12.5, marginTop: 3 },
  historyAmount: { fontSize: 15, fontWeight: '700' },
});
