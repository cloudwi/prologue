import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoPager } from '@/components/photo-pager';
import { avatarSource } from '@/constants/avatars';
import { BottomTabInset, Fonts, Radius, type ThemeColors } from '@/constants/theme';
import { resetAnalytics } from '@/lib/analytics';
import { APPEARANCE_LABEL, useAppearance } from '@/lib/appearance';
import { clearTokens } from '@/lib/auth-storage';
import { getMyProfile } from '@/lib/member';
import { disableNotifications, notificationsEnabled, reenableNotifications } from '@/lib/notifications';
import { ageFrom, nextStep } from '@/lib/profile-form';
import { getJobStatus } from '@/lib/job';
import { useTheme } from '@/hooks/use-theme';
import { useRefreshOnFocus, useSessionGuard } from '@/lib/query';
import { Skeleton } from '@/components/skeleton';

/**
 * MY 허브 — 조회 전용.
 * 편집은 전부 하위 화면으로 내려가고, 여기서는 대표 사진과 메뉴만 보여준다.
 * (예전에는 이 화면 자체가 거대한 편집 폼이라 기능을 더할 자리가 없었다)
 */
export default function MyScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useAppearance();

  const queryClient = useQueryClient();

  /*
   * 내 화면이 쓰는 것 셋 — 프로필·직장 인증·알림 스위치.
   * 하위 편집 화면에서 돌아오면 다시 읽어 최신 상태를 반영한다(useRefreshOnFocus).
   * 캐시가 있으면 그동안 이전 값이 그대로 보여, 편집 후 돌아올 때 화면이 비지 않는다.
   */
  const meQuery = useQuery({
    queryKey: ['me', 'profile'],
    queryFn: async () => {
      const [profile, job, notifyOn] = await Promise.all([
        getMyProfile(),
        getJobStatus().catch(() => ({ verified: false, domain: null })),
        // null이면 아직 확인 전 — 값이 잠깐 '꺼짐'으로 보였다 바뀌는 깜빡임을 막는다.
        notificationsEnabled().catch(() => null),
      ]);
      return { profile, job, notifyOn };
    },
  });

  const profile = meQuery.data?.profile ?? null;
  const job = meQuery.data?.job ?? null;
  const notifyOn = meQuery.data?.notifyOn ?? null;

  /** 알림 스위치를 그 자리에서 바꾼다 — 서버에 다시 묻지 않는다. */
  const setNotifyOn = useCallback(
    (on: boolean | null) => {
      queryClient.setQueryData(['me', 'profile'], (old?: { notifyOn: boolean | null }) =>
        old ? { ...old, notifyOn: on } : old,
      );
    },
    [queryClient],
  );

  const { refetch: refetchMe } = meQuery;
  const refresh = useCallback(() => void refetchMe(), [refetchMe]);
  useRefreshOnFocus(refresh);

  const toLogin = useCallback(() => router.replace('/'), [router]);
  useSessionGuard(meQuery.error, toLogin);

  async function toggleNotifications() {
    if (notifyOn === null) return;
    if (notifyOn) {
      await disableNotifications();
      setNotifyOn(false);
      return;
    }
    // 기기 설정에서 알림을 막아뒀다면 다시 켜도 켜지지 않는다 — 그 사실을 알려준다
    const on = await reenableNotifications();
    setNotifyOn(on);
    if (!on) {
      Alert.alert('알림을 켤 수 없어요', '휴대폰 설정에서 프롤로그의 알림 권한을 허용해 주세요.');
    }
  }

  async function logout() {
    resetAnalytics();
    await clearTokens();
    router.replace('/');
  }

  function confirmLogout() {
    Alert.alert('로그아웃', '다시 로그인하려면 이메일 인증이 필요해요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  }

  if (meQuery.isPending && !meQuery.data) {
    // 생애 첫 로딩 — 프로필 카드와 메뉴 줄들이 들어올 자리.
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.content}>
            <Skeleton c={c} height={168} radius={Radius.lg} />
            <View style={styles.skeletonMenu}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={52} c={c} radius={Radius.md} />
              ))}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const photos = profile?.photoUrls ?? [];
  const age = profile ? ageFrom(profile.birthDate) : null;
  const todo = profile ? nextStep(profile) : null;
  const hasPhoto = photos.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* 탭바는 콘텐츠 위에 떠 있다 — 마지막 줄(회원 탈퇴)이 가리지 않도록 탭바 높이만큼 더 비워둔다. */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BottomTabInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView edges={['top']}>
          {/*
           * 프로필 카드 — 사진과 이름을 한 장의 카드로 묶는다.
           * 사진은 옆으로 넘겨 보는 페이저: 카드 전체를 누르게 하면 사진을 넘기려다
           * 상세로 튕겨 들어가서, 누르는 곳은 아래 이름 줄 하나로 좁혔다.
           */}
          <View style={[styles.hero, { backgroundColor: c.backgroundElement }]}>
            {/* 사진이 없으면 사진 자리를 아예 만들지 않는다 — 빈 상자 가운데 아바타만 덩그러니 놓이는 게 더 초라하다. */}
            {hasPhoto && <PhotoPager photos={photos} backgroundColor={c.backgroundSelected} />}

            <Pressable
              onPress={() => router.push(hasPhoto ? '/my/preview' : '/my/edit-photos')}
              style={({ pressed }) => [styles.heroText, { opacity: pressed ? 0.6 : 1 }]}
            >
              {!hasPhoto && profile?.avatarId != null && (
                <View style={[styles.heroThumb, { backgroundColor: c.backgroundSelected }]}>
                  <Image source={avatarSource(profile.avatarId)!} style={styles.fill} contentFit="cover" />
                </View>
              )}
              <View style={styles.flex}>
                <Text style={[styles.heroName, { color: c.text, fontFamily: Fonts.serif }]}>
                  {profile?.nickname ?? '프로필 없음'}
                </Text>
                <Text style={[styles.heroMeta, { color: c.textSecondary }]}>
                  {hasPhoto
                    ? [age != null ? `${age}세` : null, profile?.region].filter(Boolean).join(' · ')
                    : '아직 사진이 없어요'}
                </Text>
              </View>
              <Text style={[styles.heroLink, { color: c.primaryStrong }]}>{hasPhoto ? '미리보기 ›' : '사진 올리기 ›'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>

        {/*
         * 직장 인증 — '다음 한 가지'에 섞지 않고 자기 자리를 준다.
         *
         * 그 줄은 프로필을 다 채운 사람에게만 차례가 돌아오는데, 인증은 프로필 완성과
         * 다른 축이다. 사진이 두 장이든 여섯 장이든 인증한 사람과 안 한 사람은 갈린다.
         * 그래서 인증할 때까지 계속 서 있고, 받는 것(배지)을 말이 아니라 모양으로 먼저 보여준다 —
         * 상대 카드에서 보던 그 칩이 내 것이 된다는 게 한 문장 설명보다 빠르다.
         */}
        {job?.verified === false && (
          <Pressable
            onPress={() => router.push('/my/job-verify')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.jobCard, { backgroundColor: c.primary + '1F', opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={styles.flex}>
              <View style={[styles.jobBadgePreview, { backgroundColor: c.primary }]}>
                <Ionicons name="briefcase" size={12} color={c.primaryText} />
                <Text style={{ color: c.primaryText, fontSize: 12.5, fontWeight: '700' }}>직장 인증</Text>
              </View>
              <Text style={[styles.jobTitle, { color: c.text }]}>회사 메일로 인증하고 배지 받기</Text>
              <Text style={[styles.jobHint, { color: c.textSecondary }]}>
                1분이면 끝나요. 회사 이름은 공개되지 않고, 같은 회사 사람과는 서로 소개되지 않아요.
              </Text>
            </View>
            <Text style={[styles.chevron, { color: c.primaryStrong }]}>›</Text>
          </Pressable>
        )}

        {/* 다음 한 가지 — 완성도 퍼센트 대신 지금 할 행동 하나만 제안한다. */}
        {todo && (
          <Pressable
            onPress={() => router.push(todo.href as never)}
            style={({ pressed }) => [
              styles.todo,
              { backgroundColor: c.backgroundSelected, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={styles.flex}>
              <Text style={[styles.todoLabel, { color: c.text }]}>{todo.label}</Text>
              <Text style={[styles.todoHint, { color: c.textSecondary }]}>{todo.hint}</Text>
            </View>
            <Text style={[styles.chevron, { color: c.primaryStrong }]}>›</Text>
          </Pressable>
        )}

        {/*
         * 줄마다 설명을 달면 화면이 글자로 가득 찬다. 라벨만으로 뜻이 통하면 설명을 두지 않고,
         * 값이 있는 항목(사진 장수·현재 테마)은 두 번째 줄 대신 오른쪽에 짧게 적는다.
         * 편집 화면은 각자 자기 것만 다룬다 — 사진을 고치러 들어갔다가 기본 정보로 새지 않도록.
         */}
        <Section title="프로필" c={c}>
          <Row
            label="자기소개"
            value={profile?.bio?.trim() ? '작성함' : '아직 없음'}
            onPress={() => router.push('/my/edit-bio')}
            c={c}
          />
          <Row label="사진" value={`${photos.length}장`} onPress={() => router.push('/my/edit-photos')} c={c} />
          <Row label="기본 정보" onPress={() => router.push('/my/edit-basic')} c={c} />
          <Row label="상세 소개" onPress={() => router.push('/my/edit-detail')} c={c} />
          <Row label="프로필 문답" onPress={() => router.push('/my/letters')} c={c} />
          <Row label="상대에게 보이는 화면" onPress={() => router.push('/my/preview')} c={c} last />
        </Section>

        {/* 기록 — 프로필과 별개의 내 서랍. 상대에게 보이지 않는 본인 전용 목록이라 프로필 카드에 섞지 않는다. */}
        <Section title="기록" c={c}>
          <Row label="내가 남긴 답" onPress={() => router.push('/my/answers')} c={c} last />
        </Section>

        <Section title="지갑" c={c}>
          <Row
            label="잉크"
            onPress={() => router.push('/my/ink')}
            c={c}
          />
          <Row label="친구 초대" value="서로 잉크 100" onPress={() => router.push('/my/invite')} c={c} last />
        </Section>

        <Section title="매칭" c={c}>
          <Row label="선호하는 이성" onPress={() => router.push('/my/preferences')} c={c} />
          {/* 미인증이면 혜택을 말로 권한다 — 배지가 곧 모임에서의 신뢰다. */}
          <Row
            label="직장 인증"
            value={job == null ? undefined : job.verified ? (job.domain ? `${job.domain} 인증 완료` : '인증 완료') : '인증하면 프로필에 신뢰 배지가 붙어요'}
            valueHighlight={job?.verified === false}
            onPress={() => router.push('/my/job-verify')}
            c={c}
          />
          <Row label="지인 차단" onPress={() => router.push('/my/blocked')} c={c} last />
        </Section>

        <Section title="설정" c={c}>
          <Row
            label="알림"
            value={notifyOn === null ? '' : notifyOn ? '켜짐' : '꺼짐'}
            onPress={toggleNotifications}
            c={c}
          />
          <Row label="화면 테마" value={APPEARANCE_LABEL[mode]} onPress={() => router.push('/my/appearance')} c={c} />
          <Row label="프롤로그 사용법" onPress={() => router.push('/my/guide')} c={c} last />
        </Section>

        <Section title="계정" c={c}>
          <Row label="로그아웃" onPress={confirmLogout} c={c} />
          <Row label="회원 탈퇴" onPress={() => router.push('/my/withdraw')} c={c} danger last />
        </Section>

        {/* 약관은 카드에서 빼 발밑에 둔다 — 자주 열지 않는 문서가 메뉴 무게를 차지하지 않도록. */}
        <View style={styles.footer}>
          <Pressable onPress={() => router.push('/terms')} hitSlop={8}>
            <Text style={[styles.footerLink, { color: c.textSecondary }]}>이용약관</Text>
          </Pressable>
          <Text style={[styles.footerDot, { color: c.textSecondary }]}>·</Text>
          <Pressable onPress={() => router.push('/privacy')} hitSlop={8}>
            <Text style={[styles.footerLink, { color: c.textSecondary }]}>개인정보처리방침</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, c, children }: { title: string; c: ThemeColors; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionHead, { color: c.textSecondary }]}>{title}</Text>
      {/* 면과 테두리는 같은 말을 두 번 하는 것 — 카드는 배경색만으로 구분한다. */}
      <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  c,
  last = false,
  danger = false,
  valueHighlight = false,
}: {
  label: string;
  /** 오른쪽에 조용히 붙는 현재 값. 설명이 아니라 상태를 보여줄 때만 쓴다. */
  value?: string;
  onPress: () => void;
  c: ThemeColors;
  last?: boolean;
  danger?: boolean;
  /** 값을 포인트 색으로 — 하면 좋은 일을 넛지할 때. */
  valueHighlight?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      {/* 구분선은 글자 시작점에 맞춰 안쪽으로 들여 넣는다. 칸을 가르는 선이 덜 도드라진다. */}
      <View
        style={[
          styles.rowInner,
          !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        ]}
      >
        <Text style={[styles.rowLabel, { color: danger ? c.primaryStrong : c.text }]}>{label}</Text>
        {value ? <Text style={[styles.rowValue, { color: valueHighlight ? c.primaryStrong : c.textSecondary }]}>{value}</Text> : null}
        <Text style={[styles.chevron, { color: c.textSecondary }]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  skeletonMenu: { gap: 10, marginTop: 22, marginHorizontal: 20 },
  content: { paddingBottom: 40 }, // 실제 값은 렌더 시 탭바·세이프에어리어를 더해 덮어쓴다

  hero: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  fill: { width: '100%', height: '100%' },
  // 사진이 없을 때만 쓰는 아바타 썸네일. 이름 줄 왼쪽에 붙어 카드가 한 줄짜리로 압축된다.
  heroThumb: { width: 52, height: 52, borderRadius: Radius.sm, overflow: 'hidden' },
  heroText: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 18 },
  heroName: { fontSize: 24, fontWeight: '700' },
  heroMeta: { fontSize: 14.5, marginTop: 4 },
  heroLink: { fontSize: 14, fontWeight: '700' },

  todo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: Radius.md,
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: Radius.md,
  },
  jobBadgePreview: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', height: 23, paddingHorizontal: 9, borderRadius: Radius.pill, marginBottom: 9 },
  jobTitle: { fontSize: 16, fontWeight: '700' },
  jobHint: { fontSize: 13.5, lineHeight: 19, marginTop: 4 },

  todoLabel: { fontSize: 16, fontWeight: '700' },
  todoHint: { fontSize: 14, marginTop: 3 },

  // 섹션 사이를 넉넉히 띄우고 제목은 조용하게 — 목록이 빽빽해 보이지 않게.
  section: { marginTop: 34, paddingHorizontal: 20 },
  sectionHead: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginBottom: 10, paddingLeft: 4 },
  card: { borderRadius: Radius.md, overflow: 'hidden' },
  row: { paddingHorizontal: 20 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 },
  rowLabel: { flex: 1, fontSize: 16.5, fontWeight: '500' },
  rowValue: { fontSize: 15 },
  chevron: { fontSize: 20, fontWeight: '300' },

  footer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 32 },
  footerLink: { fontSize: 13.5 },
  footerDot: { fontSize: 13.5 },
});
