import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SkeletonList, Skeleton, SkeletonTextCard } from '@/components/skeleton';
import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMyAnswers, type MyAnswer } from '@/lib/daily';

/**
 * 내가 남긴 답 — 역대 문답 전부를 날짜별로 읽는 본인 전용 기록.
 * 상대에게는 프로필이 열려 있는 사흘 동안만 보이므로, 전체 목록과 날짜는 여기서만 드러난다.
 * 하루 한 답이라 달력처럼 월로 묶고, 카드마다 그날의 날짜를 머리에 둔다 — 일기장의 조판.
 */
export default function MyAnswersScreen() {
  const c = useTheme();
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<MyAnswer[]>([]);

  useEffect(() => {
    let active = true;
    getMyAnswers()
      .then((list) => active && setAnswers(list))
      .catch((e) => {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const monthFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' });
  const dayFmt = new Intl.DateTimeFormat('ko-KR', { day: 'numeric', weekday: 'long' });

  // 최신순 목록을 월 단위로 묶는다 — 서버가 정렬을 보장하므로 순서는 그대로 잇기만 한다.
  const months: { month: string; items: MyAnswer[] }[] = [];
  for (const answer of answers) {
    const month = monthFmt.format(new Date(answer.answeredAt));
    const last = months[months.length - 1];
    if (last && last.month === month) last.items.push(answer);
    else months.push({ month, items: [answer] });
  }

  return (
    <SubScreen title="내가 남긴 답" c={c}>
      {loading ? (
        <SkeletonList c={c}>
          <Skeleton c={c} width={78} height={13} />
          <SkeletonTextCard c={c} bodyLines={3} />
          <SkeletonTextCard c={c} bodyLines={2} />
        </SkeletonList>
      ) : answers.length === 0 ? (
        <View style={[styles.flex, styles.center, styles.emptyPad]}>
          <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>아직 남긴 답이 없어요</Text>
          <Text style={[styles.emptyHint, { color: c.textSecondary }]}>
            발견 탭에서 오늘의 질문에 답하면{'\n'}이곳에 하루씩 쌓여요.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {months.map((group) => (
            <View key={group.month} style={styles.month}>
              <Text style={[styles.monthLabel, { color: c.textSecondary }]}>{group.month}</Text>
              {group.items.map((answer) => (
                <View
                  key={`${answer.questionId}-${answer.answeredAt}`}
                  style={[styles.card, { backgroundColor: c.backgroundElement }]}
                >
                  <Text style={[styles.cardDate, { color: c.textSecondary }]}>
                    {dayFmt.format(new Date(answer.answeredAt))}
                  </Text>
                  <Text style={[styles.cardQuestion, { color: c.text, fontFamily: Fonts.serif }]}>
                    {answer.question}
                  </Text>
                  <Text style={[styles.cardContent, { color: c.text }]}>{answer.content}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },

  emptyPad: { paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyHint: { fontSize: 14.5, lineHeight: 22, textAlign: 'center', marginTop: 10 },

  month: { marginBottom: 28 },
  monthLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8, paddingLeft: 4 },
  card: { borderRadius: Radius.md, padding: 18, marginBottom: 12 },
  cardDate: { fontSize: 13.5 },
  cardQuestion: { fontSize: 17, fontWeight: '700', marginTop: 6, lineHeight: 24 },
  cardContent: { fontSize: 15.5, lineHeight: 23, marginTop: 10 },
});
