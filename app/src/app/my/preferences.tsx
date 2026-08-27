import { Picker } from '@react-native-picker/picker';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { completeOnboarding, getMyProfile, type MemberProfile } from '@/lib/member';
import { ageFrom, toRequest } from '@/lib/profile-form';
import { SESSION_QUERY_KEY } from '@/lib/session';

/**
 * 선호하는 이성 — 소개받고 싶은 나이대.
 *
 * 나이는 지금도 매칭 점수에 쓰이지만(PeerScore) 그건 순서의 문제다. 나이 차가 벌어질수록
 * 뒤로 밀릴 뿐, 스물아홉이 마흔을 소개받는 날은 여전히 생긴다. 본인이 정한 범위는
 * 자격의 문제라 서버의 자격 판정(PeerEligibility)이 본다.
 *
 * 서버는 **양쪽 모두**를 본다 — 내 범위에 상대가 들어와도 상대의 범위에 내가 없으면
 * 소개되지 않는다. 성별 선호와 같은 원칙이라 이 화면도 그렇게 말해준다. 정하는 순간
 * 내가 볼 사람만 줄어드는 게 아니라 나를 볼 사람도 줄어든다는 걸 알고 정해야 한다.
 */
const ADULT_AGE = 19;
const AGE_MAX = 99;
const AGES = Array.from({ length: AGE_MAX - ADULT_AGE + 1 }, (_, i) => ADULT_AGE + i);

export default function PreferencesScreen() {
  const c = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<MemberProfile | null>(null);
  const [minAge, setMinAge] = useState<number | null>(null);
  const [maxAge, setMaxAge] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!active || !p) return;
        setBase(p);
        setMinAge(p.minAge);
        setMaxAge(p.maxAge);
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

  const inverted = minAge != null && maxAge != null && minAge > maxAge;
  const canSave = base != null && !inverted;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await completeOnboarding(toRequest(base!, { minAge, maxAge }));
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      // 오늘의 상대는 이 범위로 다시 골라진다 — 내일부터가 아니라 다음 소개부터.
      await queryClient.invalidateQueries({ queryKey: ['daily'] });
      router.back();
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  }

  const myAge = base ? ageFrom(base.birthDate) : null;

  return (
    <SubScreen title="선호하는 이성" c={c} onSave={save} saveDisabled={!canSave} saving={saving}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.label, { color: c.text }]}>소개받고 싶은 나이대</Text>
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            정하지 않으면 나이로 거르지 않아요.
          </Text>

          <View style={styles.rangeRow}>
            <AgePicker
              label="최소"
              value={minAge}
              onChange={setMinAge}
              placeholder="제한 없음"
              c={c}
            />
            <Text style={[styles.tilde, { color: c.textSecondary }]}>~</Text>
            <AgePicker
              label="최대"
              value={maxAge}
              onChange={setMaxAge}
              placeholder="제한 없음"
              c={c}
            />
          </View>

          {inverted && (
            <Text style={[styles.error, { color: c.primaryStrong }]}>
              최소 나이가 최대 나이보다 클 수 없어요.
            </Text>
          )}

          {myAge != null && (
            <Pressable
              onPress={() => {
                setMinAge(Math.max(ADULT_AGE, myAge - 5));
                setMaxAge(Math.min(AGE_MAX, myAge + 5));
              }}
              style={({ pressed }) => [
                styles.suggest,
                { borderColor: c.border, backgroundColor: c.backgroundElement, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.suggestText, { color: c.text }]}>
                내 또래로 ({Math.max(ADULT_AGE, myAge - 5)}~{Math.min(AGE_MAX, myAge + 5)}세)
              </Text>
            </Pressable>
          )}

          {/*
            * 좁힐수록 소개가 줄어든다는 것을 숨기지 않는다. 하루에 한 사람만 소개하는 서비스라,
            * 범위를 좁게 잡으면 소개받을 사람이 없는 날이 생긴다. 그걸 나중에 "왜 아무도
            * 안 와요"로 겪게 하는 것보다 지금 말해주는 편이 낫다.
            */}
          <View style={[styles.note, { borderColor: c.border }]}>
            <Text style={[styles.noteText, { color: c.textSecondary }]}>
              나이대는 서로에게 적용돼요. 내가 정한 범위에 상대가 들어와도, 상대가 정한 범위에 내가 없으면
              소개되지 않아요.
            </Text>
            <Text style={[styles.noteText, { color: c.textSecondary }]}>
              좁게 정할수록 소개받는 날이 줄어들어요. 하루에 한 사람만 소개하니까요.
            </Text>
          </View>

          {(minAge != null || maxAge != null) && (
            <Pressable
              onPress={() => {
                setMinAge(null);
                setMaxAge(null);
              }}
              hitSlop={8}
              style={styles.clear}
            >
              <Text style={{ color: c.textSecondary, fontSize: 15 }}>나이대 지우기</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SubScreen>
  );
}

/** 나이 하나를 고르는 휠 — 키 픽커와 같은 결. '제한 없음'을 첫 항목으로 둔다. */
function AgePicker({
  label,
  value,
  onChange,
  placeholder,
  c,
}: {
  label: string;
  value: number | null;
  onChange: (age: number | null) => void;
  placeholder: string;
  c: ThemeColors;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number>(value ?? 30);
  const [none, setNone] = useState(value == null);

  function openSheet() {
    setDraft(value ?? 30);
    setNone(value == null);
    setOpen(true);
  }

  return (
    <>
      <Pressable
        onPress={openSheet}
        style={[styles.trigger, { borderColor: c.border, backgroundColor: c.backgroundElement }]}
      >
        <Text style={[styles.triggerLabel, { color: c.textSecondary }]}>{label}</Text>
        <Text style={{ color: value != null ? c.text : c.textSecondary, fontSize: 17, fontWeight: '600' }}>
          {value != null ? `${value}세` : placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.background }]} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={{ color: c.textSecondary, fontSize: 17 }}>취소</Text>
              </Pressable>
              <Text style={[styles.sheetTitle, { color: c.text }]}>{label} 나이</Text>
              <Pressable
                onPress={() => {
                  onChange(none ? null : draft);
                  setOpen(false);
                }}
                hitSlop={10}
              >
                <Text style={{ color: c.primary, fontSize: 17, fontWeight: '700' }}>완료</Text>
              </Pressable>
            </View>
            <Picker
              selectedValue={none ? 'none' : String(draft)}
              onValueChange={(v) => {
                if (v === 'none') {
                  setNone(true);
                  return;
                }
                setNone(false);
                setDraft(Number(v));
              }}
              itemStyle={{ color: c.text }}
            >
              <Picker.Item label={placeholder} value="none" />
              {AGES.map((a) => (
                <Picker.Item key={a} label={`${a}세`} value={String(a)} />
              ))}
            </Picker>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 13.5, lineHeight: 19, marginTop: 6 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  trigger: { flex: 1, height: 62, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 14, justifyContent: 'center', gap: 2 },
  triggerLabel: { fontSize: 12.5 },
  tilde: { fontSize: 17 },
  error: { fontSize: 13.5, marginTop: 10 },
  suggest: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 14, height: 38, borderWidth: 1, borderRadius: Radius.pill, justifyContent: 'center' },
  suggestText: { fontSize: 14, fontWeight: '600' },
  note: { marginTop: 26, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.sm, gap: 10 },
  noteText: { fontSize: 13.5, lineHeight: 20 },
  clear: { marginTop: 22, alignItems: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { paddingBottom: 30 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
});
