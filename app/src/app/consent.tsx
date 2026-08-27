import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LEGAL_EFFECTIVE_DATE } from '@/constants/legal';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { saveConsent } from '@/lib/consent';

/**
 * 가입 동의 — 이메일을 받기 전에 거치는 첫 관문.
 *
 * 개인정보보호법 22조는 동의 사항을 뭉뚱그리지 말고 구분해서 각각 받도록 한다. 그래서 한 줄짜리
 * "가입하면 동의한 것으로 봅니다" 대신 항목별 체크를 둔다. 선택 항목(마케팅)은 거부해도
 * 가입이 되어야 해서(16조 3항) 버튼을 막지 않는다.
 */

type ItemKey = 'terms' | 'privacy' | 'age' | 'sensitive' | 'marketing';

type Item = {
  key: ItemKey;
  label: string;
  required: boolean;
  /** 전문을 열어볼 화면이 있으면 그 경로. */
  link?: '/terms' | '/privacy';
  /** 왜 필요한지 한 줄 설명 — 민감정보처럼 놀랄 수 있는 항목에만 붙인다. */
  note?: string;
};

const ITEMS: Item[] = [
  { key: 'age', label: '만 19세 이상입니다', required: true },
  { key: 'terms', label: '이용약관에 동의합니다', required: true, link: '/terms' },
  { key: 'privacy', label: '개인정보 수집·이용에 동의합니다', required: true, link: '/privacy' },
  {
    key: 'sensitive',
    label: '민감정보 수집에 동의합니다',
    required: true,
    note: '만나고 싶은 성별은 성적 지향에 해당할 수 있어, 따로 동의를 받아요.',
  },
  {
    key: 'marketing',
    label: '마케팅 정보 수신에 동의합니다',
    required: false,
    note: '새로운 질문과 소식을 보내드려요. 동의하지 않아도 가입할 수 있어요.',
  },
];

export default function ConsentScreen() {
  const c = useTheme();
  const router = useRouter();
  /**
   * intent — 이 사람이 무엇을 하러 왔는지. 'meetup'이면 모임에 손들려고 온 손님이다.
   * next — 가입이 끝나면 되돌아갈 자리(보던 모임의 초대장 등).
   */
  const { intent, next } = useLocalSearchParams<{ intent?: string; next?: string }>();
  const meetupOnly = intent === 'meetup';

  /*
   * 모임만 하러 온 사람에게는 민감정보 동의를 묻지 않는다.
   *
   * 이 항목은 '만나고 싶은 성별' 때문에 있는데, 그 사람에게는 애초에 그걸 묻지 않는다.
   * 받지도 않을 정보의 동의를 미리 받아두는 것은 최소수집 원칙에 어긋나고, 무엇보다
   * 모임 하나 신청하러 온 사람에게 성적 지향 이야기를 꺼내는 건 그 자체로 문턱이다.
   * 이 동의는 나중에 소개팅을 켤 때(my/start-dating) 그 자리에서 받는다.
   */
  const items = meetupOnly ? ITEMS.filter((i) => i.key !== 'sensitive') : ITEMS;
  const requiredKeys = items.filter((i) => i.required).map((i) => i.key);

  useEffect(() => track('consent_viewed'), []);
  const [checked, setChecked] = useState<Record<ItemKey, boolean>>({
    terms: false,
    privacy: false,
    age: false,
    sensitive: false,
    marketing: false,
  });

  const allChecked = items.every((i) => checked[i.key]);
  // 항목 목록이 갈래에 따라 달라져 메모이제이션이 오히려 어긋난다 — 다섯 개짜리 검사라 그냥 센다.
  const canProceed = requiredKeys.every((k) => checked[k]);

  const toggle = (key: ItemKey) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleAll = () => {
    const on = !allChecked;
    setChecked((prev) => ({
      ...prev,
      ...Object.fromEntries(items.map((i) => [i.key, on])),
    }));
  };

  const proceed = async () => {
    track('consent_completed');
    await saveConsent({ marketing: checked.marketing, sensitive: checked.sensitive });
    // 무엇을 하러 왔는지와 돌아갈 자리를 다음 화면에 넘긴다 — 인증이 끼어 있어 상태로는 못 잇는다.
    router.push({
      pathname: '/email-auth',
      params: { ...(meetupOnly ? { intent: 'meetup' } : {}), ...(next ? { next } : {}) },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={10}>
          <Text style={[styles.backText, { color: c.textSecondary }]}>← 뒤로</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: c.text }]}>시작하기 전에{'\n'}동의가 필요해요</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            시행일 {LEGAL_EFFECTIVE_DATE}
          </Text>

          {/* 전체 동의 — 하나씩 누르는 수고를 덜어주되, 각 항목은 아래에 그대로 보인다 */}
          <Pressable
            onPress={toggleAll}
            style={({ pressed }) => [
              styles.allRow,
              {
                backgroundColor: c.backgroundElement,
                borderColor: allChecked ? c.primary : c.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <CheckBox checked={allChecked} c={c} />
            <Text style={[styles.allText, { color: c.text }]}>전체 동의하기</Text>
          </Pressable>

          <View style={styles.items}>
            {items.map((item) => (
              <View key={item.key}>
                <View style={styles.itemRow}>
                  <Pressable
                    onPress={() => toggle(item.key)}
                    style={({ pressed }) => [styles.itemMain, { opacity: pressed ? 0.7 : 1 }]}
                    hitSlop={6}
                  >
                    <CheckBox checked={checked[item.key]} c={c} />
                    <Text style={[styles.itemLabel, { color: c.text }]}>
                      <Text style={{ color: item.required ? c.primaryStrong : c.textSecondary }}>
                        {item.required ? '[필수] ' : '[선택] '}
                      </Text>
                      {item.label}
                    </Text>
                  </Pressable>

                  {item.link && (
                    <Pressable onPress={() => router.push(item.link!)} hitSlop={10}>
                      <Text style={[styles.view, { color: c.textSecondary }]}>보기</Text>
                    </Pressable>
                  )}
                </View>

                {item.note && (
                  <Text style={[styles.note, { color: c.textSecondary }]}>{item.note}</Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        <Pressable
          onPress={proceed}
          disabled={!canProceed}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: canProceed ? c.primary : c.backgroundSelected,
              opacity: pressed && canProceed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.ctaText, { color: canProceed ? c.primaryText : c.textSecondary }]}>
            동의하고 계속하기
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

/** 아이콘 라이브러리를 쓰지 않아 체크 표시는 직접 그린다. */
function CheckBox({ checked, c }: { checked: boolean; c: ReturnType<typeof useTheme> }) {
  return (
    <View
      style={[
        styles.box,
        checked
          ? { backgroundColor: c.primary, borderColor: c.primary }
          : { backgroundColor: 'transparent', borderColor: c.border },
      ]}
    >
      {checked && <Text style={[styles.check, { color: c.primaryText }]}>✓</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 25 },
  back: { paddingVertical: 12 },
  backText: { fontSize: 16 },
  scroll: { paddingBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', lineHeight: 36, marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 10 },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginTop: 28,
  },
  allText: { fontSize: 17, fontWeight: '700' },
  items: { marginTop: 20, gap: 18 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  itemMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemLabel: { fontSize: 15, flex: 1, lineHeight: 21 },
  view: { fontSize: 14, textDecorationLine: 'underline' },
  note: { fontSize: 13, lineHeight: 19, marginTop: 6, marginLeft: 34 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { fontSize: 14, fontWeight: '900', lineHeight: 17 },
  cta: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ctaText: { fontSize: 17, fontWeight: '700' },
});
