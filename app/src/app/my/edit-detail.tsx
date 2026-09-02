import { useRouter } from 'expo-router';
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
  View,
} from 'react-native';

import { ProfileExtraFields, toProfilePayload, type ProfileExtra } from '@/components/profile-extra-fields';
import { EMPTY_FACTS, hasBeliefs, ProfileFactsFields, type ProfileFacts } from '@/components/profile-facts';
import { SubScreen } from '@/components/sub-screen';
import {
  completeOnboarding,
  getBeliefs,
  getMyProfile,
  updateBeliefs,
  updateLifestyle,
  type MemberProfile,
} from '@/lib/member';
import { LEGAL_VERSION } from '@/constants/legal';
import { toRequest } from '@/lib/profile-form';
import { useTheme } from '@/hooks/use-theme';

const EMPTY: ProfileExtra = { bio: '', avatarId: null, height: '', hobbies: [], interests: [], strengths: [] };

export default function EditDetailScreen() {
  const c = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<MemberProfile | null>(null);
  const [extra, setExtra] = useState<ProfileExtra>(EMPTY);
  /** 한 줄로 답하는 항목들 — 담배·술·만나는 빈도·종교·정치. 저장 경로가 프로필과 다르다. */
  const [facts, setFacts] = useState<ProfileFacts>(EMPTY_FACTS);
  const [consented, setConsented] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, beliefs] = await Promise.all([
          getMyProfile(),
          // 동의 기록 여부만 필요하다 — 실패해도 화면은 뜨고, 저장할 때 서버가 다시 판정한다.
          getBeliefs().catch(() => null),
        ]);
        if (!active || !p) return;
        setBase(p);
        setConsented(beliefs?.consented ?? false);
        setFacts({
          smoking: p.smoking ?? null,
          drinking: p.drinking ?? null,
          meetFrequency: p.meetFrequency ?? null,
          religion: p.religion ?? null,
          politicalLeaning: p.politicalLeaning ?? null,
        });
        setExtra({
          bio: p.bio ?? '',
          avatarId: p.avatarId ?? null,
          height: p.heightCm != null ? String(p.heightCm) : '',
          hobbies: p.hobbies ?? [],
          interests: p.interests ?? [],
          strengths: p.strengths ?? [],
        });
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

  async function save() {
    if (!base || saving) return;
    if (hasBeliefs(facts) && !consented && !consentChecked) {
      Alert.alert('동의가 필요해요', '종교·정치 성향은 민감정보라, 수집·이용에 동의해야 프로필에 적을 수 있어요.');
      return;
    }
    setSaving(true);
    try {
      /*
       * 세 갈래로 나눠 저장한다. 프로필은 전체 덮어쓰기(PUT /members/me)라 생활 습관과 신념을
       * 거기 실을 수 없고(항목을 모르는 화면의 저장 한 번에 지워진다), 신념은 동의까지 함께
       * 다뤄야 해서 경로가 또 다르다. 화면은 하나여도 길은 셋이다.
       */
      await completeOnboarding(toRequest(base, toProfilePayload(extra)));
      await updateLifestyle({
        smoking: facts.smoking,
        drinking: facts.drinking,
        meetFrequency: facts.meetFrequency,
      });
      await updateBeliefs({
        religion: facts.religion,
        politicalLeaning: facts.politicalLeaning,
        consent: consentChecked || undefined,
        legalVersion: consentChecked ? LEGAL_VERSION : undefined,
      });
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubScreen title="상세 프로필" c={c} onSave={save} saveDisabled={!base} saving={saving}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.lead, { color: c.textSecondary }]}>
              모두 선택 항목이에요. 채울수록 대화가 시작될 지점이 늘어나요.
            </Text>
            <ProfileExtraFields
              value={extra}
              onChange={(patch) => setExtra((prev) => ({ ...prev, ...patch }))}
              c={c}
            />
            <ProfileFactsFields
              value={facts}
              onChange={(patch) => setFacts((prev) => ({ ...prev, ...patch }))}
              consented={consented}
              consentChecked={consentChecked}
              onConsentChange={setConsentChecked}
              c={c}
            />
            {/* 미리보기는 행으로 세우지 않고 채우는 자리 끝에 둔다 — 다 적고 나서 확인하는 게 순서다. */}
            <Pressable onPress={() => router.push('/my/preview')} hitSlop={8} style={styles.previewLink}>
              <Text style={[styles.previewLinkText, { color: c.primaryStrong }]}>상대에게 어떻게 보이는지 보기 →</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  lead: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  previewLink: { alignItems: 'center', paddingVertical: 14 },
  previewLinkText: { fontSize: 14, fontWeight: '600' },
});
