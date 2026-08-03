import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { ProfileInvitation, type InvitationLetter } from '@/components/profile-invitation';
import { SubScreen } from '@/components/sub-screen';
import { useTheme } from '@/hooks/use-theme';
import { sendConversationRequest } from '@/lib/conversation';
import { sendHeart, type Peer } from '@/lib/daily';
import { getStampBalance } from '@/lib/stamps';

/**
 * 오늘의 상대 프로필 상세 — 청첩장 조판(ProfileInvitation).
 *
 * 상대는 개별 조회 API가 없어서(오늘의 상대는 목록으로만 내려온다)
 * 발견 탭이 이미 들고 있는 데이터를 params로 직렬화해 넘긴다. 조회 전용이라 충분하다.
 * 행동은 두 가지, 편지를 끝까지 읽은 자리에서: 하트(가벼운 신호, 서로면 대화) +
 * 대화 신청(상호 없이 문 두드리기, 수락 필요 — 출시 시 재화 게이트가 붙는 자리).
 * 서버가 멱등이라 카드와 상세의 하트 상태가 어긋나도 안전하다.
 */
export default function PeerDetailScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, question } = useLocalSearchParams<{ data?: string; question?: string }>();
  const [hearted, setHearted] = useState(false);
  const [hearting, setHearting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [stamps, setStamps] = useState<number | null>(null);

  const peer = useMemo<Peer | null>(() => {
    try {
      return JSON.parse(typeof data === 'string' ? data : '') as Peer;
    } catch {
      return null;
    }
  }, [data]);

  // 대화 신청 확인 문구에 남은 우표를 보여주기 위해 미리 읽는다. 실패해도 버튼은 살아 있다.
  const canAct = Boolean(peer?.answerUnlocked && peer?.peerAnswerId);
  useEffect(() => {
    if (!canAct) return;
    getStampBalance().then(setStamps).catch(() => {});
  }, [canAct]);

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

  /** 대화 신청 — 상호 하트 없이 문을 두드린다. 우표 1장을 쓰고, 상대가 수락해야 열린다. */
  async function requestConversation() {
    if (!peer?.peerAnswerId || requesting || requested) return;
    setRequesting(true);
    try {
      await sendConversationRequest(peer.peerAnswerId);
      setRequested(true);
      setStamps((n) => (n != null ? Math.max(0, n - 1) : n));
      Alert.alert('대화를 신청했어요', '상대가 수락하면 대화가 열려요.');
    } catch (e) {
      Alert.alert('신청 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setRequesting(false);
    }
  }

  /** 우표를 쓰는 행동이라 한 번 확인한다 — 남은 우표를 함께 보여주고. */
  function confirmRequest() {
    if (requesting || requested) return;
    Alert.alert(
      '대화 신청',
      stamps != null ? `우표 1장을 사용해요. (남은 우표 ${stamps}장)` : '우표 1장을 사용해요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '신청하기', onPress: requestConversation },
      ],
    );
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
            onPress={confirmRequest}
            disabled={requesting || requested}
            accessibilityRole="button"
            style={[
              styles.requestPill,
              {
                bottom: insets.bottom + 24 + 5,
                backgroundColor: c.background,
                borderColor: c.border,
                opacity: requesting ? 0.6 : 1,
                shadowColor: c.text,
              },
            ]}
          >
            <Image
              source={require('@/assets/images/stamp.png')}
              style={styles.requestPillIcon}
              contentFit="contain"
              tintColor={requested ? c.textSecondary : c.primaryStrong}
            />
            <Text style={[styles.requestPillText, { color: requested ? c.textSecondary : c.primaryStrong }]}>
              {requested ? '신청 완료' : '대화 신청'}
            </Text>
          </Pressable>
        )}
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
    right: 22,
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
  requestPill: {
    position: 'absolute',
    left: 22,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  requestPillIcon: { width: 16, height: 16 },
  requestPillText: { fontSize: 14.5, fontWeight: '700' },
});
