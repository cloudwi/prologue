import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Radius, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteFeedPost, getFeed, setFeedHeart, unlockFeedProfile, type FeedPost, type FeedSort } from '@/lib/feed';
import { haptics } from '@/lib/haptics';
import { INK_PRICE } from '@/lib/ink';
import { useSession } from '@/lib/session';
import { SignupGate } from '@/components/signup-gate';
import { ScreenLoadError } from '@/components/screen-load-error';
import { promptReport } from '@/lib/reports';
import { track } from '@/lib/analytics';

export default function FeedScreen() {
  const session = useSession();
  if (session.loading) return null;
  if (session.error) return <ScreenLoadError title="로그인 정보를 불러오지 못했어요" onRetry={session.retry} retrying={session.refreshing} />;
  if (!session.signedIn) return <SignupGate mode="guest" icon="newspaper-outline" title="사람들의 답을 만나보세요" lines={['가입하면 서로의 생각에 마음을 남길 수 있어요.']} />;
  return <FeedBoard />;
}

function FeedBoard() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<FeedSort>('latest');
  const feed = useQuery({ queryKey: ['feed', sort], queryFn: () => getFeed(sort) });
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => { track('feed_opened'); }, []);

  const refresh = useCallback(() => void feed.refetch(), [feed]);

  function openProfile(post: FeedPost) {
    if (post.mine) return;
    const run = async () => {
      setOpening(post.id);
      try {
        const result = await unlockFeedProfile(post.id);
        track('feed_profile_opened', { spent: result.spent });
        queryClient.setQueryData<FeedPost[]>(['feed', sort], (old) => old?.map((p) => p.id === post.id ? { ...p, profileUnlocked: true } : p));
        router.push({ pathname: '/peer', params: { data: JSON.stringify(result.peer), question: post.prompt } });
      } catch (e) {
        const message = e instanceof Error ? e.message : '잠시 후 다시 시도해주세요';
        if (message.includes('잉크가 부족')) {
          Alert.alert('잉크가 부족해요', '충전하고 프로필을 열어볼까요?', [
            { text: '다음에', style: 'cancel' },
            { text: '충전하러 가기', onPress: () => router.push('/my/ink-topup') },
          ]);
        } else Alert.alert('프로필을 열지 못했어요', message);
      } finally { setOpening(null); }
    };
    if (post.profileUnlocked) void run();
    else Alert.alert('프로필을 열까요?', `잉크 ${INK_PRICE.PROFILE_UNLOCK}을 사용하면 사진과 소개를 볼 수 있어요.`, [
      { text: '취소', style: 'cancel' }, { text: '잉크 쓰기', onPress: () => void run() },
    ]);
  }

  async function toggleHeart(post: FeedPost) {
    const liked = !post.hearted;
    queryClient.setQueryData<FeedPost[]>(['feed', sort], (old) => old?.map((p) => p.id === post.id
      ? { ...p, hearted: liked, heartCount: Math.max(0, p.heartCount + (liked ? 1 : -1)) } : p));
    if (liked) haptics.select();
    try {
      await setFeedHeart(post.id, liked);
      track('feed_heart_toggled', { liked });
      if (sort === 'hearts') void feed.refetch();
    }
    catch { void feed.refetch(); }
  }

  function remove(post: FeedPost) {
    Alert.alert('피드에서 내릴까요?', '원래 답변은 그대로 남아 있어요.', [
      { text: '취소', style: 'cancel' },
      { text: '내리기', style: 'destructive', onPress: async () => {
        try { await deleteFeedPost(post.id); void feed.refetch(); }
        catch (e) { Alert.alert('내리지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요'); }
      } },
    ]);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={[styles.title, { color: c.text }]}>피드</Text><Text style={[styles.subtitle, { color: c.textSecondary }]}>서로의 답에서 시작하는 이야기</Text></View>
        <View style={[styles.sort, { backgroundColor: c.backgroundSelected }]}>
          {(['latest', 'hearts'] as const).map((value) => <Pressable key={value} onPress={() => { if (value !== sort) { setSort(value); track('feed_sort_changed', { sort: value }); } }} style={[styles.sortButton, sort === value && { backgroundColor: c.backgroundElement }]}><Text style={[styles.sortLabel, { color: sort === value ? c.text : c.textSecondary }]}>{value === 'latest' ? '최신' : '인기'}</Text></Pressable>)}
        </View>
      </View>
      {feed.isPending ? <View style={styles.center}><ActivityIndicator color={c.primary} /></View> : feed.isError ? (
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>피드를 불러오지 못했어요</Text><Pressable onPress={refresh}><Text style={[styles.retry, { color: c.primaryStrong }]}>다시 시도</Text></Pressable></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={refresh} tintColor={c.primary} />} contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + BottomTabInset + 24 }]}>
          {(feed.data ?? []).length === 0 ? <View style={styles.empty}><Ionicons name="chatbubble-ellipses-outline" size={38} color={c.textSecondary} /><Text style={[styles.emptyTitle, { color: c.text }]}>아직 올라온 답이 없어요</Text><Text style={[styles.emptyBody, { color: c.textSecondary }]}>오늘의 질문이나 취향 카드에서 첫 답을 올려보세요.</Text></View> :
            feed.data!.map((post) => (
              <View key={post.id} style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                <View style={styles.authorRow}>
                  <View style={[styles.gender, { backgroundColor: c.backgroundSelected }]}><Ionicons name={post.gender === 'FEMALE' ? 'female' : 'male'} size={16} color={c.primaryStrong} /></View>
                  <View style={styles.authorText}><Text style={[styles.nickname, { color: c.text }]}>{post.nickname}</Text><Text style={[styles.kind, { color: c.textSecondary }]}>{post.sourceType === 'DAILY' ? '오늘의 문답' : '취향 카드'} · {relativeTime(post.createdAt)}</Text></View>
                  <Pressable onPress={() => post.mine ? remove(post) : promptReport({ feedPostId: post.id })} hitSlop={10} accessibilityLabel={post.mine ? '내 피드 글 관리' : '피드 글 신고'}><Ionicons name="ellipsis-horizontal" size={20} color={c.textSecondary} /></Pressable>
                </View>
                <Text style={[styles.prompt, { color: c.textSecondary }]}>{post.prompt}</Text>
                <Text style={[styles.answer, { color: c.text }]}>{post.content}</Text>
                <View style={[styles.actions, { borderTopColor: c.border }]}>
                  <Pressable onPress={() => void toggleHeart(post)} style={styles.action} accessibilityLabel={post.hearted ? '하트 취소' : '하트'}><Ionicons name={post.hearted ? 'heart' : 'heart-outline'} size={21} color={post.hearted ? c.primary : c.textSecondary} /><Text style={[styles.count, { color: post.hearted ? c.primaryStrong : c.textSecondary }]}>{post.heartCount || ''}</Text></Pressable>
                  {!post.mine && <Pressable onPress={() => openProfile(post)} disabled={opening === post.id} style={styles.profileAction}><Ionicons name={post.profileUnlocked ? 'person-outline' : 'water-outline'} size={17} color={c.textSecondary} /><Text style={[styles.profileLabel, { color: c.textSecondary }]}>{opening === post.id ? '여는 중' : post.profileUnlocked ? '프로필 보기' : `프로필 · ${INK_PRICE.PROFILE_UNLOCK}`}</Text></Pressable>}
                </View>
              </View>
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1440)}일 전`;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { ...Type.display }, subtitle: { ...Type.caption, marginTop: 3 },
  sort: { flexDirection: 'row', padding: 3, borderRadius: Radius.pill }, sortButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill }, sortLabel: { ...Type.caption, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }, retry: { ...Type.button }, list: { paddingHorizontal: 16, gap: 14 },
  empty: { alignItems: 'center', paddingTop: 100, paddingHorizontal: 30 }, emptyTitle: { ...Type.title, marginTop: 18 }, emptyBody: { ...Type.body, textAlign: 'center', marginTop: 8 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, padding: 18 }, authorRow: { flexDirection: 'row', alignItems: 'center' }, gender: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  authorText: { flex: 1, marginLeft: 10 }, nickname: { ...Type.label }, kind: { ...Type.caption, marginTop: 1 }, prompt: { ...Type.caption, marginTop: 22 }, answer: { ...Type.read, marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth }, action: { flexDirection: 'row', alignItems: 'center', minWidth: 52 }, count: { ...Type.caption, marginLeft: 5 },
  profileAction: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 }, profileLabel: { ...Type.caption, fontWeight: '600' },
});
