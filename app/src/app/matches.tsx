import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, type ThemeColors } from '@/constants/theme';
import { getMatches, type Match } from '@/lib/match';

function koreanAge(birthYear: number): number {
  // 한국식 나이(연 나이 + 1). 정확한 만 나이가 아니라 표시용.
  return new Date().getFullYear() - birthYear + 1;
}

export default function MatchesScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      (async () => {
        try {
          const list = await getMatches();
          if (active) setMatches(list);
        } catch (e) {
          if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={{ color: c.text, fontSize: 16 }}>‹ 뒤로</Text>
          </Pressable>
          <Text style={[styles.topTitle, { color: c.text }]}>나의 매칭</Text>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={[styles.flex, styles.center]}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : matches && matches.length > 0 ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.lead, { color: c.textSecondary }]}>
              서로의 마음이 닿았어요. 이제 상대를 알아가 보세요 💝
            </Text>
            {matches.map((m) => (
              <MatchCard key={m.peerAccountId} match={m} c={c} />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.center, { paddingHorizontal: 40 }]}>
            <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>아직 매칭이 없어요</Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              오늘의 문답에 답하고, 마음에 드는 답변에 하트를 보내보세요. 서로 하트하면 매칭돼요.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function MatchCard({ match, c }: { match: Match; c: ThemeColors }) {
  const genderLabel = match.gender === 'MALE' ? '남성' : '여성';
  return (
    <View style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
      <View style={[styles.avatar, { backgroundColor: c.primary }]}>
        <Text style={[styles.avatarText, { color: c.primaryText, fontFamily: Fonts.serif }]}>
          {match.nickname.slice(0, 1)}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.nickname, { color: c.text }]}>{match.nickname}</Text>
        <Text style={[styles.meta, { color: c.textSecondary }]}>
          {koreanAge(match.birthYear)}세 · {genderLabel} · {match.region}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  topTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 25, paddingBottom: 40 },
  lead: { fontSize: 14, lineHeight: 21, marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700' },
  cardBody: { marginLeft: 16, flex: 1 },
  nickname: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 4 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
