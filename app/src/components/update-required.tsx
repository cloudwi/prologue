import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 최소 지원 버전에 못 미치는 앱이 만나는 막다른 화면.
 * 서버와 말이 통하지 않는 상태라 돌아갈 화면이 없다 — 스토어로 보내는 버튼 하나만 둔다.
 */
export function UpdateRequired({ storeUrl }: { storeUrl: string }) {
  const c = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <Image
            source={require('@/assets/images/brand-mark.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>
            업데이트가 필요해요
          </Text>
          <Text style={[styles.desc, { color: c.textSecondary }]}>
            프롤로그가 새로워졌어요.{'\n'}
            스토어에서 업데이트하면 계속 이용할 수 있어요.
          </Text>
        </View>

        <Pressable
          onPress={() => Linking.openURL(storeUrl)}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.btnText, { color: c.primaryText }]}>업데이트하러 가기</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 25, justifyContent: 'flex-end' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 89, height: 64, marginBottom: 20 }, // 마크는 1.4:1 가로형
  title: { fontSize: 24, fontWeight: '700' },
  desc: { fontSize: 16, textAlign: 'center', marginTop: 14, lineHeight: 24 },
  btn: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnText: { fontSize: 17, fontWeight: '700' },
});
