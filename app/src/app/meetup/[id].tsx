import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Share, StyleSheet, Text, View } from 'react-native';

import { ImageViewerModal } from '@/components/image-viewer';
import { MeetupInvitation } from '@/components/meetup-invitation';
import { SubScreen } from '@/components/sub-screen';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';
import { meetupShareText } from '@/lib/meetup-format';
import { applyMeetup, cancelMeetup, feeLabel, followMeetup, getMeetups, type Meetup } from '@/lib/meetups';
import { useAllowScreenCapture } from '@/lib/screen-capture';

/**
 * 모임 상세 — 정보 화면이 아니라 초대장이다(유저 결정 2026-08-24).
 * 조판은 MeetupInvitation(모임 열기의 미리보기와 공유). 이 화면은 데이터와 동작만 잇는다.
 *
 * 앱에서 유일하게 스크린샷이 열려 있는 화면이다 — 초대장은 퍼뜨리라고 만든 것이라,
 * 다른 화면을 지키는 캡처 차단이 여기서는 방해만 된다([useAllowScreenCapture]).
 */
export default function MeetupDetailScreen() {
  const c = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useAllowScreenCapture();

  const load = useCallback(async () => {
    try {
      const { meetups } = await getMeetups();
      setMeetup(meetups.find((m) => m.meetupId === id) ?? null);
    } catch {
      // 세션 만료 등 — 빈 상태로 둔다
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );


  function confirmApply(m: Meetup) {
    Alert.alert(
      '모임에 신청할까요?',
      [
        '신청하면 모임장의 카카오 오픈채팅 링크가 열려요.',
        m.fee > 0 || (m.feeFemale ?? 0) > 0 ? `참가비(${feeLabel(m)})는 오픈채팅에서 모임장에게 직접 보내요.` : '참가비는 없어요.',
        '모임장이 확인하면 참여가 확정돼요.',
      ].join('\n'),
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신청하기',
          onPress: async () => {
            setBusy(true);
            try {
              await applyMeetup(m.meetupId);
              track('meetup_applied');
              haptics.success();
              await load();
            } catch (e) {
              Alert.alert('신청하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  function confirmCancel(m: Meetup) {
    Alert.alert('신청을 취소할까요?', '이미 참가비를 보냈다면 모임장에게 오픈채팅으로 알려주세요.', [
      { text: '그냥 둘게요', style: 'cancel' },
      {
        text: '신청 취소',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await cancelMeetup(m.meetupId);
            await load();
          } catch (e) {
            Alert.alert('취소하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  /**
   * 모임 따라가기 — 다음 회차가 열리면 알림을 받는다.
   * 화면을 먼저 바꾸고 서버에 알린다(낙관적) — 실패하면 되돌린다.
   */
  async function toggleFollow(on: boolean) {
    if (meetup == null) return;
    setMeetup({ ...meetup, following: on });
    haptics.select(); // 토글은 가볍게
    try {
      await followMeetup(meetup.meetupId, on);
      if (on) track('meetup_followed');
    } catch (e) {
      setMeetup({ ...meetup, following: !on });
      Alert.alert('바꾸지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    }
  }

  /**
   * 초대장 전하기 — 공유 시트로 넘긴다.
   *
   * 링크는 백엔드가 그 모임의 OG 태그를 붙여 내려주는 초대장 페이지라, 카카오톡에서는
   * 커버 사진과 제목이 그대로 펼쳐진다. 미리보기가 안 뜨는 곳도 있어 글에 날짜·장소를 함께 싣는다.
   */
  async function share(m: Meetup) {
    track('meetup_shared');
    await Share.share({ message: meetupShareText(m) });
  }

  function openKakao(link: string) {
    void Linking.openURL(link).catch(() => Alert.alert('링크를 열지 못했어요', link));
  }


  return (
    <SubScreen
      title=""
      c={c}
      onSave={meetup?.isMine ? () => router.push('/my-meetups') : undefined}
      saveLabel="관리"
    >
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : meetup == null ? (
        <View style={[styles.flex, styles.center]}>
          <Text style={{ color: c.textSecondary, fontSize: 15 }}>모임을 찾을 수 없어요 — 마감됐거나 취소됐을 수 있어요.</Text>
        </View>
      ) : (
        <MeetupInvitation
          meetup={meetup}
          c={c}
          busy={busy}
          onPressImage={setViewerIndex}
          onPressHost={() =>
            router.push(`/meetup-member/${meetup.hostAccountId}?role=host&nickname=${encodeURIComponent(meetup.hostNickname ?? '')}`)
          }
          onPressParticipant={(accountId, nickname) =>
            router.push(`/meetup-member/${accountId}?nickname=${encodeURIComponent(nickname ?? '')}`)
          }
          onApply={() => confirmApply(meetup)}
          onCancel={() => confirmCancel(meetup)}
          onOpenKakao={openKakao}
          onToggleFollow={(on) => void toggleFollow(on)}
          onShare={() => void share(meetup)}
        />
      )}

      {meetup != null && meetup.coverUrls.length > 0 && (
        <ImageViewerModal
          photos={meetup.coverUrls}
          initialIndex={viewerIndex ?? 0}
          visible={viewerIndex != null}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
});
