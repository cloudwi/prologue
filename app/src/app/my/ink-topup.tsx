import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  endConnection,
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Product,
  type Purchase,
} from 'expo-iap';

import { SubScreen } from '@/components/sub-screen';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { getInkBalance, INK_PRICE, INK_PRODUCTS, redeemPurchase } from '@/lib/ink';

const STORE_PLATFORM = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
const SKUS = INK_PRODUCTS.map((p) => p.productId);

/**
 * 잉크 충전 — 스토어 결제로 잉크를 산다.
 *
 * 지급은 서버가 스토어에 물어 확인한 뒤에만 일어난다. 앱은 증표를 전달할 뿐이라,
 * 여기서 잔액을 직접 올리지 않고 서버가 알려준 잔액을 그대로 쓴다.
 *
 * 거래를 끝내는(finishTransaction) 시점이 중요하다. 서버 지급이 끝나기 전에 끝내면
 * 그 사이 서버가 실패했을 때 유저는 돈만 내고 잉크를 못 받는다. 반대로 끝내지 않으면
 * 스토어가 거래를 들고 있다가 다음 실행 때 다시 알려주므로, 실패는 재시도로 이어진다.
 */
export default function InkTopupScreen() {
  const c = useTheme();
  const [balance, setBalance] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  /**
   * 스토어가 알려준 거래 하나를 서버에 확인시키고 잉크를 받는다.
   * 서버가 지급을 마친 뒤에만 거래를 끝낸다 — 순서가 뒤집히면 돈만 내고 못 받는 일이 생긴다.
   */
  const redeem = useCallback(async (purchase: Purchase, silent = false) => {
    const token = purchase.purchaseToken;
    if (!token) {
      if (!silent) Alert.alert('결제를 확인하지 못했어요', '스토어에서 거래 정보를 받지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }
    try {
      const result = await redeemPurchase({
        platform: STORE_PLATFORM,
        productId: purchase.productId,
        token,
      });
      // 소모성이라 isConsumable — 끝내야 같은 상품을 다시 살 수 있다
      await finishTransaction({ purchase, isConsumable: true });
      if (result.granted > 0) track('topup_purchase_completed', { ink: result.granted });
      setBalance(result.balance);
      if (!silent && result.granted > 0) {
        Alert.alert('충전했어요', `잉크 ${result.granted}이 들어왔어요. 지금 ${result.balance}이에요.`);
      }
    } catch (e) {
      // 여기서 거래를 끝내지 않는다 — 스토어가 들고 있다가 다음 실행 때 다시 알려준다.
      if (!silent) {
        Alert.alert(
          '잉크를 받지 못했어요',
          e instanceof Error ? e.message : '결제는 완료됐어요. 앱을 다시 열면 자동으로 다시 시도해요.',
        );
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const subs: { remove: () => void }[] = [];

    (async () => {
      try {
        await initConnection();
        const fetched = await fetchProducts({ skus: [...SKUS], type: 'in-app' });
        if (active && Array.isArray(fetched)) setProducts(fetched as Product[]);

        subs.push(
          purchaseUpdatedListener((purchase) => {
            void redeem(purchase).finally(() => active && setBusy(null));
          }),
        );
        subs.push(
          purchaseErrorListener((error) => {
            if (!active) return;
            setBusy(null);
            // 사용자가 스스로 닫은 창까지 실패로 알리면 잔소리가 된다
            if (error?.code !== ErrorCode.UserCancelled) {
              Alert.alert('결제를 마치지 못했어요', error?.message ?? '잠시 후 다시 시도해주세요');
            }
          }),
        );

        // 지난번에 지급까지 가지 못한 거래가 있으면 조용히 이어서 처리한다
        const pending = await getAvailablePurchases();
        if (Array.isArray(pending)) {
          for (const p of pending) {
            if (SKUS.includes(p.productId as (typeof SKUS)[number])) await redeem(p, true);
          }
        }
      } catch {
        // 스토어에 붙지 못해도 화면은 살아 있어야 한다 — 잔액과 안내는 보인다
      } finally {
        if (active) setLoading(false);
      }
    })();

    track('topup_viewed');
    getInkBalance()
      .then((n) => active && setBalance(n))
      .catch(() => {});

    return () => {
      active = false;
      subs.forEach((s) => s.remove());
      void endConnection();
    };
  }, [redeem]);

  /** 스토어 결제창을 연다. 결과는 리스너로 돌아온다. */
  async function buy(productId: string) {
    if (busy) return;
    setBusy(productId);
    track('topup_purchase_started');
    try {
      await requestPurchase({
        request: { apple: { sku: productId }, google: { skus: [productId] } },
        type: 'in-app',
      });
    } catch (e) {
      setBusy(null);
      Alert.alert('결제를 열지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    }
  }

  return (
    <SubScreen title="잉크 충전" c={c}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.balanceCard, { backgroundColor: c.backgroundElement }]}>
          <Text style={[styles.balanceLabel, { color: c.textSecondary }]}>지금 가진 잉크</Text>
          <Text style={[styles.balanceValue, { color: c.text }]}>{balance ?? '—'}</Text>
        </View>

        <Text style={[styles.guide, { color: c.textSecondary }]}>
          편지 한 통에 {INK_PRICE.MAIL}, 사흘이 지난 프로필을 다시 여는 데 {INK_PRICE.PROFILE_UNLOCK}이 쓰여요.
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          INK_PRODUCTS.map((item) => {
            const store = products.find((p) => p.id === item.productId);
            const working = busy === item.productId;
            return (
              <Pressable
                key={item.productId}
                onPress={() => buy(item.productId)}
                disabled={busy != null || !store}
                accessibilityRole="button"
                accessibilityLabel={`잉크 ${item.ink} 충전하기`}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: c.backgroundElement,
                    borderColor: c.border,
                    opacity: pressed || busy != null ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="water" size={22} color={c.primaryStrong} />
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: c.text }]}>잉크 {item.ink}</Text>
                  {item.savingPercent > 0 && (
                    <Text style={[styles.cardSaving, { color: c.primaryStrong }]}>
                      {item.savingPercent}% 더 담아드려요
                    </Text>
                  )}
                </View>
                {working ? (
                  <ActivityIndicator color={c.primary} />
                ) : (
                  <Text style={[styles.cardPrice, { color: store ? c.text : c.textSecondary }]}>
                    {store?.displayPrice ?? '준비 중'}
                  </Text>
                )}
              </Pressable>
            );
          })
        )}

        {!loading && products.length === 0 && (
          <Text style={[styles.note, { color: c.textSecondary }]}>
            지금은 스토어에 연결하지 못했어요.{'\n'}잠시 후 다시 열어주세요.
          </Text>
        )}

        <Text style={[styles.note, { color: c.textSecondary }]}>
          충전한 잉크는 환불되지 않아요. 결제는 스토어 계정으로 이뤄지고,
          결제 내역과 환불 문의는 App Store·Google Play에서 확인하실 수 있어요.
        </Text>
      </ScrollView>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },

  balanceCard: { borderRadius: Radius.md, paddingVertical: 22, alignItems: 'center' },
  balanceLabel: { fontSize: 12.5 },
  balanceValue: { fontSize: 34, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 },

  guide: { fontSize: 13, lineHeight: 20, marginTop: 16, marginBottom: 18 },

  loading: { paddingVertical: 40, alignItems: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSaving: { fontSize: 12.5, fontWeight: '600', marginTop: 3 },
  cardPrice: { fontSize: 15.5, fontWeight: '700' },

  note: { fontSize: 12, lineHeight: 19, marginTop: 18 },
});
