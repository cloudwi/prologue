import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LegalSection = { heading: string; body: string };

/**
 * 이용약관·개인정보처리방침 공용 레이아웃.
 *
 * 법 문서는 읽히지 않으면 고지한 게 아니다. 조판이 유일한 장치라,
 * 여백·행간·조 사이 간격으로 덩어리를 나눠 눈이 멈출 자리를 만든다.
 */
export function LegalScreen({
  title,
  updatedAt,
  sections,
}: {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  const c = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.background },
          headerTintColor: c.text,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>{title}</Text>
        <Text style={[styles.updated, { color: c.textSecondary }]}>시행일 {updatedAt}</Text>

        {/* 머리말과 본문을 가르는 선 — 어디서부터 조문인지 눈에 먼저 들어오게 */}
        <View style={[styles.rule, { backgroundColor: c.border }]} />

        {sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={[styles.heading, { color: c.text }]}>{s.heading}</Text>
            <Text style={[styles.body, { color: c.textSecondary }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    // 가로 여백이 없어 글자가 화면 끝에 붙어 있었다 — 읽기 폭을 만드는 게 먼저다.
    paddingHorizontal: 22,
    paddingBottom: 56,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 27, fontWeight: '700', marginTop: 4, letterSpacing: -0.3 },
  updated: { fontSize: 13.5, marginTop: 7 },
  rule: { height: StyleSheet.hairlineWidth, marginTop: 20 },
  section: { marginTop: 26 },
  heading: { fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2 },
  // 법 문서는 한 줄이 길어 행간이 좁으면 줄을 놓친다.
  body: { fontSize: 15, lineHeight: 25, marginTop: 9 },
});
