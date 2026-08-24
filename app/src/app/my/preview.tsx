import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { ProfileInvitation, type InvitationLetter } from '@/components/profile-invitation';
import { SubScreen } from '@/components/sub-screen';
import { useTheme } from '@/hooks/use-theme';
import { getJobStatus } from '@/lib/job';
import { getMyLetters, type ProfileLetter } from '@/lib/letters';
import { getMyProfile, type MemberProfile } from '@/lib/member';
import { ageFrom } from '@/lib/profile-form';

/**
 * 상대에게 보이는 화면 — 상대 상세와 같은 청첩장 렌더러를 그대로 쓴다.
 * 미리보기가 실제와 다르면 거짓말이 된다. 편집 요소는 두지 않는다.
 */
export default function PreviewScreen() {
  const c = useTheme();
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<MemberProfile | null>(null);
  const [myLetters, setMyLetters] = useState<ProfileLetter[]>([]);
  const [jobVerified, setJobVerified] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [profile, letters, job] = await Promise.all([
          getMyProfile(),
          getMyLetters(),
          // 배지 하나 때문에 미리보기가 죽으면 안 된다 — 실패하면 미인증으로 그린다.
          getJobStatus().catch(() => ({ verified: false, domain: null })),
        ]);
        if (!active) return;
        setP(profile);
        setMyLetters(letters);
        setJobVerified(job.verified);
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

  if (loading) {
    return (
      <SubScreen title="" c={c}>
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SubScreen>
    );
  }

  if (!p) {
    return (
      <SubScreen title="" c={c}>
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary }}>아직 프로필이 없어요</Text>
        </View>
      </SubScreen>
    );
  }

  const age = ageFrom(p.birthDate);
  const meta = [age != null ? `${age}세` : null, p.heightCm ? `${p.heightCm}cm` : null, p.region]
    .filter(Boolean)
    .join('  ·  ');

  const letters: InvitationLetter[] = [];
  if (p.bio?.trim()) letters.push({ key: 'bio', question: null, content: p.bio.trim() });
  for (const letter of myLetters) {
    letters.push({ key: `letter-${letter.questionId}`, question: letter.question, content: letter.content });
  }

  return (
    <SubScreen title="" c={c}>
      <ProfileInvitation
        nickname={p.nickname}
        meta={meta}
        jobVerified={jobVerified}
        photoUrls={p.photoUrls ?? []}
        letters={letters}
        keywords={[...(p.interests ?? []), ...(p.hobbies ?? []), ...(p.strengths ?? [])]}
        seed={p.nickname}
        c={c}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
