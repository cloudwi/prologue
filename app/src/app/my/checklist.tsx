import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMyLetters } from '@/lib/letters';
import { getMyProfile } from '@/lib/member';
import { completionRate, profileChecklist, type ChecklistItem } from '@/lib/profile-form';

/**
 * 프로필 완성도 — 무엇을 더 하면 되는지 한 목록으로.
 *
 * MY의 막대는 "얼마나 찼는가"만 말한다. 그 막대를 누른 사람이 알고 싶은 건 **무엇이 비었나**라,
 * 여기서는 다 채운 줄까지 함께 보여준다 — 해낸 것이 보여야 남은 것도 할 만해 보인다.
 * 남은 줄이 위로 온다: 목록의 일은 자랑이 아니라 다음 한 걸음을 가리키는 것이다.
 */
export default function ChecklistScreen() {
  const c = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [profile, letters] = await Promise.all([
          getMyProfile(),
          // 문답 수는 곁가지다 — 못 읽어도 나머지 목록은 그대로 보여준다.
          getMyLetters().then((l) => l.length).catch(() => undefined),
        ]);
        if (!active || !profile) return;
        setItems(profileChecklist(profile, letters));
      } catch (e) {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const rate = completionRate(items);
  const remaining = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <SubScreen title="프로필 완성도" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.rate, { color: c.text }]}>{Math.round(rate * 100)}%</Text>
          <View style={[styles.track, { backgroundColor: c.backgroundSelected }]}>
            <View style={[styles.fill, { backgroundColor: c.primary, width: `${Math.round(rate * 100)}%` }]} />
          </View>
          <Text style={[styles.lead, { color: c.textSecondary }]}>
            {remaining.length === 0
              ? '다 채웠어요. 이제 오늘의 질문에 답하는 일만 남았어요.'
              : `${remaining.length}가지를 더 채우면 소개가 더 잘 돼요.`}
          </Text>

          {remaining.map((item) => (
            <Item key={item.key} item={item} c={c} onPress={() => router.push(item.href as never)} />
          ))}
          {done.length > 0 && <Text style={[styles.doneHead, { color: c.textSecondary }]}>이미 채운 것</Text>}
          {done.map((item) => (
            <Item key={item.key} item={item} c={c} onPress={() => router.push(item.href as never)} />
          ))}
        </ScrollView>
      )}
    </SubScreen>
  );
}

function Item({
  item,
  c,
  onPress,
}: {
  item: ChecklistItem;
  c: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: c.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons
        name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={item.done ? c.primary : c.textSecondary}
      />
      <View style={styles.itemBody}>
        <Text style={[styles.itemLabel, { color: c.text, opacity: item.done ? 0.55 : 1 }]}>{item.label}</Text>
        {!item.done && <Text style={[styles.itemHint, { color: c.textSecondary }]}>{item.hint}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },

  rate: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
  track: { height: 6, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  lead: { ...Type.body, marginTop: 12, marginBottom: 20 },

  doneHead: { ...Type.caption, marginTop: 22, marginBottom: 8, paddingLeft: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.md, padding: 16, marginBottom: 8 },
  itemBody: { flex: 1 },
  itemLabel: { ...Type.body, fontWeight: '600' },
  itemHint: { ...Type.caption, marginTop: 3 },
});
