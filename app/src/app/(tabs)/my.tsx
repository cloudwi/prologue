import { Image } from 'expo-image';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { avatarSource } from '@/constants/avatars';
import { BottomTabInset, Fonts, Radius, type ThemeColors } from '@/constants/theme';
import { APPEARANCE_LABEL, useAppearance } from '@/lib/appearance';
import { clearTokens } from '@/lib/auth-storage';
import { getMyProfile, type MemberProfile } from '@/lib/member';
import { ageFrom, nextStep } from '@/lib/profile-form';
import { useTheme } from '@/hooks/use-theme';

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

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);

  // 하위 편집 화면에서 돌아오면 다시 읽어 최신 상태를 반영한다.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const p = await getMyProfile();
          if (active) setProfile(p);
        } catch (e) {
          if (active) Alert.alert('불러오기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  async function logout() {
    await clearTokens();
    router.replace('/');
  }

  function confirmLogout() {
    Alert.alert('로그아웃', '다시 로그인하려면 이메일 인증이 필요해요.', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const photos = profile?.photoUrls ?? [];
  const age = profile ? ageFrom(profile.birthDate) : null;
  const todo = profile ? nextStep(profile) : null;
  const extra = photos.length - 2;
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
           * 예전에는 사진이 화면 끝까지 각지게 깔리고 그 위에 글자가 떠 있어서
           * 아래 둥근 메뉴 카드들과 따로 노는 인상이었다.
           * 사진은 가입 시 2장이 필수라 대표 + 두 번째를 나란히 보여줄 수 있다.
           */}
          <Pressable
            onPress={() => router.push(hasPhoto ? '/my/preview' : '/my/edit-photos')}
            style={({ pressed }) => [
              styles.hero,
              { backgroundColor: c.backgroundElement, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {/* 사진이 없으면 사진 자리를 아예 만들지 않는다 — 빈 상자 가운데 아바타만 덩그러니 놓이는 게 더 초라하다. */}
            {hasPhoto && (
              <View style={[styles.heroPhotos, { aspectRatio: photos.length > 1 ? 1.2 : 1.35 }]}>
                <View style={[styles.heroMain, { backgroundColor: c.backgroundSelected }]}>
                  <Image source={{ uri: photos[0] }} style={styles.fill} contentFit="cover" />
                </View>

                {photos[1] && (
                  <View style={[styles.heroSide, { backgroundColor: c.backgroundSelected }]}>
                    <Image source={{ uri: photos[1] }} style={styles.fill} contentFit="cover" />
                    {extra > 0 && (
                      <View style={[styles.moreBadge, { backgroundColor: c.background }]}>
                        <Text style={[styles.moreBadgeText, { color: c.text }]}>+{extra}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={styles.heroText}>
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
            </View>
          </Pressable>
        </SafeAreaView>

        {/* 다음 한 가지 — 완성도 퍼센트 대신 지금 할 행동 하나만 제안한다. */}
        {todo && (
          <Pressable
            onPress={() => router.push(todo.href as never)}
            style={({ pressed }) => [
              styles.todo,
              { backgroundColor: c.backgroundSelected, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={styles.flex}>
              <Text style={[styles.todoLabel, { color: c.text }]}>{todo.label}</Text>
              <Text style={[styles.todoHint, { color: c.textSecondary }]}>{todo.hint}</Text>
            </View>
            <Text style={[styles.chevron, { color: c.primaryStrong }]}>›</Text>
          </Pressable>
        )}

        {/* 편집 화면은 각자 자기 것만 다룬다 — 사진을 고치러 들어갔다가 기본 정보로 새지 않도록. */}
        <Section title="프로필" c={c}>
          <Row label="사진" desc={`${photos.length}장 등록됨 · 올리고 지우기`} onPress={() => router.push('/my/edit-photos')} c={c} />
          <Row label="기본 정보" desc="닉네임, 성별, 생년월일, 지역" onPress={() => router.push('/my/edit-basic')} c={c} />
          <Row label="상세 소개" desc="자기소개, 키, 관심사, 취미, 강점" onPress={() => router.push('/my/edit-detail')} c={c} />
          <Row label="상대에게 보이는 화면" desc="내 프로필이 어떻게 보이는지 확인해요" onPress={() => router.push('/my/preview')} c={c} last />
        </Section>

        <Section title="매칭 설정" c={c}>
          <Row label="선호하는 이성" desc="나이, 지역 등 만나고 싶은 조건" onPress={() => router.push('/my/preferences')} c={c} />
          <Row label="지인 차단" desc="아는 사람에게 소개되지 않게 해요" onPress={() => router.push('/my/blocked')} c={c} last />
        </Section>

        <Section title="앱 설정" c={c}>
          <Row label="화면 테마" desc={APPEARANCE_LABEL[mode]} onPress={() => router.push('/my/appearance')} c={c} last />
        </Section>

        <Section title="안내" c={c}>
          <Row label="프롤로그 사용법" desc="하루 한 문답이 어떻게 흘러가는지" onPress={() => router.push('/my/guide')} c={c} />
          <Row label="이용약관" onPress={() => router.push('/terms')} c={c} />
          <Row label="개인정보처리방침" onPress={() => router.push('/privacy')} c={c} last />
        </Section>

        <Section title="계정" c={c}>
          <Row label="로그아웃" onPress={confirmLogout} c={c} />
          <Row label="회원 탈퇴" desc="계정과 대화 기록이 모두 삭제돼요" onPress={() => router.push('/my/withdraw')} c={c} danger last />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, c, children }: { title: string; c: ThemeColors; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionHead, { color: c.textSecondary }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>{children}</View>
    </View>
  );
}

function Row({
  label,
  desc,
  onPress,
  c,
  last = false,
  danger = false,
}: {
  label: string;
  desc?: string;
  onPress: () => void;
  c: ThemeColors;
  last?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.flex}>
        <Text style={[styles.rowLabel, { color: danger ? c.primaryStrong : c.text }]}>{label}</Text>
        {desc ? <Text style={[styles.rowDesc, { color: c.textSecondary }]}>{desc}</Text> : null}
      </View>
      <Text style={[styles.chevron, { color: c.textSecondary }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 }, // 실제 값은 렌더 시 탭바·세이프에어리어를 더해 덮어쓴다

  hero: {
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // 대표 사진과 두 번째 사진을 얇은 간격으로 나란히 — 카드 배경이 그 사이로 비친다.
  heroPhotos: { flexDirection: 'row', gap: 3 },
  heroMain: { flex: 1.9 },
  heroSide: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  // 사진이 없을 때만 쓰는 아바타 썸네일. 이름 줄 왼쪽에 붙어 카드가 한 줄짜리로 압축된다.
  heroThumb: { width: 52, height: 52, borderRadius: Radius.sm, overflow: 'hidden' },
  moreBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    opacity: 0.92,
  },
  moreBadgeText: { fontSize: 11, fontWeight: '700' },
  heroText: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 16 },
  heroName: { fontSize: 24, fontWeight: '700' },
  heroMeta: { fontSize: 13.5, marginTop: 3 },
  heroLink: { fontSize: 13, fontWeight: '700' },

  todo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  todoLabel: { fontSize: 15, fontWeight: '700' },
  todoHint: { fontSize: 13, marginTop: 2 },

  section: { marginTop: 26, paddingHorizontal: 20 },
  sectionHead: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 },
  card: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowDesc: { fontSize: 12.5, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '300' },
});
