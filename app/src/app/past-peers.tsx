import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Avatar } from '@/components/avatar';
import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getPastPeers, type PastPeer } from '@/lib/daily';

/**
 * 지난 상대 — 최근 한 달 안에 소개된 상대의 그리드.
 * 발견 탭은 "오늘"로 끝나야 해서, 여운은 한 줄 진입점 뒤의 이 화면이 맡는다.
 * 사흘이 지난 상대는 사라지지 않고 잠긴 채로 남는다 — 다시 보려면 우표 한 장.
 */
export default function PastPeersScreen() {
  const c = useTheme();
  const [loading, setLoading] = useState(true);
  const [peers, setPeers] = useState<PastPeer[]>([]);

  useEffect(() => {
    let active = true;
    getPastPeers()
      .then((p) => active && setPeers(p))
      .catch((e) => {
        if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <SubScreen title="지난 상대" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : peers.length === 0 ? (
        <View style={[styles.flex, styles.center, styles.emptyPad]}>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            아직 지난 상대가 없어요.{'\n'}오늘의 질문에 답하고 새 인연을 만나보세요.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            소개된 지 사흘이 지나면 프로필이 닫혀요. 우표 한 장으로 다시 열 수 있어요.
          </Text>
          <PastPeerGrid items={peers} c={c} />
        </ScrollView>
      )}
    </SubScreen>
  );
}

/** 며칠 전 공개됐는지 — 어제/2일 전/… */
function daysAgoLabel(revealedAt: string): string {
  const days = Math.max(1, Math.round((Date.now() - new Date(revealedAt).getTime()) / 86_400_000));
  return days === 1 ? '어제' : `${days}일 전`;
}

/** 지난 상대 그리드 — 한 줄 세 명씩 세로로 쌓는다. */
function PastPeerGrid({ items, c }: { items: PastPeer[]; c: ThemeColors }) {
  const [width, setWidth] = useState(0);
  const cardWidth = (width - PAST_GRID_GAP * (PAST_GRID_COLUMNS - 1)) / PAST_GRID_COLUMNS;

  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 &&
        items.map((p, i) => <PastPeerCard key={p.peer.peerAnswerId ?? i} item={p} width={cardWidth} c={c} />)}
    </View>
  );
}

const PAST_GRID_COLUMNS = 3;
const PAST_GRID_GAP = 12;

/** 지난 상대 미니 카드 — 사진과 이름만. 자세한 건 상세(청첩장)에서. 폭은 그리드가 계산해 내려준다. */
function PastPeerCard({ item, width, c }: { item: PastPeer; width: number; c: ThemeColors }) {
  const router = useRouter();
  const locked = item.peer.locked;
  // 잠기면 서버가 사진을 비워 보낸다 — 여기서 다시 가릴 필요는 없고, 아바타로 자연히 떨어진다
  const photo = item.peer.photoUrls[0];
  const unlockedCount = (item.answers ?? []).filter((a) => a.unlocked && a.content).length;
  // 가로 카드 시절의 104×130 비율을 그대로 가져간다.
  const photoSize = { width, height: width * 1.25 };

  function openDetail() {
    router.push({
      pathname: '/peer',
      params: { data: JSON.stringify(item.peer), question: item.question, answers: JSON.stringify(item.answers ?? []) },
    });
  }

  return (
    <Pressable onPress={openDetail} style={({ pressed }) => [{ width, opacity: pressed ? 0.7 : 1 }]}>
      {photo ? (
        <Image source={{ uri: photo }} style={[styles.photo, photoSize, { backgroundColor: c.backgroundSelected }]} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.photo, photoSize, styles.avatarWrap, { backgroundColor: c.backgroundSelected }]}>
          <Avatar avatarId={item.peer.avatarId} nickname={item.peer.nickname ?? undefined} size={44} c={c} />
        </View>
      )}
      <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
        {item.peer.nickname ?? '이름 없음'}
      </Text>
      <Text style={[styles.day, { color: c.textSecondary }]}>
        {locked ? `${daysAgoLabel(item.revealedAt)} · 잠김` : daysAgoLabel(item.revealedAt)}
        {!locked && unlockedCount > 1 ? ` · 답변 ${unlockedCount}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },

  emptyPad: { paddingHorizontal: 32 },
  emptyText: { fontSize: 13.5, lineHeight: 21, textAlign: 'center' },

  sub: { fontSize: 13, lineHeight: 19, marginBottom: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: PAST_GRID_GAP },
  photo: { borderRadius: Radius.md },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13.5, fontWeight: '600', marginTop: 7 },
  day: { fontSize: 12, marginTop: 2 },
});
