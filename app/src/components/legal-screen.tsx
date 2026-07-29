import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LegalSection = { heading: string; body: string };

/** 이용약관·개인정보처리방침 공용 레이아웃 */
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
          <Text style={[styles.updated, { color: c.textSecondary }]}>시행일: {updatedAt}</Text>
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
  content: { paddingBottom: 40, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginTop: 8 },
  updated: { fontSize: 12, marginTop: 6 },
  section: { marginTop: 24 },
  heading: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 22, marginTop: 8 },
});
