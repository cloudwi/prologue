import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileInvitation, type InvitationLetter } from '@/components/profile-invitation';
import { SubScreen } from '@/components/sub-screen';
import { useTheme } from '@/hooks/use-theme';
import type { Peer } from '@/lib/daily';

/**
 * 오늘의 상대 프로필 상세 — 청첩장 조판(ProfileInvitation).
 *
 * 상대는 개별 조회 API가 없어서(오늘의 상대는 목록으로만 내려온다)
 * 발견 탭이 이미 들고 있는 데이터를 params로 직렬화해 넘긴다. 조회 전용이라 충분하다.
 * 하트는 카드에서만 보낸다 — 상태를 두 화면이 나눠 갖지 않도록.
 */
export default function PeerDetailScreen() {
  const c = useTheme();
  const { data } = useLocalSearchParams<{ data?: string }>();

  const peer = useMemo<Peer | null>(() => {
    try {
      return JSON.parse(typeof data === 'string' ? data : '') as Peer;
    } catch {
      return null;
    }
  }, [data]);

  if (!peer) {
    return (
      <SubScreen title="프로필" c={c}>
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary }}>프로필을 불러오지 못했어요</Text>
        </View>
      </SubScreen>
    );
  }

  const meta = [
    peer.age != null ? `${peer.age}세` : null,
    peer.heightCm ? `${peer.heightCm}cm` : null,
    peer.region,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const letters: InvitationLetter[] = [];
  if (peer.bio) letters.push({ key: 'bio', question: null, content: peer.bio });
  for (const letter of peer.letters) {
    letters.push({ key: `letter-${letter.questionId}`, question: letter.question, content: letter.content });
  }
  if (peer.answerUnlocked && peer.peerAnswer) {
    letters.push({ key: 'today', question: '오늘의 답변', content: peer.peerAnswer });
  }

  return (
    <SubScreen title="" c={c}>
      <ProfileInvitation
        nickname={peer.nickname}
        meta={meta}
        photoUrls={peer.photoUrls}
        letters={letters}
        keywords={[...peer.interests, ...peer.hobbies, ...peer.strengths]}
        seed={peer.peerAnswerId ?? peer.nickname ?? ''}
        c={c}
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
