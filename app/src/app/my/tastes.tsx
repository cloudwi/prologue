import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Skeleton, SkeletonList, SkeletonTextCard } from '@/components/skeleton';
import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMyTastes, type MyTaste } from '@/lib/taste';

/**
 * 내가 고른 취향 — 카드마다 어느 쪽을 골랐는지, 덧붙인 한 줄까지.
 *
 * 남긴 답([my/answers])과 같은 성격의 본인 전용 서랍이다. 다만 이쪽은 상대에게 **겹치는 것만**
 * 보인다 — 백 장을 넘겨도 상대가 보는 건 둘이 똑같이 고른 몇 장뿐이다.
 */
export default function MyTastesScreen() {
  const c = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tastes, setTastes] = useState<MyTaste[]>([]);

  useEffect(() => {
    let active = true;
    getMyTastes()
      .then((list) => active && setTastes(list))
      .catch((e) => {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <SubScreen title="내가 고른 취향" c={c} onSave={() => router.push('/taste-cards')} saveLabel="더 넘기기">
      {loading ? (
        <SkeletonList c={c}>
          <Skeleton c={c} width={78} height={13} />
          <SkeletonTextCard c={c} bodyLines={2} />
          <SkeletonTextCard c={c} bodyLines={2} />
        </SkeletonList>
      ) : tastes.length === 0 ? (
        <View style={[styles.flex, styles.center, styles.emptyPad]}>
          <Text style={[styles.emptyTitle, { color: c.text, fontFamily: Fonts.serif }]}>아직 고른 카드가 없어요</Text>
          <Text style={[styles.emptyHint, { color: c.textSecondary }]}>
            둘 중 하나를 고르기만 하면 돼요.{'\n'}겹치는 취향이 있는 사람이 먼저 소개돼요.
          </Text>
          <Pressable
            onPress={() => router.push('/taste-cards')}
            style={[styles.button, { backgroundColor: c.primary }]}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonLabel, { color: c.primaryText }]}>카드 넘기러 가기</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tastes.map((taste) => (
            <View key={taste.cardId} style={[styles.card, { backgroundColor: c.backgroundElement }]}>
              <Text style={[styles.prompt, { color: c.textSecondary }]}>{taste.prompt}</Text>
              <Text style={[styles.choice, { color: c.text }]}>{taste.choice}</Text>
              {taste.note && <Text style={[styles.note, { color: c.textSecondary }]}>“{taste.note}”</Text>}
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

  card: { borderRadius: Radius.md, padding: 18, marginBottom: 12 },
  prompt: { ...Type.caption },
  choice: { ...Type.read, fontWeight: '600', marginTop: 6 },
  note: { ...Type.body, marginTop: 8 },

  emptyPad: { paddingHorizontal: 32 },
  emptyTitle: { ...Type.title },
  emptyHint: { ...Type.body, textAlign: 'center', marginTop: 10 },
  button: { marginTop: 22, borderRadius: Radius.pill, paddingHorizontal: 28, paddingVertical: 13 },
  buttonLabel: { ...Type.button },
});
