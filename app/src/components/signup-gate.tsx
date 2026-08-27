import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomTabInset, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 잠긴 탭 — 소개팅 쪽 문을 손님에게 닫아두는 화면.
 *
 * 1.3부터 모임은 가입 없이 둘러볼 수 있다. 그러면 소개팅 탭에도 손님이 들어오는데,
 * 여기서 "로그인이 필요합니다"라고 잘라 말하면 문 앞에서 돌려보내는 것과 같다.
 * 대신 **이 탭이 무엇을 하는 곳인지 먼저 보여주고** 들어오는 문을 옆에 둔다 —
 * 잠금은 거절이 아니라 초대여야 한다.
 *
 * 두 사람에게 각각 다른 문을 연다.
 *  - 손님: 가입하러 간다.
 *  - 모임만 쓰는 회원: 이미 가입했다. 선호 성별만 채우면 되니 그 화면으로 보낸다.
 */
export function SignupGate({
  icon,
  title,
  lines,
  mode,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** 이 탭이 무엇을 하는 곳인지. 잠긴 사실이 아니라 놓치고 있는 것을 적는다. */
  title: string;
  /** 두세 줄의 설명. 각 줄이 한 문장이다. */
  lines: string[];
  /** 'guest'면 가입으로, 'dating-off'면 소개팅 켜기로 보낸다. */
  mode: 'guest' | 'dating-off';
}) {
  const c = useTheme();
  const router = useRouter();
  const guest = mode === 'guest';

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.body}>
          {/* 봉인된 봉투 — 이 앱에서 '아직 열리지 않은 것'의 그림이다. */}
          <View style={[styles.sealWrap, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
            <Ionicons name={icon} size={30} color={c.primary} />
          </View>

          <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>{title}</Text>
          <View style={styles.lines}>
            {lines.map((line) => (
              <Text key={line} style={[styles.line, { color: c.textSecondary }]}>
                {line}
              </Text>
            ))}
          </View>

          <Pressable
            onPress={() => router.push(guest ? '/consent' : '/my/start-dating')}
            style={({ pressed }) => [styles.cta, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.ctaText, { color: c.primaryText }]}>
              {guest ? '가입하고 시작하기' : '소개팅 시작하기'}
            </Text>
          </Pressable>

          <Text style={[styles.foot, { color: c.textSecondary }]}>
            {guest ? '모임은 가입하지 않아도 둘러볼 수 있어요.' : '모임은 지금처럼 그대로 쓸 수 있어요.'}
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: BottomTabInset },
  sealWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 23, fontWeight: '700', marginTop: 22, textAlign: 'center', lineHeight: 33 },
  lines: { marginTop: 12, gap: 4 },
  line: { fontSize: 15, textAlign: 'center', lineHeight: 23 },
  cta: { marginTop: 30, alignSelf: 'stretch', height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 17, fontWeight: '700' },
  foot: { fontSize: 13, marginTop: 14, textAlign: 'center' },
});
