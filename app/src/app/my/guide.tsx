import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STEPS = [
  {
    title: '하루에 하나, 질문이 도착해요',
    body: '매일 같은 시각에 문답이 열려요. 서두르지 않아도 괜찮아요. 오늘 답하지 않으면 내일 질문으로 넘어가요.',
  },
  {
    title: '답변이 먼저 닿아요',
    body: '사진보다 답변이 먼저 보여요. 조건이 아니라 생각이 맞는 사람을 만나기 위해서예요.',
  },
  {
    title: '한 번에 한 사람이에요',
    body: '카드를 계속 넘기는 대신 한 사람과의 대화에 집중해요. 마음이 맞으면 대화가 이어지고, 아니면 다음 인연으로 넘어가요.',
  },
  {
    title: '사진은 천천히 열려요',
    body: '대화가 쌓이면 서로의 사진이 보여요. 먼저 사람을 알고, 그다음에 얼굴을 알게 되는 순서예요.',
  },
];

export default function GuideScreen() {
  const c = useTheme();
  return (
    <SubScreen title="프롤로그 사용법" c={c}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lead, { color: c.text, fontFamily: Fonts.serif }]}>
          모든 이야기의 시작에는{'\n'}프롤로그가 있어요
        </Text>
        {STEPS.map((s, i) => (
          <Step key={s.title} index={i + 1} title={s.title} body={s.body} c={c} />
        ))}
      </ScrollView>
    </SubScreen>
  );
}

function Step({ index, title, body, c }: { index: number; title: string; body: string; c: ThemeColors }) {
  return (
    <View style={styles.step}>
      <View style={[styles.badge, { backgroundColor: c.primary }]}>
        <Text style={[styles.badgeText, { color: c.primaryText }]}>{index}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.stepTitle, { color: c.text }]}>{title}</Text>
        <Text style={[styles.stepBody, { color: c.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  lead: { fontSize: 22, fontWeight: '700', lineHeight: 32, marginBottom: 28 },
  step: { flexDirection: 'row', gap: 14, marginBottom: 26 },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, fontWeight: '700' },
  stepTitle: { fontSize: 16, fontWeight: '700' },
  stepBody: { fontSize: 14, lineHeight: 22, marginTop: 6 },
});
