import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { ProfileInvitation, type InvitationLetter } from '@/components/profile-invitation';
import { SubScreen } from '@/components/sub-screen';
import { useTheme } from '@/hooks/use-theme';
import { sendHeart, type Peer } from '@/lib/daily';

/**
 * 오늘의 상대 프로필 상세 — 청첩장 조판(ProfileInvitation).
 *
 * 상대는 개별 조회 API가 없어서(오늘의 상대는 목록으로만 내려온다)
 * 발견 탭이 이미 들고 있는 데이터를 params로 직렬화해 넘긴다. 조회 전용이라 충분하다.
 * 하트는 여기서도 보낼 수 있다(플로팅 버튼) — 편지를 끝까지 읽은 자리가 마음을 정하는 자리다.
 * 서버가 멱등이라 카드와 상세의 하트 상태가 어긋나도 안전하다.
 */
export default function PeerDetailScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, question } = useLocalSearchParams<{ data?: string; question?: string }>();
  const [hearted, setHearted] = useState(false);
  const [hearting, setHearting] = useState(false);

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
    // 오늘의 질문을 함께 — 답변만 있으면 무슨 물음에 대한 답인지 끊긴다.
    const todayQuestion = typeof question === 'string' && question.length > 0 ? question : '오늘의 답변';
    letters.push({ key: 'today', question: todayQuestion, content: peer.peerAnswer });
  }

  /** 하트 = 호감 표시. 서로 하트를 보냈으면 그 자리에서 대화가 열린다. */
  async function heart() {
    if (!peer?.peerAnswerId || hearting || hearted) return;
    setHearting(true);
    try {
      const result = await sendHeart(peer.peerAnswerId);
      setHearted(true);
      if (result.matched) {
        Alert.alert('서로 호감이에요!', '두 사람 모두 하트를 보냈어요. 대화가 열렸어요.', [
          { text: '나중에', style: 'cancel' },
          { text: '대화하러 가기', onPress: () => router.push('/chats') },
        ]);
      } else {
        Alert.alert('하트를 보냈어요', '상대도 하트를 보내면 대화가 열려요.');
      }
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setHearting(false);
    }
  }

  return (
    <SubScreen title="" c={c}>
      <View style={styles.flex}>
        <ProfileInvitation
          nickname={peer.nickname}
          meta={meta}
          photoUrls={peer.photoUrls}
          letters={letters}
          keywords={[...peer.interests, ...peer.hobbies, ...peer.strengths]}
          seed={peer.peerAnswerId ?? peer.nickname ?? ''}
          c={c}
        />
        {peer.answerUnlocked && peer.peerAnswerId && (
          <Pressable
            onPress={heart}
            disabled={hearting || hearted}
            accessibilityRole="button"
            accessibilityLabel={hearted ? '호감을 보냈어요' : '하트 보내기'}
            style={[
              styles.heartFab,
              {
                bottom: insets.bottom + 24,
                backgroundColor: hearted ? c.backgroundSelected : c.primary,
                opacity: hearting ? 0.6 : 1,
                shadowColor: c.text,
              },
            ]}
          >
            <Image
              source={require('@/assets/images/match-heart.png')}
              style={styles.heartFabIcon}
              contentFit="contain"
              tintColor={hearted ? c.textSecondary : c.primaryText}
            />
          </Pressable>
        )}
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  heartFab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  heartFabIcon: { width: 21, height: 21 },
});
