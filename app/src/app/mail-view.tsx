import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSentMailTo, type SentMail } from '@/lib/mails';
import { RevealableContact } from '@/components/revealable-contact';

/**
 * 보낸 편지 확인 — 한 번 부친 편지는 고칠 수 없는 기록이라 읽기 전용이다.
 * 종이 편지가 그렇듯, 부친 뒤에는 내용을 되돌릴 수 없다는 걸 화면이 그대로 말한다.
 */
export default function MailViewScreen() {
  const c = useTheme();
  const { peerAnswerId, nickname } = useLocalSearchParams<{ peerAnswerId?: string; nickname?: string }>();

  const [loading, setLoading] = useState(true);
  const [mail, setMail] = useState<SentMail | null>(null);

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
            한 번 부친 편지는 고칠 수 없어요.{'\n'}답이 온다면, 다음 이야기는 앱 밖에서 이어져요.
          </Text>
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
});
