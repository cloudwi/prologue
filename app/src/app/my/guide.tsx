import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STEPS = [
  {
    title: '모임만 이용해도 괜찮아요',
    body: '가입 없이 모임을 둘러볼 수 있어요. 참석할 때 사진 한 장과 기본 정보를 남기면 돼요. 소개팅은 MY에서 따로 시작하거나 중지할 수 있어요.',
  },
  {
    title: '모임 신청과 확정은 달라요',
    body: '신청 후 여는 사람이 확인해야 참석이 확정돼요. 유료 모임은 신청 후 열리는 연락 링크에서 납부 방법을 확인해주세요. 모임·파티 만들기에서 내 모임도 열 수 있어요.',
  },
  {
    title: '소개팅은 오늘의 답에서 시작해요',
    body: '사진 한 장과 만나고 싶은 성별을 준비하고 오늘의 질문에 답해주세요. 조건에 맞는 상대가 있어야 소개가 도착해요. 지금은 상대가 없을 수도 있어요.',
  },
  {
    title: '취향으로 한 사람 더 알아가요',
    body: '오늘의 취향 카드 10장에 답하면 추가 소개를 받을 수 있어요. 상대가 없으면 다음 소개를 기다려주세요. 데모 프로필은 실제 회원이 아니라 화면 미리보기예요.',
  },
  {
    title: '마음이 닿으면 편지를 보내요',
    body: '답변과 프로필을 읽고 하트로 마음을 전할 수 있어요. 편지에는 내가 선택한 연락처를 담아 보내요. 편지 발송과 일부 프로필 열기에는 잉크가 쓰이고, 다음 대화는 앱 밖에서 이어져요.',
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
  badgeText: { fontSize: 14, fontWeight: '700' },
  stepTitle: { fontSize: 17, fontWeight: '700' },
  stepBody: { fontSize: 15, lineHeight: 23, marginTop: 6 },
});
