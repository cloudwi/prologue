import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { getSentMailTo, recallMail, type SentMail } from '@/lib/mails';
import { RevealableContact } from '@/components/revealable-contact';

/**
 * 보낸 편지 확인 — 한 번 부친 편지는 고칠 수 없는 기록이라 읽기 전용이다.
 * 종이 편지가 그렇듯, 부친 뒤에는 내용을 되돌릴 수 없다는 걸 화면이 그대로 말한다.
 *
 * 다만 상대가 읽지 않은 채 사흘이 지나면 되찾아갈 수 있다 — 전해지지 않은 편지까지
 * 값을 물릴 이유는 없어서. 그때 부친 잉크의 절반이 돌아온다 — 할인받아 부쳤으면 그 값의 절반이라 서버가 셈해 준다.
 */
export default function MailViewScreen() {
  const c = useTheme();
  const { peerAnswerId, nickname } = useLocalSearchParams<{ peerAnswerId?: string; nickname?: string }>();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mail, setMail] = useState<SentMail | null>(null);
  const [recalling, setRecalling] = useState(false);

  useEffect(() => {
    if (!peerAnswerId) {
      setLoading(false);
      return;
    }
    let active = true;
    getSentMailTo(peerAnswerId)
      .then((m) => active && setMail(m))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [peerAnswerId]);

  const dateFmt = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const to = mail?.recipientNickname ?? nickname;

  /** 되찾아간다 — 돌이킬 수 없는 데다 다시 보낼 수도 없어서, 둘 다 미리 말해준다. */
  function confirmRecall() {
    if (!mail || recalling) return;
    Alert.alert(
      '편지를 회수할까요?',
      `잉크 ${mail.recallRefund}이 돌아와요. 회수한 편지는 사라지고, 같은 분에게 다시 보낼 수는 없어요.`,
      [
        { text: '그냥 둘게요', style: 'cancel' },
        {
          text: '회수하기',
          style: 'destructive',
          onPress: async () => {
            setRecalling(true);
            try {
              await recallMail(mail.mailId);
              track('mail_recalled');
              Alert.alert('편지를 회수했어요', `잉크 ${mail.recallRefund}이 돌아왔어요.`, [
                { text: '확인', onPress: () => router.back() },
              ]);
            } catch (e) {
              Alert.alert('회수하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
            } finally {
              setRecalling(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SubScreen title="보낸 편지" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : !mail ? (
        <View style={[styles.flex, styles.center, styles.emptyPad]}>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>보낸 편지를 찾지 못했어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            {to ? <Text style={[styles.to, { color: c.text, fontFamily: Fonts.serif }]}>{to}님께</Text> : null}
            <Text style={[styles.date, { color: c.textSecondary }]}>{dateFmt.format(new Date(mail.createdAt))}</Text>

            <Text style={[styles.body, { color: c.text, fontFamily: Fonts.serif }]}>{mail.content}</Text>

            {/* 함께 부친 연락처 — 내 것이지만 어깨너머로 읽히지 않게 같은 규칙을 쓴다 */}
            <RevealableContact phone={mail.phone} kakaoId={mail.kakaoId} c={c} />
          </View>

          <Text style={[styles.sealNote, { color: c.textSecondary }]}>
            {mail.status === 'PENDING'
              ? '아직 봉투를 열지 않으셨어요.\n7일 동안 열리지 않으면 잉크 절반과 함께 돌아와요.'
              : mail.status === 'EXPIRED'
                ? '7일 동안 열리지 않아 회수됐어요.\n잉크 절반이 돌아왔어요. 인연은 또 있을 거예요.'
                : mail.status === 'RECALLED'
                  ? '회수한 편지예요.\n잉크 절반이 돌아왔어요.'
                  : '한 번 부친 편지는 고칠 수 없어요.\n답이 온다면, 다음 이야기는 앱 밖에서 이어져요.'}
          </Text>

          {mail.recallable && (
            <Pressable
              onPress={confirmRecall}
              disabled={recalling}
              accessibilityRole="button"
              accessibilityLabel="편지 회수하기"
              style={[styles.recallBtn, { borderColor: c.border, opacity: recalling ? 0.6 : 1 }]}
            >
              <Text style={[styles.recallText, { color: c.textSecondary }]}>
                편지 회수하기 (잉크 {mail.recallRefund} 환급)
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },

  emptyPad: { paddingHorizontal: 32 },
  emptyText: { fontSize: 13.5, textAlign: 'center' },

  card: { borderRadius: Radius.md, padding: 20 },
  to: { fontSize: 19, fontWeight: '700' },
  date: { fontSize: 12.5, marginTop: 4 },
  body: { fontSize: 15.5, lineHeight: 26, marginTop: 16 },

  sealNote: { fontSize: 12.5, lineHeight: 19, textAlign: 'center', marginTop: 20 },
  recallBtn: {
    alignSelf: 'center',
    marginTop: 18,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recallText: { fontSize: 13, fontWeight: '600' },
});
