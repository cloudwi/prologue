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
 * 사흘이 지난 상대는 사라지지 않고 잠긴 채로 남는다 — 다시 보려면 잉크 8.
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
          {/* 사라진다고 먼저 말하지 않는다 — 같은 규칙이라도 기간으로 적으면 재촉이 아니라 여유가 된다.
              카드의 "2일 남음"이 무엇을 세는지 알려주는 역할도 겸한다. */}
          <Text style={[styles.sub, { color: c.textSecondary }]}>소개는 3일 동안 이어져요.</Text>
          <PastPeerGrid items={peers} c={c} />
        </ScrollView>
      )}
    </SubScreen>
  );
}

/**
 * 프로필이 닫히기까지 남은 시간.
 *
 * 언제 만났는지보다 얼마나 남았는지가 지금 할 수 있는 일을 말해준다.
 * 하루가 안 남았으면 시간으로 보여준다 — "1일 남음"은 스무 시간과 두 시간을 같게 만든다.
 */
function remainingLabel(closesAt: string): string {
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return '곧 닫혀요';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return '곧 닫혀요';
  if (hours < 24) return `${hours}시간 남음`;
  return `${Math.floor(hours / 24)}일 남음`;
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

/**
 * 지난 상대 미니 카드 — 사진과 이름, 그리고 내가 이 사람에게 무엇을 건넸는지(하트·편지) 작은 표시.
 * 내가 보낸 하트를 따로 모아 보는 화면은 없다 — 하트는 신호일 뿐이라 목록으로 세지 않는다.
 * 대신 만난 사람들 사이에서 "이 사람에겐 이미 보냈지"를 한눈에 알 수 있게 여기 표시한다.
 * 자세한 건 상세(청첩장)에서. 폭은 그리드가 계산해 내려준다.
 */
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
      <View style={photoSize}>
        {photo ? (
          <Image source={{ uri: photo }} style={[styles.photo, photoSize, { backgroundColor: c.backgroundSelected }]} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.photo, photoSize, styles.avatarWrap, { backgroundColor: c.backgroundSelected }]}>
            <Avatar avatarId={item.peer.avatarId} nickname={item.peer.nickname ?? undefined} size={44} c={c} />
          </View>
        )}
        {/* 내가 건넨 것 — 하트(보냄)·우표(편지 보냄). 사진 위 구석에 작게, 상대의 얼굴을 가리지 않게. */}
        {(item.peer.hearted || item.peer.mailSent) && (
          <View style={styles.badges}>
            {item.peer.mailSent && (
              <View style={[styles.badge, { backgroundColor: c.primary }]} accessibilityLabel="편지를 보냈어요">
                <Image source={require('@/assets/images/stamp.png')} style={styles.badgeIcon} contentFit="contain" tintColor={c.primaryText} />
              </View>
            )}
            {item.peer.hearted && (
              <View style={[styles.badge, { backgroundColor: c.primary }]} accessibilityLabel="하트를 보냈어요">
                <Image source={require('@/assets/images/match-heart.png')} style={styles.badgeIcon} contentFit="contain" tintColor={c.primaryText} />
              </View>
            )}
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={[styles.name, { color: c.text }]}>
        {item.peer.nickname ?? '이름 없음'}
      </Text>
      <Text style={[styles.day, { color: locked ? c.textSecondary : c.primaryStrong }]}>
        {locked ? '잠김' : item.closesAt ? remainingLabel(item.closesAt) : '계속 열림'}
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
  badges: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', gap: 4 },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeIcon: { width: 12, height: 12 },
  name: { fontSize: 13.5, fontWeight: '600', marginTop: 7 },
  day: { fontSize: 12, marginTop: 2 },
});
