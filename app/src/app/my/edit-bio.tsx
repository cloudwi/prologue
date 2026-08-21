import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaceholderInput } from '@/components/placeholder-input';
import { SubScreen } from '@/components/sub-screen';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { completeOnboarding, getMyProfile, type MemberProfile } from '@/lib/member';
import { toRequest } from '@/lib/profile-form';

const BIO_MAX = 300;
// 쓰기로 했다면 인사 한 문단은 되도록 — 서버와 같은 값. 비워두는 것은 자유다.
const BIO_MIN = 30;

/**
 * 자기소개 — 프로필 편지의 첫 문단.
 *
 * 문답이 나를 대신 말해주지만, 상대가 프로필을 열었을 때 가장 먼저 읽히는 건 이 글이다.
 * 빈 상자 앞에서 얼어붙지 않게 예시를 보여주고, 인사처럼 가볍게 쓰게 둔다.
 */
export default function EditBioScreen() {
  const c = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<MemberProfile | null>(null);
  const [bio, setBio] = useState('');

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((p) => {
        if (!active || !p) return;
        setBase(p);
        setBio(p.bio ?? '');
      })
      .catch((e) => active && Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (!base || saving) return;
    setSaving(true);
    try {
      await completeOnboarding(toRequest(base, { bio: bio.trim() || null }));
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubScreen
      title="자기소개"
      c={c}
      onSave={save}
      saveDisabled={!base || bio === (base.bio ?? '') || (bio.trim().length > 0 && bio.trim().length < BIO_MIN)}
      saving={saving}
    >
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.lead, { color: c.textSecondary }]}>
              상대가 내 프로필을 열면 ‘안녕하세요,’ 다음에 가장 먼저 읽는 글이에요.{'\n'}
              인사처럼 가볍게, 나답게. 문답이 나머지를 대신 말해줄 거예요.
            </Text>
            <PlaceholderInput
              value={bio}
              onChangeText={setBio}
              placeholder="예: 주말엔 한강에서 달리고, 평일 밤엔 책 한 권을 끼고 살아요."
              placeholderTextColor={c.textSecondary}
              multiline
              autoFocus
              maxLength={BIO_MAX}
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
            />
            <Text style={[styles.counter, { color: c.textSecondary }]}>
              {bio.trim().length > 0 && bio.trim().length < BIO_MIN ? `${BIO_MIN}자 이상 · ` : ''}
              {bio.length}/{BIO_MAX}
            </Text>
            <Text style={[styles.tip, { color: c.textSecondary }]}>
              팁 — 무엇을 좋아하는지, 요즘 어떻게 지내는지, 어떤 사람을 만나고 싶은지 중 하나만 골라도 충분해요.
            </Text>
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
  lead: { fontSize: 15, lineHeight: 22, marginBottom: 18 },
  input: { minHeight: 200, borderRadius: Radius.md, borderWidth: 1, padding: 16, fontSize: 17, lineHeight: 26, textAlignVertical: 'top' },
  counter: { fontSize: 13, textAlign: 'right', marginTop: 6 },
  tip: { fontSize: 13.5, lineHeight: 20, marginTop: 18 },
});
