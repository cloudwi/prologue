import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProfileExtraFields, toProfilePayload, type ProfileExtra } from '@/components/profile-extra-fields';
import { SubScreen } from '@/components/sub-screen';
import { completeOnboarding, getMyProfile, type MemberProfile } from '@/lib/member';
import { toRequest } from '@/lib/profile-form';
import { useTheme } from '@/hooks/use-theme';

const EMPTY: ProfileExtra = { avatarId: null, bio: '', height: '', hobbies: [], interests: [], strengths: [] };

export default function EditDetailScreen() {
  const c = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<MemberProfile | null>(null);
  const [extra, setExtra] = useState<ProfileExtra>(EMPTY);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!active || !p) return;
        setBase(p);
        setExtra({
          avatarId: p.avatarId ?? null,
          bio: p.bio ?? '',
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
    setSaving(true);
    try {
      await completeOnboarding(toRequest(base, toProfilePayload(extra)));
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
  lead: { fontSize: 14, lineHeight: 21, marginBottom: 20 },
});
