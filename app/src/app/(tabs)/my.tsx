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
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { avatarSource } from '@/constants/avatars';
import { Colors, Fonts, type ThemeColors } from '@/constants/theme';
import { clearTokens } from '@/lib/auth-storage';
import { getMyProfile, type MemberProfile } from '@/lib/member';
import { ageFrom, nextStep } from '@/lib/profile-form';

/**
 * MY 허브 — 조회 전용.
 * 편집은 전부 하위 화면으로 내려가고, 여기서는 대표 사진과 메뉴만 보여준다.
 * (예전에는 이 화면 자체가 거대한 편집 폼이라 기능을 더할 자리가 없었다)
 */
export default function MyScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

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

  const cover = profile?.photoUrls?.[0] ?? null;
  const age = profile ? ageFrom(profile.birthDate) : null;
  const todo = profile ? nextStep(profile) : null;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 대표 사진 — 누르면 상대에게 보이는 화면으로. 미리보기를 메뉴에 묻지 않는다. */}
        <Pressable
          onPress={() => router.push('/my/preview')}
          style={({ pressed }) => [styles.cover, { opacity: pressed ? 0.9 : 1 }]}
        >
          {cover ? (
            <Image source={{ uri: cover }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={[styles.coverImage, styles.center, { backgroundColor: c.backgroundElement }]}>
              {profile?.avatarId != null ? (
                <Image source={avatarSource(profile.avatarId)!} style={styles.coverAvatar} contentFit="contain" />
              ) : (
                <Text style={{ color: c.textSecondary, fontSize: 14 }}>사진을 등록해 주세요</Text>
              )}
            </View>
          )}

          <SafeAreaView edges={['top']} style={styles.coverTop}>
            <View style={[styles.previewChip, { backgroundColor: c.background }]}>
              <Text style={[styles.previewChipText, { color: c.text }]}>미리보기</Text>
            </View>
          </SafeAreaView>

          <View style={[styles.coverScrim, { backgroundColor: c.background }]} />
          <View style={styles.coverText}>
            <Text style={[styles.coverName, { color: c.text, fontFamily: Fonts.serif }]}>
              {profile?.nickname ?? '프로필 없음'}
            </Text>
            <Text style={[styles.coverMeta, { color: c.textSecondary }]}>
              {[age != null ? `${age}세` : null, profile?.region].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </Pressable>

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
            <Text style={[styles.chevron, { color: c.primary }]}>›</Text>
          </Pressable>
        )}

        <Section title="프로필" c={c}>
          <Row label="프로필 편집" desc="사진, 기본 정보, 상세 소개" onPress={() => router.push('/my/edit-photos')} c={c} />
          <Row label="상대에게 보이는 화면" desc="내 프로필이 어떻게 보이는지 확인해요" onPress={() => router.push('/my/preview')} c={c} last />
        </Section>

        <Section title="매칭 설정" c={c}>
          <Row label="선호하는 이성" desc="나이, 지역 등 만나고 싶은 조건" onPress={() => router.push('/my/preferences')} c={c} />
          <Row label="지인 차단" desc="아는 사람에게 소개되지 않게 해요" onPress={() => router.push('/my/blocked')} c={c} last />
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
        <Text style={[styles.rowLabel, { color: danger ? c.primary : c.text }]}>{label}</Text>
        {desc ? <Text style={[styles.rowDesc, { color: c.textSecondary }]}>{desc}</Text> : null}
      </View>
      <Text style={[styles.chevron, { color: c.textSecondary }]}>›</Text>
    </Pressable>
  );
}

const COVER_HEIGHT = 340;

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },

  cover: { height: COVER_HEIGHT, justifyContent: 'flex-end' },
  coverImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverAvatar: { width: 120, height: 120 },
  coverTop: { position: 'absolute', top: 0, right: 0, left: 0, alignItems: 'flex-end', paddingHorizontal: 16 },
  previewChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, opacity: 0.92 },
  previewChipText: { fontSize: 12, fontWeight: '700' },
  // 사진 위 글자의 가독성을 위해 아래쪽만 배경색으로 덮는다.
  coverScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 96, opacity: 0.88 },
  coverText: { paddingHorizontal: 20, paddingBottom: 16 },
  coverName: { fontSize: 26, fontWeight: '700' },
  coverMeta: { fontSize: 14, marginTop: 2 },

  todo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  todoLabel: { fontSize: 15, fontWeight: '700' },
  todoHint: { fontSize: 13, marginTop: 2 },

  section: { marginTop: 26, paddingHorizontal: 20 },
  sectionHead: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowDesc: { fontSize: 12.5, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '300' },
});
