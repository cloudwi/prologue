import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, MaxContentWidth } from '@/constants/theme';

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
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.textSecondary }]}>← 뒤로</Text>
          </Pressable>
        </View>
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 25 },
  header: { height: 44, justifyContent: 'center' },
  back: { fontSize: 15 },
  content: { paddingBottom: 40, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginTop: 8 },
  updated: { fontSize: 12, marginTop: 6 },
  section: { marginTop: 24 },
  heading: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 22, marginTop: 8 },
});
