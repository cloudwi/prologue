import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileInvitation } from '@/components/profile-invitation';
import { SubScreen } from '@/components/sub-screen';
import { useTheme } from '@/hooks/use-theme';
import { findDemoProfile } from '@/lib/demo-profiles';
import { profileFactGroups } from '@/lib/profile-form';

/** 실제 프로필과 같은 조판을 끝까지 채운 비대화형 데모. */
export default function DemoProfileScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = findDemoProfile(typeof id === 'string' ? id : undefined);

  if (!profile) {
    return (
      <SubScreen title="프로필 미리보기" c={c}>
        <View style={styles.center}>
          <Text style={{ color: c.textSecondary }}>데모 프로필을 찾지 못했어요</Text>
        </View>
      </SubScreen>
    );
  }

  return (
    <SubScreen title="" c={c}>
      <ProfileInvitation
        nickname={profile.nickname}
        meta={`${profile.age}세  ·  ${profile.heightCm}cm  ·  ${profile.region}`}
        photoUrls={profile.photos}
        letters={[{ key: 'bio', question: null, content: profile.bio }, ...profile.letters]}
        keywords={[...profile.interests, ...profile.hobbies, ...profile.strengths]}
        factGroups={profileFactGroups(profile.facts)}
        seed={profile.id}
        notice="데모 프로필 · AI 생성 이미지"
        c={c}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
