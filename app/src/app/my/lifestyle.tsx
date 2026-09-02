import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SubScreen } from '@/components/sub-screen';
import {
  DRINKING_LABELS,
  DRINKING_ORDER,
  MEET_FREQUENCY_LABELS,
  MEET_FREQUENCY_ORDER,
  SMOKING_LABELS,
  SMOKING_ORDER,
} from '@/constants/profile';
import { Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getLifestyle,
  updateLifestyle,
  type Drinking,
  type MeetFrequency,
  type Smoking,
} from '@/lib/member';

/**
 * 생활 습관 — 흡연·음주·만나는 빈도.
 *
 * "만나기 전에 알았으면" 소리가 가장 많이 나오는 셋이다. 그렇다고 캐묻는 화면이 되면 안 돼서,
 * 셋 다 비워둘 수 있고 고른 것을 다시 누르면 해제된다('밝히지 않음' 칸을 따로 두지 않는 이유).
 *
 * 상세 프로필과 화면을 나눈 이유는 서버와 같다 — 프로필 저장은 전체 덮어쓰기라, 이 값이
 * 다른 화면의 저장에 휩쓸리면 안 된다.
 */
export default function LifestyleScreen() {
  const c = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smoking, setSmoking] = useState<Smoking | null>(null);
  const [drinking, setDrinking] = useState<Drinking | null>(null);
  const [meetFrequency, setMeetFrequency] = useState<MeetFrequency | null>(null);

  useEffect(() => {
    let active = true;
    getLifestyle()
      .then((v) => {
        if (!active) return;
        setSmoking(v.smoking);
        setDrinking(v.drinking);
        setMeetFrequency(v.meetFrequency);
      })
      .catch((e) => {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await updateLifestyle({ smoking, drinking, meetFrequency });
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubScreen title="생활 습관" c={c} onSave={save} saveDisabled={loading} saving={saving}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.lead, { color: c.textSecondary }]}>
            모두 선택 항목이에요. 고른 것만 프로필에 작은 태그로 붙어요.
          </Text>

          <Group
            title="담배"
            options={SMOKING_ORDER.map((key) => ({ key, label: SMOKING_LABELS[key] }))}
            value={smoking}
            onChange={(v) => setSmoking(v as Smoking | null)}
            c={c}
          />
          <Group
            title="술"
            options={DRINKING_ORDER.map((key) => ({ key, label: DRINKING_LABELS[key] }))}
            value={drinking}
            onChange={(v) => setDrinking(v as Drinking | null)}
            c={c}
          />
          <Group
            title="얼마나 자주 만나고 싶나요"
            options={MEET_FREQUENCY_ORDER.map((key) => ({ key, label: MEET_FREQUENCY_LABELS[key] }))}
            value={meetFrequency}
            onChange={(v) => setMeetFrequency(v as MeetFrequency | null)}
            c={c}
          />

          <Text style={[styles.footnote, { color: c.textSecondary }]}>
            선택을 한 번 더 누르면 해제돼요. 비워두면 프로필에 표시되지 않아요.
          </Text>
        </ScrollView>
      )}
    </SubScreen>
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
  c: ReturnType<typeof useTheme>;
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
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  lead: { ...Type.body, marginBottom: 24 },

  group: { marginBottom: 28 },
  groupTitle: { ...Type.label, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { ...Type.body, fontWeight: '600' },

  footnote: { ...Type.caption, marginTop: 4 },
});
