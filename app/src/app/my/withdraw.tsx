import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearTokens } from '@/lib/auth-storage';
import { deleteAccount } from '@/lib/member';

/**
 * 회원 탈퇴 — 계정과 모든 흔적을 되돌릴 수 없게 지운다(앱스토어 5.1.1).
 * 무엇이 사라지는지 먼저 보여주고, 파괴적 확인을 거친 뒤에만 실행한다.
 */
export default function WithdrawScreen() {
  const c = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function withdraw() {
    setBusy(true);
    try {
      await deleteAccount();
      await clearTokens();
      Alert.alert('탈퇴가 완료됐어요', '프롤로그의 기록이 모두 지워졌어요. 좋은 인연이 닿기를 바랄게요.', [
        { text: '확인', onPress: () => router.replace('/') },
      ]);
    } catch (e) {
      Alert.alert('탈퇴하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
  }

  function confirmWithdraw() {
    if (busy) return;
    Alert.alert('정말 탈퇴할까요?', '지워진 기록은 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴하기', style: 'destructive', onPress: () => void withdraw() },
    ]);
  }

  return (
    <SubScreen title="회원 탈퇴" c={c}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lead, { color: c.text, fontFamily: Fonts.serif }]}>
          탈퇴하면 아래 기록이{'\n'}즉시, 되돌릴 수 없게 지워져요.
        </Text>

        <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
          <Item c={c} text="프로필과 사진 전부" />
          <Item c={c} text="매일 남긴 답변과 프로필 문답" />
          <Item c={c} text="주고받은 호감과 편지 (상대의 편지함에서도 사라져요)" />
          <Item c={c} text="남은 잉크와 사용 내역" last />
        </View>

        <Text style={[styles.note, { color: c.textSecondary }]}>
          같은 이메일로 다시 가입할 수는 있지만, 지워진 기록은 복구되지 않아요.
        </Text>

        <Pressable
          onPress={confirmWithdraw}
          disabled={busy}
          accessibilityRole="button"
          style={[styles.submit, { borderColor: c.primaryStrong, opacity: busy ? 0.5 : 1 }]}
        >
          <Text style={[styles.submitText, { color: c.primaryStrong }]}>
            {busy ? '지우는 중...' : '모두 지우고 탈퇴하기'}
          </Text>
        </Pressable>
      </ScrollView>
    </SubScreen>
  );
}

function Item({ c, text, last = false }: { c: ThemeColors; text: string; last?: boolean }) {
  return (
    <View style={[styles.item, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
      <Text style={[styles.itemText, { color: c.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  lead: { fontSize: 20, fontWeight: '700', lineHeight: 30, marginTop: 12, marginBottom: 22 },
  card: { borderRadius: Radius.md, paddingHorizontal: 18 },
  item: { paddingVertical: 16 },
  itemText: { fontSize: 15.5, lineHeight: 22 },
  note: { fontSize: 14, lineHeight: 21, marginTop: 14 },
  submit: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  submitText: { fontSize: 16.5, fontWeight: '700' },
});
