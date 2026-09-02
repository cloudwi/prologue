import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SubScreen } from '@/components/sub-screen';
import { LEGAL_VERSION } from '@/constants/legal';
import {
  POLITICAL_LABELS,
  POLITICAL_ORDER,
  RELIGION_LABELS,
  RELIGION_ORDER,
} from '@/constants/profile';
import { Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getBeliefs, updateBeliefs, type PoliticalLeaning, type Religion } from '@/lib/member';

/**
 * 종교·정치 성향 — 민감정보(개인정보보호법 23조)라 상세 프로필과 화면을 나눠 뒀다.
 *
 * 나누는 이유는 둘이다. 하나, 동의를 받아야 하는데 그 안내가 다른 항목들 사이에 끼면 읽히지 않는다.
 * 둘, 프로필 저장은 전체 덮어쓰기라 이 값이 다른 화면의 저장에 휩쓸리면 안 된다(서버도 경로가 다르다).
 *
 * **아무것도 안 고른 상태가 기본이고, 그대로 두는 게 아무 손해도 아니다** — 화면이 그렇게 말해야 한다.
 * 소개팅에서 종교는 실제로 만남을 가르는 조건이라 묻긴 하되, 묻는 일이 압력이 되지 않게.
 */
export default function BeliefsScreen() {
  const c = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [religion, setReligion] = useState<Religion | null>(null);
  const [political, setPolitical] = useState<PoliticalLeaning | null>(null);
  /** 서버에 이미 동의 기록이 있으면 체크박스를 다시 보여주지 않는다. */
  const [alreadyConsented, setAlreadyConsented] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    let active = true;
    getBeliefs()
      .then((b) => {
        if (!active) return;
        setReligion(b.religion);
        setPolitical(b.politicalLeaning);
        setAlreadyConsented(b.consented);
      })
      .catch((e) => {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const writing = religion != null || political != null;
  /** 새로 적는 사람만 동의가 필요하다. 지우는 데는 동의가 필요 없다. */
  const needsConsent = writing && !alreadyConsented;

  async function save() {
    if (saving) return;
    if (needsConsent && !consent) {
      Alert.alert('동의가 필요해요', '종교·정치 성향은 민감정보라, 수집·이용에 동의해야 프로필에 적을 수 있어요.');
      return;
    }
    setSaving(true);
    try {
      const saved = await updateBeliefs({
        religion,
        politicalLeaning: political,
        consent: needsConsent ? consent : undefined,
        legalVersion: needsConsent ? LEGAL_VERSION : undefined,
      });
      setAlreadyConsented(saved.consented);
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubScreen title="종교·정치 성향" c={c} onSave={save} saveDisabled={loading} saving={saving}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.lead, { color: c.textSecondary }]}>
            둘 다 선택 항목이에요. 비워두면 프로필에 아무것도 표시되지 않아요.{'\n'}
            적으면 소개받은 상대에게 보여요.
          </Text>

          <Group
            title="종교"
            options={RELIGION_ORDER.map((key) => ({ key, label: RELIGION_LABELS[key] }))}
            value={religion}
            onChange={(v) => setReligion(v as Religion | null)}
            c={c}
          />

          <Group
            title="정치 성향"
            options={POLITICAL_ORDER.map((key) => ({ key, label: POLITICAL_LABELS[key] }))}
            value={political}
            onChange={(v) => setPolitical(v as PoliticalLeaning | null)}
            c={c}
          />

          {needsConsent && (
            <Pressable
              onPress={() => setConsent((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              style={[styles.consent, { backgroundColor: c.backgroundElement, borderColor: consent ? c.primary : c.border }]}
            >
              <Ionicons
                name={consent ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={consent ? c.primary : c.textSecondary}
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

          <Text style={[styles.footnote, { color: c.textSecondary }]}>
            선택을 한 번 더 누르면 해제돼요. 둘 다 비우고 저장하면 기록이 지워져요.
          </Text>
        </ScrollView>
      )}
    </SubScreen>
  );
}

/** 한 항목의 선택지 묶음. 고른 것을 다시 누르면 해제된다 — '밝히지 않음' 칸을 따로 두지 않는 이유다. */
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
                {
                  backgroundColor: on ? c.primary : c.backgroundElement,
                  borderColor: on ? c.primary : c.border,
                },
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

  consent: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: Radius.md, padding: 16 },
  consentBody: { flex: 1 },
  consentLabel: { ...Type.body, fontWeight: '600' },
  consentNote: { ...Type.caption, marginTop: 6 },

  footnote: { ...Type.caption, marginTop: 18 },
});
