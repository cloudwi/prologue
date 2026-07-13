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
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RegionPicker } from '@/components/region-picker';
import { ProfileExtraFields, toProfilePayload, type ProfileExtra } from '@/components/profile-extra-fields';
import { Colors, Fonts, type ThemeColors } from '@/constants/theme';
import { clearTokens } from '@/lib/auth-storage';
import { formatBirthDigits, isoToBirthDigits, parseBirthDigits, sanitizeBirthDigits } from '@/lib/birth-date';
import { completeOnboarding, getMyProfile, type Gender } from '@/lib/member';

const EMPTY_EXTRA: ProfileExtra = { avatarId: null, bio: '', height: '', bodyType: null, hobbies: [], interests: [], strengths: [] };

export default function MyScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDigits, setBirthDigits] = useState('');
  const [preferredGender, setPreferredGender] = useState<Gender | null>(null);
  const [region, setRegion] = useState('');
  const [extra, setExtra] = useState<ProfileExtra>(EMPTY_EXTRA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!active || !p) return;
        setNickname(p.nickname);
        setGender(p.gender);
        setBirthDigits(isoToBirthDigits(p.birthDate));
        setPreferredGender(p.preferredGender);
        setRegion(p.region);
        setExtra({
          avatarId: p.avatarId ?? null,
          bio: p.bio ?? '',
          height: p.heightCm != null ? String(p.heightCm) : '',
          bodyType: p.bodyType ?? null,
          hobbies: p.hobbies ?? [],
          interests: p.interests ?? [],
          strengths: p.strengths ?? [],
        });
      } catch (e) {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const birthDate = parseBirthDigits(birthDigits);

  const canSave =
    nickname.trim().length > 0 &&
    gender != null &&
    birthDate != null &&
    preferredGender != null &&
    region.trim().length > 0;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await completeOnboarding({
        nickname: nickname.trim(),
        gender: gender!,
        birthDate: birthDate!,
        preferredGender: preferredGender!,
        region: region.trim(),
        ...toProfilePayload(extra),
      });
      Alert.alert('저장 완료', '프로필이 수정되었어요');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await clearTokens();
    router.replace('/');
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>마이페이지</Text>
            <Pressable
              onPress={save}
              disabled={!canSave || saving}
              hitSlop={12}
              style={({ pressed }) => [styles.saveBtn, { opacity: !canSave || saving ? 0.35 : pressed ? 0.5 : 1 }]}
            >
              <Text style={[styles.saveBtnText, { color: c.primary }]}>{saving ? '저장 중' : '저장'}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[styles.tip, { backgroundColor: c.backgroundSelected, borderColor: c.border }]}>
              <Text style={[styles.tipText, { color: c.text }]}>
                프로필을 자세히 채울수록 매칭 확률이 올라가요.
              </Text>
            </View>

            <Text style={[styles.sectionHead, { color: c.primary }]}>기본 정보</Text>
            <Field label="닉네임" c={c}>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                maxLength={30}
                placeholderTextColor={c.textSecondary}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
              />
            </Field>

            <Field label="나의 성별" c={c}>
              <GenderToggle value={gender} onChange={setGender} c={c} />
            </Field>

            <Field label="생년월일" c={c}>
              <TextInput
                value={formatBirthDigits(birthDigits)}
                onChangeText={(t) => setBirthDigits(sanitizeBirthDigits(t))}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="예: 1999.05.14"
                placeholderTextColor={c.textSecondary}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
              />
            </Field>

            <Field label="내가 만나고 싶은 성별" c={c}>
              <GenderToggle value={preferredGender} onChange={setPreferredGender} c={c} />
            </Field>

            <Field label="지역" c={c}>
              <RegionPicker value={region || null} onChange={setRegion} c={c} />
            </Field>

            <Text style={[styles.sectionHead, { color: c.primary }]}>상세 프로필 (선택)</Text>
            <ProfileExtraFields value={extra} onChange={(patch) => setExtra((prev) => ({ ...prev, ...patch }))} c={c} />

            <Pressable onPress={logout} hitSlop={8} style={styles.logout}>
              <Text style={{ color: c.textSecondary, fontSize: 14 }}>로그아웃</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, c, children }: { label: string; c: ThemeColors; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      {children}
    </View>
  );
}

function GenderToggle({ value, onChange, c }: { value: Gender | null; onChange: (g: Gender) => void; c: ThemeColors }) {
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
            style={[styles.toggle, { backgroundColor: selected ? c.primary : c.backgroundElement, borderColor: selected ? c.primary : c.border }]}
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
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '700' },
  saveBtn: { paddingVertical: 6, paddingLeft: 12 },
  saveBtnText: { fontSize: 17, fontWeight: '600' },
  content: { padding: 25, paddingBottom: 40 },
  tip: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 22 },
  tipText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  sectionHead: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggle: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logout: { alignSelf: 'center', marginTop: 24, padding: 8 },
});
