import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import { clearTokens } from '@/lib/auth-storage';

export default function HomeScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  async function logout() {
    await clearTokens();
    router.replace('/');
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.safe}>
        <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>오늘의 문답</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>
          로그인 성공! 여기에 매일 질문 화면이 들어올 예정이에요.
        </Text>
        <Pressable onPress={logout} style={[styles.logout, { borderColor: c.border }]}>
          <Text style={{ color: c.textSecondary }}>로그아웃</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: '700' },
  sub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  logout: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1 },
});
