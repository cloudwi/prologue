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
} from 'react-native';

import { RegionPicker } from '@/components/region-picker';
import { SubScreen } from '@/components/sub-screen';
import { type ThemeColors } from '@/constants/theme';
import { formatBirthDigits, isoToBirthDigits, parseBirthDigits, sanitizeBirthDigits } from '@/lib/birth-date';
import { completeOnboarding, getMyProfile, type Gender, type MemberProfile } from '@/lib/member';
import { formatPhoneDigits, isValidPhoneDigits, sanitizePhoneDigits } from '@/lib/phone';
import { toRequest } from '@/lib/profile-form';
import { useTheme } from '@/hooks/use-theme';

export default function EditBasicScreen() {
  const c = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<MemberProfile | null>(null);

  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDigits, setBirthDigits] = useState('');
  const [preferredGender, setPreferredGender] = useState<Gender | null>(null);
  const [region, setRegion] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [kakaoId, setKakaoId] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!active || !p) return;
        setBase(p);
        setNickname(p.nickname);
        setGender(p.gender);
        setBirthDigits(isoToBirthDigits(p.birthDate));
        setPreferredGender(p.preferredGender);
        setRegion(p.region);
        setPhoneDigits(p.phone ?? '');
        setKakaoId(p.kakaoId ?? '');
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

  const birthDate = parseBirthDigits(birthDigits);
  const canSave =
    base != null &&
    nickname.trim().length > 0 &&
    gender != null &&
    birthDate != null &&
    preferredGender != null &&
    region.trim().length > 0 &&
    isValidPhoneDigits(phoneDigits);

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // 현재 프로필 위에 이 화면의 항목만 덮어쓴다 — 다른 화면의 값이 지워지지 않도록.
      await completeOnboarding(
        toRequest(base!, {
          nickname: nickname.trim(),
          gender: gender!,
          birthDate: birthDate!,
          preferredGender: preferredGender!,
          region: region.trim(),
          phone: phoneDigits,
          kakaoId: kakaoId.trim() || null,
        }),
      );
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubScreen title="기본 정보" c={c} onSave={save} saveDisabled={!canSave} saving={saving}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

            {/* 연락처 — 프로필에 공개되지 않고, 편지에 실을 때만 상대에게 전해진다. */}
            <Field label="전화번호" c={c}>
              <TextInput
                value={formatPhoneDigits(phoneDigits)}
                onChangeText={(t) => setPhoneDigits(sanitizePhoneDigits(t))}
                keyboardType="phone-pad"
                maxLength={13}
                placeholder="010-0000-0000"
                placeholderTextColor={c.textSecondary}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
              />
              <Text style={[styles.fieldHint, { color: c.textSecondary }]}>
                프로필에 공개되지 않아요. 편지에 담기로 한 경우에만 상대에게 전해져요.
              </Text>
            </Field>

            <Field label="카카오톡 ID (선택)" c={c}>
              <TextInput
                value={kakaoId}
                onChangeText={setKakaoId}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                placeholder="편지에 전화번호 대신 담을 수 있어요"
                placeholderTextColor={c.textSecondary}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
              />
            </Field>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SubScreen>
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
            <Text style={{ color: on ? c.primaryText : c.text, fontSize: 15, fontWeight: '600' }}>{o.label}</Text>
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
  field: { marginBottom: 22 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  fieldHint: { fontSize: 12.5, lineHeight: 18, marginTop: 7 },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggle: { flex: 1, height: 50, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
