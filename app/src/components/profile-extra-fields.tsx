import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HeightPicker } from '@/components/height-picker';
import { KeywordChips } from '@/components/keyword-chips';
import { AVATARS } from '@/constants/avatars';
import { HOBBIES, INTERESTS, KEYWORD_MAX, STRENGTHS } from '@/constants/profile';
import type { ThemeColors } from '@/constants/theme';

export type ProfileExtra = {
  /** 자기소개 — 프로필 편지의 첫 문단. 입력 UI는 별도 화면(my/edit-bio·온보딩 선택 스텝), 여기서는 값만 함께 나른다. */
  bio: string;
  avatarId: number | null;
  height: string; // 입력 편의를 위해 문자열로 다룸
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

      <Field label="키 (선택)" c={c}>
        <HeightPicker value={value.height} onChange={(height) => onChange({ height })} c={c} />
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

/**
 * ProfileExtra → API 필드로 변환.
 * bio는 여기서 그리지 않는다 — 자기소개는 제 화면(my/edit-bio)에서 한 문단으로 쓴다(2026-08-19 결정: 편지의 첫 문단).
 * 여기서 키를 빼면 toRequest가 기존 저장값을 그대로 보존한다.
 */
export function toProfilePayload(v: ProfileExtra) {
  return {
    bio: v.bio.trim() || null,
    avatarId: v.avatarId,
    heightCm: /^\d{2,3}$/.test(v.height) ? Number(v.height) : null,
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
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 17 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggle: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarItem: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, padding: 2 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 27 },
});
