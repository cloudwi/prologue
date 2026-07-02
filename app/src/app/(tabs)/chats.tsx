import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';

export default function ChatsScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  // TODO(P3): 대화 신청이 수락된 상대들과의 1:1 문답 목록
  const conversations: unknown[] = [];

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.flex}>
        <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>대화</Text>

        {conversations.length === 0 && (
          <View style={[styles.flex, styles.center, { paddingHorizontal: 40 }]}>
            <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>
              아직 대화가 없어요
            </Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              발견에서 마음에 드는 상대의 답변을 보고{'\n'}대화를 신청해보세요.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', paddingHorizontal: 25, paddingTop: 8, paddingBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
