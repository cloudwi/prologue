import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Avatar } from '@/components/avatar';
import { ProfileInvitation, type InvitationLetter } from '@/components/profile-invitation';
import { SubScreen } from '@/components/sub-screen';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { sendHeart, unlockPeer, type PastAnswer, type Peer } from '@/lib/daily';
import { INK_PRICE } from '@/lib/ink';
import { promptReport } from '@/lib/reports';

/**
 * 오늘의 상대 프로필 상세 — 청첩장 조판(ProfileInvitation).
 *
 * 상대는 개별 조회 API가 없어서(오늘의 상대는 목록으로만 내려온다)
 * 발견 탭이 이미 들고 있는 데이터를 params로 직렬화해 넘긴다. 조회 전용이라 충분하다.
 * 행동은 두 가지, 편지를 끝까지 읽은 자리에서: 하트(가벼운 신호) +
 * 편지 보내기(연락처를 건네는 한 통, 잉크 50).
 * 서버가 멱등이라 카드와 상세의 하트 상태가 어긋나도 안전하다.
 */
export default function PeerDetailScreen() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, question, answers } = useLocalSearchParams<{ data?: string; question?: string; answers?: string }>();
  const initialPeer = useMemo<Peer | null>(() => {
    try {
      return JSON.parse(typeof data === 'string' ? data : '') as Peer;
    } catch {
      return null;
    }
  }, [data]);
  // 잉크로 열면 서버가 열린 프로필을 함께 주므로 그 자리에서 바꿔 끼운다 — 다시 조회하지 않는다
  const [peer, setPeer] = useState(initialPeer);
  const [unlocking, setUnlocking] = useState(false);

  // 누구를 봤는지는 싣지 않는다 — 열람이 일어났다는 사실만.
  useEffect(() => track('peer_profile_viewed'), []);

  // 하트는 한 사람에게 한 번뿐 — 서버가 알려준 상태로 시작해야 다시 들어왔을 때 버튼이 거짓말하지 않는다
  const [hearted, setHearted] = useState(initialPeer?.hearted ?? false);
  const [hearting, setHearting] = useState(false);

  // 지난 상대는 그동안의 문답 목록을 함께 넘긴다 — 없으면(오늘의 상대·대화 목록) 빈 배열.
  const pastAnswers = useMemo<PastAnswer[]>(() => {
    try {
      const parsed = JSON.parse(typeof answers === 'string' ? answers : '');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [answers]);

  if (!peer) {
    return (
      <SubScreen title="프로필" c={c}>
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary }}>프로필을 불러오지 못했어요</Text>
        </View>
      </SubScreen>
    );
  }

  /** 잉크를 써서 프로필을 다시 연다. 열리면 그 자리에서 화면이 바뀐다. */
  function confirmUnlock() {
    if (!peer?.peerAnswerId || unlocking) return;
    Alert.alert(
      '프로필을 다시 열까요?',
      `잉크 ${INK_PRICE.PROFILE_UNLOCK}을 사용해요. 한 번 열면 다시 닫히지 않아요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '잉크 쓰기',
          onPress: async () => {
            setUnlocking(true);
            try {
              const result = await unlockPeer(peer!.peerAnswerId!);
              if (result.spent) track('profile_unlocked');
              setPeer(result.peer);
              setHearted(result.peer.hearted);
              if (result.spent) Alert.alert('프로필을 열었어요', `남은 잉크 ${result.balance}이에요.`);
            } catch (e) {
              Alert.alert('열지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
            } finally {
              setUnlocking(false);
            }
          },
        },
      ],
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
  if (pastAnswers.length > 0) {
    // 지난 상대 — 그동안의 문답을 최신 공개 순으로 이어 붙인다.
    // 잠긴 날도 질문은 보여준다: 무슨 물음으로 만났는지는 인연의 맥락이라, 답만 잠근다.
    pastAnswers.forEach((a, i) =>
      letters.push({
        key: `past-${i}`,
        question: a.question,
        content: a.unlocked && a.content ? a.content : '',
        locked: !(a.unlocked && a.content),
      }),
    );
  } else if (peer.answerUnlocked && peer.peerAnswer) {
    // 오늘의 질문을 함께 — 답변만 있으면 무슨 물음에 대한 답인지 끊긴다.
    const todayQuestion = typeof question === 'string' && question.length > 0 ? question : '오늘의 답변';
    letters.push({ key: 'today', question: todayQuestion, content: peer.peerAnswer });
  }

  /** 편지 쓰기 화면으로 — 이미 보낸 상대면 쓰기 대신 보낸 편지 확인으로. */
  function openCompose() {
    if (!peer?.peerAnswerId) return;
    router.push({
      pathname: peer.mailSent ? '/mail-view' : '/mail-compose',
      params: { peerAnswerId: peer.peerAnswerId, nickname: peer.nickname ?? '' },
    });
  }

  /** 하트 = 호감 표시. 서로 하트면 마음이 통한 것 — 편지로 이어가면 된다. */
  async function heart() {
    if (!peer?.peerAnswerId || hearting || hearted) return;
    setHearting(true);
    try {
      const result = await sendHeart(peer.peerAnswerId);
      track('heart_sent');
      setHearted(true);
      if (result.matched) {
        Alert.alert('서로 호감이에요!', '두 사람 모두 호감을 보냈어요. 편지로 연락처를 건네보세요.', [
          { text: '나중에', style: 'cancel' },
          { text: '편지 쓰기', onPress: openCompose },
        ]);
      } else {
        Alert.alert('호감을 보냈어요', '상대도 호감을 보내면 서로의 마음을 알 수 있어요.');
      }
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setHearting(false);
    }
  }

  if (peer.locked) {
    // 사진도 문답도 서버가 비워 보낸다 — 초대장을 펴봐야 빈 종이라, 잠금 자체를 화면으로 삼는다.
    return (
      <SubScreen title="" c={c}>
        <View style={[styles.flex, styles.center, styles.lockedPad]}>
          <Avatar avatarId={peer.avatarId} nickname={peer.nickname ?? undefined} size={72} c={c} />
          <Text style={[styles.lockedName, { color: c.text }]}>{peer.nickname ?? '이름 없음'}</Text>
          {meta.length > 0 && <Text style={[styles.lockedMeta, { color: c.textSecondary }]}>{meta}</Text>}
          <Text style={[styles.lockedBody, { color: c.textSecondary }]}>3일이 지나 프로필이 닫혔어요.</Text>
          {peer.peerAnswerId && (
            <Pressable
              onPress={confirmUnlock}
              disabled={unlocking}
              accessibilityRole="button"
              accessibilityLabel="잉크를 써서 프로필 다시 열기"
              style={[styles.unlockBtn, { backgroundColor: c.primary, opacity: unlocking ? 0.6 : 1 }]}
            >
              <Ionicons name="water" size={17} color={c.primaryText} />
              <Text style={[styles.unlockText, { color: c.primaryText }]}>잉크 {INK_PRICE.PROFILE_UNLOCK}로 열기</Text>
            </Pressable>
          )}
        </View>
      </SubScreen>
    );
  }

  return (
    <SubScreen title="" c={c}>
      <View style={styles.flex}>
        <ProfileInvitation
          nickname={peer.nickname}
          meta={meta}
          lastActive={peer.lastActive}
          photoUrls={peer.photoUrls}
          letters={letters}
          keywords={[...peer.interests, ...peer.hobbies, ...peer.strengths]}
          seed={peer.peerAnswerId ?? peer.nickname ?? ''}
          c={c}
          onReport={peer.peerAnswerId ? () => promptReport({ peerAnswerId: peer.peerAnswerId! }) : undefined}
        />
        {peer.answerUnlocked && peer.peerAnswerId && (
          <Pressable
            onPress={openCompose}
            accessibilityRole="button"
            style={[
              styles.requestPill,
              {
                bottom: insets.bottom + 24 + 5,
                backgroundColor: c.background,
                borderColor: c.border,
                shadowColor: c.text,
              },
            ]}
          >
            <Image
              source={require('@/assets/images/stamp.png')}
              style={styles.requestPillIcon}
              contentFit="contain"
              tintColor={peer.mailSent ? c.textSecondary : c.primaryStrong}
            />
            <Text style={[styles.requestPillText, { color: peer.mailSent ? c.textSecondary : c.primaryStrong }]}>
              {peer.mailSent ? '편지 확인' : '편지 보내기'}
            </Text>
          </Pressable>
        )}
        {peer.answerUnlocked && peer.peerAnswerId && (
          <Pressable
            onPress={heart}
            disabled={hearting || hearted}
            accessibilityRole="button"
            accessibilityLabel={hearted ? '호감을 보냈어요' : '호감 보내기'}
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

  lockedPad: { paddingHorizontal: 40 },
  lockedName: { fontSize: 19, fontWeight: '700', marginTop: 16 },
  lockedMeta: { fontSize: 13.5, marginTop: 5 },
  lockedBody: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 22 },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 22,
    borderRadius: Radius.md,
    marginTop: 24,
  },
  unlockText: { fontSize: 15, fontWeight: '700' },
});
