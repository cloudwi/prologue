import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { KeywordChips } from '@/components/keyword-chips';
import { AVATARS } from '@/constants/avatars';
import { BODY_TYPES, HOBBIES, INTERESTS, KEYWORD_MAX, STRENGTHS } from '@/constants/profile';
import type { ThemeColors } from '@/constants/theme';
import type { BodyType } from '@/lib/member';

export type ProfileExtra = {
  avatarId: number | null;
  bio: string;
  height: string; // 입력 편의를 위해 문자열로 다룸
  bodyType: BodyType | null;
  hobbies: string[];
  interests: string[];
  strengths: string[];
};

export function ProfileExtraFields({
  value,
  onChange,
  c,
}: {
  value: ProfileExtra;
  onChange: (patch: Partial<ProfileExtra>) => void;
  c: ThemeColors;
}) {
  return (
    <View>
      <Field label="아바타 (나를 닮은 아이콘)" c={c}>
        <AvatarPicker value={value.avatarId} onChange={(avatarId) => onChange({ avatarId })} c={c} />
      </Field>

      <Field label="자기소개 (선택)" c={c}>
        <TextInput
          value={value.bio}
          onChangeText={(t) => onChange({ bio: t })}
          placeholder="나를 한두 문장으로 소개해보세요"
          placeholderTextColor={c.textSecondary}
          multiline
          maxLength={100}
          style={[styles.bio, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
        />
        <Text style={[styles.counter, { color: c.textSecondary }]}>{value.bio.length}/100</Text>
      </Field>

      <Field label="키 (선택)" c={c}>
        <TextInput
          value={value.height}
          onChangeText={(t) => onChange({ height: t.replace(/[^0-9]/g, '').slice(0, 3) })}
          placeholder="예: 175"
          placeholderTextColor={c.textSecondary}
          keyboardType="number-pad"
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
        />
      </Field>

      <Field label="체형 (선택)" c={c}>
        <BodyTypeToggle value={value.bodyType} onChange={(bodyType) => onChange({ bodyType })} c={c} />
      </Field>

      <Field label={`취미 (최대 ${KEYWORD_MAX}개)`} c={c}>
        <KeywordChips options={HOBBIES} selected={value.hobbies} onChange={(v) => onChange({ hobbies: v })} c={c} max={KEYWORD_MAX} />
      </Field>

      <Field label={`관심사 (최대 ${KEYWORD_MAX}개)`} c={c}>
        <KeywordChips options={INTERESTS} selected={value.interests} onChange={(v) => onChange({ interests: v })} c={c} max={KEYWORD_MAX} />
      </Field>

      <Field label={`나의 장점 (최대 ${KEYWORD_MAX}개)`} c={c}>
        <KeywordChips options={STRENGTHS} selected={value.strengths} onChange={(v) => onChange({ strengths: v })} c={c} max={KEYWORD_MAX} />
      </Field>
    </View>
  );
}

export function AvatarPicker({
  value,
  onChange,
  c,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  c: ThemeColors;
}) {
  return (
    <View style={styles.avatarRow}>
      {AVATARS.map((a) => {
        const on = value === a.id;
        return (
          <Pressable
            key={a.id}
            onPress={() => onChange(on ? null : a.id)}
            style={[styles.avatarItem, { borderColor: on ? c.primary : 'transparent' }]}
          >
            <Image source={a.source} style={styles.avatarImg} contentFit="cover" />
          </Pressable>
        );
      })}
    </View>
  );
}

export function BodyTypeToggle({
  value,
  onChange,
  c,
}: {
  value: BodyType | null;
  onChange: (t: BodyType | null) => void;
  c: ThemeColors;
}) {
  return (
    <View style={styles.toggleRow}>
      {BODY_TYPES.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(on ? null : o.key)}
            style={[styles.toggle, { backgroundColor: on ? c.primary : c.backgroundElement, borderColor: on ? c.primary : c.border }]}
          >
            <Text style={{ color: on ? c.primaryText : c.text, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** ProfileExtra → API 필드로 변환. */
export function toProfilePayload(v: ProfileExtra) {
  return {
    avatarId: v.avatarId,
    bio: v.bio.trim() || null,
    heightCm: /^\d{2,3}$/.test(v.height) ? Number(v.height) : null,
    bodyType: v.bodyType,
    hobbies: v.hobbies,
    interests: v.interests,
    strengths: v.strengths,
  };
}

function Field({ label, c, children }: { label: string; c: ThemeColors; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  bio: { minHeight: 72, borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  counter: { fontSize: 12, textAlign: 'right', marginTop: 6 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggle: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarItem: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, padding: 2 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 27 },
});
