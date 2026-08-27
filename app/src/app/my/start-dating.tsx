import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MIN_PHOTOS } from '@/components/photo-grid';
import { SubScreen } from '@/components/sub-screen';
import { LEGAL_VERSION } from '@/constants/legal';
import { Fonts, Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { completeOnboarding, getMyProfile, type Gender, type MemberProfile } from '@/lib/member';
import { toRequest } from '@/lib/profile-form';
import { SESSION_QUERY_KEY } from '@/lib/session';

/**
 * 소개팅 켜기 — 모임만 쓰던 회원이 문답과 편지 쪽 문을 여는 곳.
 *
 * 1.3부터 가입은 두 단으로 나뉜다. 모임만 하러 온 사람은 선호 성별을 비운 채 가입하고,
 * 그 빈칸이 그대로 소개팅 스위치가 된다(서버 PeerEligibility — 원하는 바가 없으면 오가지 않는다).
 * 이 화면이 그 빈칸을 채우는 단 하나의 자리다.
 *
 * 선호 성별은 성적 지향을 드러내는 민감정보(개인정보보호법 23조)라 별도 동의가 필요하다.
 * 가입 때 미리 받아두지 않은 이유가 이것이다 — 받지도 않을 정보의 동의를 미리 받아두는 것은
 * 최소수집 원칙에 어긋난다. 동의는 값을 처음 건네는 바로 이 순간에 받아 기록으로 쌓는다.
 */
export default function StartDatingScreen() {
  const c = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<MemberProfile | null>(null);
  const [preferredGender, setPreferredGender] = useState<Gender | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!active || !p) return;
        setBase(p);
        // 이미 켜져 있다면 지금 값을 보여준다 — 되돌아온 사람이 처음부터 고르지 않게.
        setPreferredGender(p.preferredGender);
        // 성별을 알고 있으니 반대 성별을 미리 짚어둔다. 고르는 수고 하나를 던다.
        if (p.preferredGender == null) setPreferredGender(p.gender === 'MALE' ? 'FEMALE' : 'MALE');
      } catch (e) {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 사진이 모자라면 소개가 시작되지 않는다(서버 PeerEligibility). 켜고 나서 조용히 아무 일도
  // 일어나지 않는 것보다, 켜기 전에 무엇이 남았는지 말해주는 편이 낫다.
  const photos = base?.photoUrls?.length ?? 0;
  const photosShort = base != null && photos < MIN_PHOTOS;
  const canSave = base != null && preferredGender != null && agreed;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await completeOnboarding(
        toRequest(base!, {
          preferredGender,
          // 이 동의가 서버에 새 기록으로 쌓인다 — 언제 무엇에 동의했는지가 순서대로 남아야 한다.
          consent: {
            legalVersion: LEGAL_VERSION,
            terms: true,
            privacy: true,
            age: true,
            sensitive: true,
            marketing: false,
          },
        }),
      );
      track('dating_enabled');
      // 잠겨 있던 탭들이 이 값 하나로 열린다 — 캐시를 비워 화면이 바로 바뀌게.
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ['daily'] });
      router.replace('/discover');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubScreen title="소개팅 시작하기" c={c} onSave={save} saveLabel="시작" saveDisabled={!canSave} saving={saving}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.lead, { color: c.text, fontFamily: Fonts.serif }]}>
            하루에 한 사람,{'\n'}문답으로 알아가는 소개가 시작돼요.
          </Text>
          <Text style={[styles.leadSub, { color: c.textSecondary }]}>
            매일 같은 질문에 답한 사람 중 한 명이 소개돼요. 마음이 닿으면 편지로 연락처를 건넬 수 있어요.
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.text }]}>어떤 분을 만나고 싶으세요?</Text>
            <GenderToggle value={preferredGender} onChange={setPreferredGender} c={c} />
          </View>

          {/* 민감정보 동의 — 여기서만 받는다. 체크 없이는 값을 보내지 않는다. */}
          <Pressable
            onPress={() => setAgreed((v) => !v)}
            style={({ pressed }) => [
              styles.consent,
              { borderColor: agreed ? c.primary : c.border, backgroundColor: c.backgroundElement, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons
              name={agreed ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={agreed ? c.primary : c.textSecondary}
            />
            <View style={styles.consentBody}>
              <Text style={[styles.consentTitle, { color: c.text }]}>
                <Text style={{ color: c.primaryStrong }}>[필수] </Text>
                민감정보 수집·이용에 동의합니다
              </Text>
              <Text style={[styles.consentHint, { color: c.textSecondary }]}>
                만나고 싶은 성별은 성적 지향을 드러낼 수 있어 민감정보로 다뤄요. 소개 상대를 고르는 데에만 쓰고,
                프로필에는 공개되지 않아요.
              </Text>
            </View>
          </Pressable>

          {photosShort && (
            <Pressable
              onPress={() => router.push('/my/edit-photos')}
              style={({ pressed }) => [styles.notice, { borderColor: c.border, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.noticeTitle, { color: c.text }]}>사진이 {MIN_PHOTOS}장 이상 필요해요</Text>
              <Text style={[styles.noticeHint, { color: c.textSecondary }]}>
                지금 {photos}장이에요. 사진이 모자라면 소개가 시작되지 않아요. 탭해서 올리러 가기
              </Text>
            </Pressable>
          )}

          <Text style={[styles.foot, { color: c.textSecondary }]}>
            언제든 MY에서 다시 끌 수 있어요. 끄면 소개가 멈추고 모임만 남아요.
          </Text>
        </ScrollView>
      )}
    </SubScreen>
  );
}

function GenderToggle({
  value,
  onChange,
  c,
}: {
  value: Gender | null;
  onChange: (g: Gender) => void;
  c: ThemeColors;
}) {
  const options: { key: Gender; label: string }[] = [
    { key: 'MALE', label: '남성' },
    { key: 'FEMALE', label: '여성' },
  ];
  return (
    <View style={styles.toggleRow}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={({ pressed }) => [
              styles.toggle,
              {
                backgroundColor: on ? c.primary : c.backgroundElement,
                borderColor: on ? c.primary : c.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ color: on ? c.primaryText : c.text, fontSize: 16, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  lead: { fontSize: 22, fontWeight: '700', lineHeight: 33 },
  leadSub: { fontSize: 15, lineHeight: 23, marginTop: 12 },
  field: { marginTop: 32 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggle: { flex: 1, height: 50, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  consent: { flexDirection: 'row', gap: 12, marginTop: 26, padding: 16, borderWidth: 1, borderRadius: Radius.sm },
  consentBody: { flex: 1 },
  consentTitle: { fontSize: 15, fontWeight: '600' },
  consentHint: { fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  notice: { marginTop: 16, padding: 16, borderWidth: 1, borderRadius: Radius.sm },
  noticeTitle: { fontSize: 15, fontWeight: '600' },
  noticeHint: { fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  foot: { fontSize: 13, lineHeight: 20, marginTop: 24, textAlign: 'center' },
});
