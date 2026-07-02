import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RegionPicker } from '@/components/region-picker';
import { ProfileExtraFields, toProfilePayload, type ProfileExtra } from '@/components/profile-extra-fields';
import { Colors, Fonts, type ThemeColors } from '@/constants/theme';
import { completeOnboarding, type Gender } from '@/lib/member';

const EMPTY_EXTRA: ProfileExtra = { bio: '', height: '', bodyType: null, hobbies: [], interests: [], strengths: [] };

/** 닉네임 placeholder 예시 풀 (화면 진입 시 랜덤). */
const NICKNAME_EXAMPLES = [
  '봄날의곰', '책읽는여우', '느긋한고양이', '바다보는사람', '새벽의산책',
  '조용한위로', '별보는밤', '따뜻한문장', '오후의햇살', '깊은밤라디오',
];

export default function OnboardingScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [preferredGender, setPreferredGender] = useState<Gender | null>(null);
  const [region, setRegion] = useState('');
  const [extra, setExtra] = useState<ProfileExtra>(EMPTY_EXTRA);
  const [submitting, setSubmitting] = useState(false);
  // 화면 진입 시 한 번 랜덤으로 고정되는 예시 닉네임
  const [namePlaceholder] = useState(
    () => NICKNAME_EXAMPLES[Math.floor(Math.random() * NICKNAME_EXAMPLES.length)],
  );

  const age = /^\d{4}$/.test(birthYear) ? new Date().getFullYear() - Number(birthYear) : null;

  const canSubmit =
    nickname.trim().length > 0 &&
    gender != null &&
    /^\d{4}$/.test(birthYear) &&
    preferredGender != null &&
    region.trim().length > 0;

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await completeOnboarding({
        nickname: nickname.trim(),
        gender: gender!,
        birthYear: Number(birthYear),
        preferredGender: preferredGender!,
        region: region.trim(),
        ...toProfilePayload(extra),
      });
      router.replace('/discover');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>프로필 작성</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              매칭에 쓰일 기본 정보예요. 사진은 없어요.
            </Text>

            <Field label="닉네임" c={c}>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                placeholder={`예: ${namePlaceholder}`}
                placeholderTextColor={c.textSecondary}
                maxLength={30}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
              />
            </Field>

            <Field label="성별" c={c}>
              <GenderToggle value={gender} onChange={setGender} c={c} />
            </Field>

            <Field label="태어난 해" c={c}>
              <TextInput
                value={birthYear}
                onChangeText={(t) => setBirthYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="예: 1999"
                placeholderTextColor={c.textSecondary}
                keyboardType="number-pad"
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
              />
              {age != null && (
                <Text style={[styles.hint, { color: c.textSecondary }]}>만 {age}세</Text>
              )}
            </Field>

            <Field label="만나고 싶은 상대" c={c}>
              <GenderToggle value={preferredGender} onChange={setPreferredGender} c={c} />
            </Field>

            <Field label="지역" c={c}>
              <RegionPicker value={region || null} onChange={setRegion} c={c} />
            </Field>

            <ProfileExtraFields value={extra} onChange={(patch) => setExtra((prev) => ({ ...prev, ...patch }))} c={c} />

            <Pressable
              onPress={submit}
              disabled={!canSubmit || submitting}
              style={[styles.submit, { backgroundColor: c.primary, opacity: !canSubmit || submitting ? 0.5 : 1 }]}
            >
              <Text style={[styles.submitText, { color: c.primaryText }]}>
                {submitting ? '저장 중...' : '시작하기'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, c, children }: { label: string; c: ThemeColors; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      {children}
    </View>
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
        const selected = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.toggle,
              {
                backgroundColor: selected ? c.primary : c.backgroundElement,
                borderColor: selected ? c.primary : c.border,
              },
            ]}
          >
            <Text style={{ color: selected ? c.primaryText : c.text, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 25, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '700', marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 13, marginTop: 6 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggle: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  submit: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  submitText: { fontSize: 16, fontWeight: '700' },
});
