import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DRINKING_LABELS,
  DRINKING_ORDER,
  MEET_FREQUENCY_LABELS,
  MEET_FREQUENCY_ORDER,
  POLITICAL_LABELS,
  POLITICAL_ORDER,
  RELIGION_LABELS,
  RELIGION_ORDER,
  SMOKING_LABELS,
  SMOKING_ORDER,
} from '@/constants/profile';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import type { Drinking, MeetFrequency, PoliticalLeaning, Religion, Smoking } from '@/lib/member';

/**
 * 한 줄로 답하는 프로필 항목들 — 담배·술·만나는 빈도·종교·정치 성향.
 *
 * 화면마다 흩어 놓았더니 MY 탭이 항목 목록이 됐다(유저 지적 2026-09-02). 한자리에 모으고,
 * 가입할 때와 나중에 고칠 때가 **같은 화면 조각**을 쓰도록 컴포넌트로 뺀다 — 두 벌로 두면
 * 한쪽에만 항목이 늘어나는 날이 온다.
 *
 * 다섯 다 선택이고, 고른 것을 다시 누르면 해제된다. '밝히지 않음' 칸을 두지 않는 이유는
 * 그 칸이 있으면 그것도 하나의 답처럼 읽히기 때문이다.
 *
 * 종교·정치는 민감정보(개인정보보호법 23조)라 **적을 때 따로 동의를 받는다**. 그 동의 안내는
 * 값을 하나라도 고른 뒤에야 나타난다 — 아무것도 안 적을 사람에게 동의부터 들이밀지 않는다.
 */
export type ProfileFacts = {
  smoking: Smoking | null;
  drinking: Drinking | null;
  meetFrequency: MeetFrequency | null;
  religion: Religion | null;
  politicalLeaning: PoliticalLeaning | null;
};

export const EMPTY_FACTS: ProfileFacts = {
  smoking: null,
  drinking: null,
  meetFrequency: null,
  religion: null,
  politicalLeaning: null,
};

/** 신념(종교·정치)을 하나라도 골랐는지 — 동의가 필요한 상태인지 판단한다. */
export function hasBeliefs(facts: ProfileFacts): boolean {
  return facts.religion != null || facts.politicalLeaning != null;
}

export function ProfileFactsFields({
  value,
  onChange,
  consented,
  consentChecked,
  onConsentChange,
  c,
}: {
  value: ProfileFacts;
  onChange: (patch: Partial<ProfileFacts>) => void;
  /** 서버에 이미 민감정보 동의 기록이 있는지 — 있으면 다시 묻지 않는다. */
  consented: boolean;
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
  c: ThemeColors;
}) {
  const needsConsent = hasBeliefs(value) && !consented;

  return (
    <View>
      <Group
        title="담배"
        options={SMOKING_ORDER.map((key) => ({ key, label: SMOKING_LABELS[key] }))}
        value={value.smoking}
        onChange={(v) => onChange({ smoking: v as Smoking | null })}
        c={c}
      />
      <Group
        title="술"
        options={DRINKING_ORDER.map((key) => ({ key, label: DRINKING_LABELS[key] }))}
        value={value.drinking}
        onChange={(v) => onChange({ drinking: v as Drinking | null })}
        c={c}
      />
      <Group
        title="얼마나 자주 만나고 싶나요"
        options={MEET_FREQUENCY_ORDER.map((key) => ({ key, label: MEET_FREQUENCY_LABELS[key] }))}
        value={value.meetFrequency}
        onChange={(v) => onChange({ meetFrequency: v as MeetFrequency | null })}
        c={c}
      />
      <Group
        title="종교"
        options={RELIGION_ORDER.map((key) => ({ key, label: RELIGION_LABELS[key] }))}
        value={value.religion}
        onChange={(v) => onChange({ religion: v as Religion | null })}
        c={c}
      />
      <Group
        title="정치 성향"
        options={POLITICAL_ORDER.map((key) => ({ key, label: POLITICAL_LABELS[key] }))}
        value={value.politicalLeaning}
        onChange={(v) => onChange({ politicalLeaning: v as PoliticalLeaning | null })}
        c={c}
      />

      {needsConsent && (
        <Pressable
          onPress={() => onConsentChange(!consentChecked)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentChecked }}
          style={[
            styles.consent,
            { backgroundColor: c.backgroundElement, borderColor: consentChecked ? c.primary : c.border },
          ]}
        >
          <Ionicons
            name={consentChecked ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={consentChecked ? c.primary : c.textSecondary}
          />
          <View style={styles.consentBody}>
            <Text style={[styles.consentLabel, { color: c.text }]}>민감정보 수집·이용에 동의합니다</Text>
            <Text style={[styles.consentNote, { color: c.textSecondary }]}>
              종교와 정치 성향은 개인정보보호법이 민감정보로 정한 항목이라 따로 동의를 받아요.
              프로필에 공개할 목적으로만 쓰고, 언제든 지울 수 있어요(지울 때는 동의가 필요 없어요).
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/** 한 항목의 선택지 묶음. 고른 것을 다시 누르면 해제된다. */
function Group({
  title,
  options,
  value,
  onChange,
  c,
}: {
  title: string;
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  c: ThemeColors;
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: c.text }]}>{title}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const on = value === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => onChange(on ? null : option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.chip,
                { backgroundColor: on ? c.primary : c.backgroundElement, borderColor: on ? c.primary : c.border },
              ]}
            >
              <Text style={[styles.chipText, { color: on ? c.primaryText : c.text }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 24 },
  groupTitle: { ...Type.label, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { ...Type.body, fontWeight: '600' },

  consent: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: Radius.md, padding: 16, marginBottom: 8 },
  consentBody: { flex: 1 },
  consentLabel: { ...Type.body, fontWeight: '600' },
  consentNote: { ...Type.caption, marginTop: 6 },
});
