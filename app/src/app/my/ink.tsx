import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Skeleton, SkeletonCard, SkeletonList, SkeletonRow } from '@/components/skeleton';
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
        <SkeletonList c={c}>
          {/* 잔액 카드 — 이 화면의 주인공. 아이콘 하나와 큰 숫자, 그 아래 설명 두 줄. */}
          <SkeletonCard c={c} background={c.backgroundElement}>
            <View style={styles.skeletonBalance}>
              <Skeleton c={c} width={36} height={36} radius={18} />
              <Skeleton c={c} width={92} height={42} style={styles.skeletonBalanceNumber} />
              <Skeleton c={c} width="84%" height={12} style={styles.skeletonBalanceHint} />
              <Skeleton c={c} width="62%" height={12} style={styles.skeletonBalanceLine} />
            </View>
          </SkeletonCard>
          {/* 충전 버튼은 실제로도 면 하나다 — 흉내낼 결이 없다. */}
          <Skeleton c={c} height={52} radius={Radius.md} />
          <SkeletonRow c={c} />
          <SkeletonRow c={c} />
        </SkeletonList>
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
              편지 한 통에 잉크 {INK_PRICE.MAIL}(서로 호감이면 {INK_PRICE.MAIL_MUTUAL}, 답장은 {INK_PRICE.MAIL_REPLY}),{'\n'}3일이 지난 프로필을 다시 여는 데 {INK_PRICE.PROFILE_UNLOCK}이 쓰여요.
            </Text>
            {/* 무료로도 고이는 길 — 지갑을 열어본 사람에게 "돈을 안 내도 쓸 수 있다"를 여기서 말한다 */}
            <Text style={[styles.balanceHint, { color: c.textSecondary, marginTop: 6 }]}>
              오늘의 질문에 답을 남기면 하루 한 번 잉크 {INK_PRICE.DAILY_ANSWER}이 고여요.
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

          {/* 친구 초대 — 무료로 고이는 길 중 가장 큰 것. 지갑에서 바로 보인다. */}
          <Pressable
            onPress={() => router.push('/my/invite')}
            style={({ pressed }) => [
              styles.eventEntry,
              { backgroundColor: c.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.flex}>
              <Text style={[styles.eventEntryLabel, { color: c.text }]}>친구 초대</Text>
              <Text style={[styles.eventEntryHint, { color: c.textSecondary }]}>친구가 내 코드로 들어오면 둘 다 잉크 100</Text>
            </View>
            <Text style={[styles.chevron, { color: c.textSecondary }]}>›</Text>
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

  skeletonBalance: { alignItems: 'center', paddingVertical: 18 },
  skeletonBalanceNumber: { marginTop: 14 },
  skeletonBalanceHint: { marginTop: 18 },
  skeletonBalanceLine: { marginTop: 9 },
  balanceCard: { borderRadius: Radius.md, alignItems: 'center', paddingVertical: 36, marginBottom: 14 },
  inkIcon: { marginBottom: 14 },
  balanceNumber: { fontSize: 44, fontWeight: '700' },
  balanceHint: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 14 },

  topupBtn: {
    height: 50,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  topupText: { fontSize: 16.5, fontWeight: '700' },

  eventEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 28,
  },
  eventEntryLabel: { fontSize: 16, fontWeight: '600' },
  eventEntryHint: { fontSize: 13.5, marginTop: 3 },
  chevron: { fontSize: 20, fontWeight: '300' },

  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8 },
  historyCard: { borderRadius: Radius.md, paddingHorizontal: 18 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  historyLabel: { fontSize: 16, fontWeight: '600' },
  historyDate: { fontSize: 13.5, marginTop: 3 },
  historyAmount: { fontSize: 16, fontWeight: '700' },
});
