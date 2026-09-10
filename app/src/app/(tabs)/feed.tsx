import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Radius, Type, type ThemeColors } from '@/constants/theme';
import { Skeleton, SkeletonLines, SkeletonScreen } from '@/components/skeleton';
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => { track('feed_opened'); }, []);

  const refresh = useCallback(() => void feed.refetch(), [feed]);

  function openProfile(post: FeedPost) {
    if (post.mine) return;
    const run = async () => {
      setOpening(post.id);
      try {
        const result = await unlockFeedProfile(post.id);
        track('feed_profile_opened', { spent: result.spent });
        // 정렬 탭마다 캐시가 따로라 전부 표시를 바꾸고, 선명한 사진은 서버가 다시 내려줘야 하므로 재조회한다.
        queryClient.setQueriesData<FeedPost[]>({ queryKey: ['feed'] }, (old) => old?.map((p) => p.id === post.id ? { ...p, profileUnlocked: true } : p));
        void queryClient.invalidateQueries({ queryKey: ['feed'] });
        if (result.spent) void queryClient.invalidateQueries({ queryKey: ['ink', 'balance'] });
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
      {feed.isPending ? <FeedSkeleton c={c} /> : feed.isError ? (
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>피드를 불러오지 못했어요</Text><Pressable onPress={refresh}><Text style={[styles.retry, { color: c.primaryStrong }]}>다시 시도</Text></Pressable></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={refresh} tintColor={c.primary} />} contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + BottomTabInset + 24 }]}>
          {(feed.data ?? []).length === 0 ? <View style={styles.empty}><Ionicons name="chatbubble-ellipses-outline" size={38} color={c.textSecondary} /><Text style={[styles.emptyTitle, { color: c.text }]}>아직 올라온 답이 없어요</Text><Text style={[styles.emptyBody, { color: c.textSecondary }]}>오늘의 질문이나 취향 카드에서 첫 답을 올려보세요.</Text></View> :
            feed.data!.map((post) => (
              <View key={post.id} style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                <View style={styles.authorRow}>
                  <View style={[styles.authorPhoto, { backgroundColor: c.backgroundSelected }]}>
                    {post.photoUrl ? (
                      <Image
                        source={{ uri: post.photoUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        accessibilityLabel={`${post.nickname}님의 프로필 사진`}
                      />
                    ) : post.photoPreview ? (
                      <>
                        <Image
                          source={{ uri: post.photoPreview }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          blurRadius={5}
                          accessibilityLabel={`${post.nickname}님의 흐린 프로필 사진`}
                        />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background, opacity: 0.18 }]} />
                      </>
                    ) : <Ionicons name="person" size={15} color={c.textSecondary} />}
                  </View>
                  <View style={styles.authorText}><Text style={[styles.nickname, { color: c.text }]}>{post.nickname}</Text><Text style={[styles.kind, { color: c.textSecondary }]}>{post.sourceType === 'DAILY' ? '오늘의 문답' : '취향 카드'} · {relativeTime(post.createdAt)}</Text></View>
                  <Pressable onPress={() => post.mine ? remove(post) : promptReport({ feedPostId: post.id })} hitSlop={10} accessibilityLabel={post.mine ? '내 피드 글 관리' : '피드 글 신고'}><Ionicons name="ellipsis-horizontal" size={20} color={c.textSecondary} /></Pressable>
                </View>
                <Text style={[styles.prompt, { color: c.textSecondary }]}>{post.prompt}</Text>
                <Text numberOfLines={expanded[post.id] ? undefined : 6} style={[styles.answer, { color: c.text }]}>{post.content}</Text>
                {isLong(post.content) && (
                  <Pressable onPress={() => setExpanded((v) => ({ ...v, [post.id]: !v[post.id] }))} hitSlop={6} style={styles.moreBtn}>
                    <Text style={[styles.link, { color: c.primaryStrong }]}>{expanded[post.id] ? '접기' : '더보기'}</Text>
                  </Pressable>
                )}
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

/**
 * 6줄에서 잘릴 만한 글인지.
 *
 * 글자 수만 세면 "선택지\n메모" 형태의 취향 카드 답변처럼 짧지만 줄이 많은 글을 놓쳐서,
 * 본문이 잘렸는데도 더보기가 안 뜬다. 줄 수도 함께 본다.
 */
/**
 * 피드 카드가 들어올 자리.
 *
 * 다섯 탭 중 유일하게 스켈레톤이 없어 화면 정중앙에 스피너 하나만 돌던 곳이다. 스피너는
 * 위치부터 틀렸다 — 카드는 위에서부터 쌓이는데 스피너는 한가운데 있으니, 채워지는 순간
 * 화면이 통째로 갈아치워졌다. 정렬(최신/인기)을 바꿀 때마다 쿼리 키가 달라져 목록이 사라지고
 * 다시 한가운데로 돌아가는 깜빡임도 여기서 났다.
 *
 * 카드 조판이 정형화돼 있어(사진 40×50 + 닉네임·종류 + 물음 + 본문 + 액션바) 자리를 그대로
 * 세울 수 있다. 실제 card 스타일을 그대로 쓰므로 테두리와 여백이 저절로 맞는다.
 */
function FeedSkeleton({ c }: { c: ThemeColors }) {
  return (
    <SkeletonScreen style={styles.list}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
          <View style={styles.authorRow}>
            <Skeleton c={c} width={40} height={50} radius={12} />
            <View style={styles.authorText}>
              <Skeleton c={c} width={i % 2 === 0 ? 84 : 66} height={15} />
              <Skeleton c={c} width={128} height={12} style={styles.skeletonKind} />
            </View>
          </View>
          <Skeleton c={c} width="58%" height={12} style={styles.skeletonPrompt} />
          <SkeletonLines c={c} lines={i === 1 ? 2 : 4} lineHeight={14} gap={10} style={styles.skeletonAnswer} />
          <View style={[styles.actions, { borderTopColor: c.border }]}>
            <Skeleton c={c} width={44} height={18} />
            <Skeleton c={c} width={44} height={18} style={styles.skeletonAction} />
          </View>
        </View>
      ))}
    </SkeletonScreen>
  );
}

function isLong(content: string) {
  return content.length > 140 || content.split('\n').length > 6;
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
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, padding: 18 }, authorRow: { flexDirection: 'row', alignItems: 'center' }, authorPhoto: { width: 40, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  authorText: { flex: 1, marginLeft: 10 }, nickname: { ...Type.label }, kind: { ...Type.caption, marginTop: 1 }, prompt: { ...Type.caption, marginTop: 22 }, answer: { ...Type.read, marginTop: 8 },
  moreBtn: { marginTop: 8, alignSelf: 'flex-start' }, link: { ...Type.label },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth }, action: { flexDirection: 'row', alignItems: 'center', minWidth: 52 }, count: { ...Type.caption, marginLeft: 5 },
  skeletonKind: { marginTop: 5 }, skeletonPrompt: { marginTop: 22 }, skeletonAnswer: { marginTop: 10 }, skeletonAction: { marginLeft: 24 },
  profileAction: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 }, profileLabel: { ...Type.caption, fontWeight: '600' },
});
