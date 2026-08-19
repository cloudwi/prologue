import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { getReferral, redeemReferral, type Referral } from '@/lib/referral';

/**
 * 친구 초대 — 내 코드 한 줄과 공유 버튼, 그리고 친구 코드를 넣는 칸.
 * 소개팅은 친구가 친구를 데려오는 구조라, 이 화면이 초기 유입의 대부분을 맡는다.
 */
export default function InviteScreen() {
  const c = useTheme();
  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    getReferral()
      .then(setReferral)
      .catch((e) => Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요'))
      .finally(() => setLoading(false));
  }, []);

  async function share() {
    if (!referral) return;
    track('referral_share_opened');
    await Share.share({
      message:
        `하루 한 문답으로 만나는 소개팅, 프롤로그에 초대할게요.\n` +
        `가입 후 MY > 친구 초대에서 내 코드 ${referral.code} 를 넣으면 우리 둘 다 잉크 ${referral.rewardInk}을 받아요.\n` +
        referral.shareUrl,
    });
  }

  async function redeem() {
    if (!code.trim() || redeeming) return;
    setRedeeming(true);
    try {
      const result = await redeemReferral(code);
      track('referral_redeemed', { inkGranted: result.inkGranted });
      setReferral((r) => (r ? { ...r, redeemed: true } : r));
      setCode('');
      Alert.alert('초대 코드를 썼어요', `잉크 ${result.inkGranted}을 받았어요. 초대한 친구에게도 같은 잉크가 갔어요.`);
    } catch (e) {
      Alert.alert('코드를 쓰지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <SubScreen title="친구 초대" c={c}>
      {loading || !referral ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            <Text style={[styles.eyebrow, { color: c.primaryStrong }]}>내 초대 코드</Text>
            {/* 코드를 누르면 공유 시트 — 클립보드 네이티브 모듈을 새로 들이지 않고도(OTA로 나갈 수 있게) 건넬 수 있다 */}
            <Pressable onPress={share} hitSlop={8} accessibilityRole="button" accessibilityLabel="초대 코드 공유">
              <Text style={[styles.code, { color: c.text, fontFamily: Fonts.serif }]} selectable>{referral.code}</Text>
              <Text style={[styles.copyHint, { color: c.textSecondary }]}>길게 눌러 복사하거나, 아래 버튼으로 보내세요</Text>
            </Pressable>
            <Text style={[styles.desc, { color: c.textSecondary }]}>
              친구가 가입 후 7일 안에 이 코드를 넣으면{'\n'}친구도 나도 잉크 {referral.rewardInk}을 받아요.
            </Text>
            <Pressable
              onPress={share}
              accessibilityRole="button"
              style={({ pressed }) => [styles.shareBtn, { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="paper-plane-outline" size={16} color={c.primaryText} />
              <Text style={[styles.shareText, { color: c.primaryText }]}>초대 링크 보내기</Text>
            </Pressable>
            <Text style={[styles.count, { color: c.textSecondary }]}>
              지금까지 {referral.invitedCount}명이 내 코드로 들어왔어요
              {referral.invitedCount >= referral.maxRewardedInvites ? ` · 보상은 ${referral.maxRewardedInvites}명까지예요` : ''}
            </Text>
          </View>

          {!referral.redeemed && (
            <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.eyebrow, { color: c.primaryStrong }]}>친구에게 코드를 받았나요?</Text>
              <Text style={[styles.desc, { color: c.textSecondary, marginTop: 6 }]}>
                가입 후 7일 안에 한 번만 쓸 수 있어요.
              </Text>
              <View style={styles.redeemRow}>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  placeholder="예: P7K3MQ"
                  placeholderTextColor={c.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  returnKeyType="done"
                  onSubmitEditing={redeem}
                  style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: Fonts.serif }]}
                />
                <Pressable
                  onPress={redeem}
                  disabled={!code.trim() || redeeming}
                  style={[styles.redeemBtn, { backgroundColor: c.text, opacity: !code.trim() || redeeming ? 0.4 : 1 }]}
                >
                  {redeeming ? (
                    <ActivityIndicator color={c.background} />
                  ) : (
                    <Text style={[styles.redeemText, { color: c.background }]}>쓰기</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  card: { borderRadius: Radius.md, padding: 22, alignItems: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  code: { fontSize: 40, fontWeight: '700', letterSpacing: 6, marginTop: 14, textAlign: 'center' },
  copyHint: { fontSize: 12, textAlign: 'center', marginTop: 2 },
  desc: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 14 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 22, borderRadius: Radius.pill, marginTop: 18 },
  shareText: { fontSize: 15, fontWeight: '700' },
  count: { fontSize: 12.5, marginTop: 14, textAlign: 'center' },
  redeemRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignSelf: 'stretch' },
  input: { flex: 1, height: 48, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: 18, letterSpacing: 3, textAlign: 'center' },
  redeemBtn: { width: 72, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  redeemText: { fontSize: 15, fontWeight: '700' },
});
