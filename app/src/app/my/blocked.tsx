import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { SkeletonCards } from '@/components/skeleton';
import { PlaceholderInput } from '@/components/placeholder-input';
import { SubScreen } from '@/components/sub-screen';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addPhoneBlock, getBlocks, removePhoneBlock, setSameCompanyBlock, type Blocks } from '@/lib/blocks';

/**
 * 지인 차단 — 아는 사람이 "오늘의 상대"로 오가지 않게 한다.
 * ① 같은 회사: 직장 인증 도메인이 같은 사람을 서로 숨긴다(어느 한쪽이 켜면 양쪽 다).
 * ② 전화번호: 아는 번호를 등록하면 그 번호로 가입한(할) 사람과 서로 소개되지 않는다.
 * 상대는 차단 사실을 알 수 없다 — 그냥 소개가 일어나지 않을 뿐이다.
 */
export default function BlockedScreen() {
  const c = useTheme();
  const [blocks, setBlocks] = useState<Blocks | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getBlocks()
        .then((b) => active && setBlocks(b))
        .catch(() => active && Alert.alert('불러오기 실패', '잠시 후 다시 시도해주세요'));
      return () => {
        active = false;
      };
    }, []),
  );

  async function toggleSameCompany(enabled: boolean) {
    if (!blocks || busy) return;
    setBusy(true);
    // 스위치는 즉시 움직여야 스위치다 — 실패하면 되돌린다.
    setBlocks({ ...blocks, sameCompany: enabled });
    try {
      setBlocks(await setSameCompanyBlock(enabled));
    } catch (e) {
      setBlocks(blocks);
      Alert.alert('변경하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
  }

  async function addPhone() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || busy) return;
    setBusy(true);
    try {
      setBlocks(await addPhoneBlock(digits));
      setPhone('');
    } catch (e) {
      Alert.alert('차단하지 못했어요', e instanceof Error ? e.message : '번호를 확인해주세요');
    } finally {
      setBusy(false);
    }
  }

  async function removePhone(phoneHash: string, masked: string) {
    Alert.alert('차단 해제', `${masked} 번호의 차단을 해제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        style: 'destructive',
        onPress: async () => {
          try {
            setBlocks(await removePhoneBlock(phoneHash));
          } catch {
            Alert.alert('해제하지 못했어요', '잠시 후 다시 시도해주세요');
          }
        },
      },
    ]);
  }

  const phoneValid = phone.replace(/\D/g, '').length >= 10;

  return (
    <SubScreen title="지인 차단" c={c}>
      {blocks == null ? (
        <SkeletonCards c={c} count={3} height={72} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.desc, { color: c.textSecondary }]}>
            차단한 사람과는 서로 오늘의 상대로 소개되지 않아요.{'\n'}상대는 차단된 사실을 알 수 없어요.
          </Text>

          {/* 같은 회사 — 회사 사람에게 프로필이 보일까 봐가 가장 흔한 망설임이다. */}
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>같은 회사</Text>
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            {blocks.jobDomain ? (
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text style={[styles.rowLabel, { color: c.text }]}>같은 회사 사람 서로 숨기기</Text>
                  <Text style={[styles.rowSub, { color: c.textSecondary }]}>
                    {blocks.jobDomain}(으)로 인증한 사람과 서로 소개되지 않아요
                  </Text>
                </View>
                <Switch
                  value={blocks.sameCompany}
                  onValueChange={toggleSameCompany}
                  trackColor={{ true: c.primary }}
                  disabled={busy}
                />
              </View>
            ) : (
              <Pressable onPress={() => router.push('/my/job-verify')} style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text style={[styles.rowLabel, { color: c.text }]}>같은 회사 사람 서로 숨기기</Text>
                  <Text style={[styles.rowSub, { color: c.textSecondary }]}>
                    직장 인증을 하면 켤 수 있어요 — 같은 회사인지 알려면 회사 도메인이 필요해요
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* 전화번호 — 회원이 아니어도 미리 막아둘 수 있다(그 번호로 가입하는 순간부터 서로 안 보인다). */}
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>전화번호</Text>
          <View style={styles.addRow}>
            <PlaceholderInput
              value={phone}
              onChangeText={setPhone}
              placeholder="010-0000-0000"
              placeholderTextColor={c.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
            />
            <Pressable
              onPress={addPhone}
              disabled={!phoneValid || busy}
              style={[styles.addBtn, { backgroundColor: c.primary, opacity: !phoneValid || busy ? 0.4 : 1 }]}
            >
              <Text style={[styles.addBtnText, { color: c.primaryText }]}>차단</Text>
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            번호는 그대로 저장되지 않고 암호화된 형태로만 남아요.
          </Text>

          {blocks.phones.length === 0 ? (
            <Text style={[styles.empty, { color: c.textSecondary }]}>아직 차단한 번호가 없어요.</Text>
          ) : (
            <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
              {blocks.phones.map((p, i) => (
                <View
                  key={p.phoneHash}
                  style={[styles.phoneRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}
                >
                  <Text style={[styles.phoneText, { color: c.text }]}>{p.phoneMasked}</Text>
                  <Pressable onPress={() => removePhone(p.phoneHash, p.phoneMasked)} hitSlop={8}>
                    <Text style={[styles.removeText, { color: c.textSecondary }]}>해제</Text>
                  </Pressable>
                </View>
              ))}
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
  content: { padding: 20, paddingBottom: 48 },
  desc: { fontSize: 14.5, lineHeight: 22, marginBottom: 24 },
  sectionTitle: { fontSize: 13.5, fontWeight: '600', marginBottom: 8 },
  card: { borderRadius: Radius.md, marginBottom: 24 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontSize: 15.5, fontWeight: '600' },
  rowSub: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  addRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 50, borderRadius: Radius.md, paddingHorizontal: 14, fontSize: 16 },
  addBtn: { height: 50, paddingHorizontal: 20, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 15.5, fontWeight: '700' },
  hint: { fontSize: 12.5, marginTop: 8, marginBottom: 16 },
  empty: { fontSize: 14, marginTop: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  phoneText: { fontSize: 15.5, fontVariant: ['tabular-nums'] },
  removeText: { fontSize: 14, fontWeight: '600' },
});
