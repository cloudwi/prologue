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
import { Colors, Fonts, type ThemeColors } from '@/constants/theme';
import { clearTokens } from '@/lib/auth-storage';
import { completeOnboarding, getMyProfile, type Gender } from '@/lib/member';

export default function MyPageScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [preferredGender, setPreferredGender] = useState<Gender | null>(null);
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!active || !p) return;
        setNickname(p.nickname);
        setGender(p.gender);
        setBirthYear(String(p.birthYear));
        setPreferredGender(p.preferredGender);
        setRegion(p.region);
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

  const canSave =
    nickname.trim().length > 0 &&
    gender != null &&
    /^\d{4}$/.test(birthYear) &&
    preferredGender != null &&
    region.trim().length > 0;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await completeOnboarding({
        nickname: nickname.trim(),
        gender: gender!,
        birthYear: Number(birthYear),
        preferredGender: preferredGender!,
        region: region.trim(),
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
          <View style={styles.topbar}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={{ color: c.text, fontSize: 16 }}>‹ 뒤로</Text>
            </Pressable>
            <Text style={[styles.topTitle, { color: c.text }]}>마이페이지</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Field label="닉네임" c={c}>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                maxLength={30}
                placeholderTextColor={c.textSecondary}
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
                keyboardType="number-pad"
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
              />
            </Field>

            <Field label="만나고 싶은 상대" c={c}>
              <GenderToggle value={preferredGender} onChange={setPreferredGender} c={c} />
            </Field>

            <Field label="지역" c={c}>
              <RegionPicker value={region || null} onChange={setRegion} c={c} />
            </Field>

            <Pressable
              onPress={save}
              disabled={!canSave || saving}
              style={[styles.save, { backgroundColor: c.primary, opacity: !canSave || saving ? 0.5 : 1 }]}
            >
              <Text style={[styles.saveText, { color: c.primaryText }]}>{saving ? '저장 중...' : '저장'}</Text>
            </Pressable>

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
            style={[
              styles.toggle,
              { backgroundColor: selected ? c.primary : c.backgroundElement, borderColor: selected ? c.primary : c.border },
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
  center: { alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  topTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 25, paddingBottom: 40 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggle: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  save: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  saveText: { fontSize: 16, fontWeight: '700' },
  logout: { alignSelf: 'center', marginTop: 28, padding: 8 },
});
