import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMyProfile } from '@/lib/member';
import { formatPhoneDigits } from '@/lib/phone';
import { sendMail } from '@/lib/mails';
import { getStampBalance } from '@/lib/stamps';

const CONTENT_MAX = 300;

/**
 * 편지 쓰기 — 인앱 채팅 대신 연락처를 건네는 한 통.
 * 300자 메시지에 전화번호/카카오톡 ID 중 하나 이상을 반드시 싣는다.
 * 상호 하트면 우표 없이(mutual 파라미터로 미리 알면 문구에 반영), 아니면 우표 1장.
 */
export default function MailComposeScreen() {
  const c = useTheme();
  const router = useRouter();
  const { peerAnswerId, nickname, mutual } = useLocalSearchParams<{
    peerAnswerId?: string;
    nickname?: string;
    mutual?: string;
  }>();
  const isMutual = mutual === '1';

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [includePhone, setIncludePhone] = useState(true);
  const [kakaoId, setKakaoId] = useState('');
  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [stamps, setStamps] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((p) => {
        if (!active) return;
        setMyPhone(p?.phone ?? null);
        setIncludePhone(!!p?.phone);
        setKakaoId(p?.kakaoId ?? '');
      })
      .catch(() => active && setMyPhone(null))
      .finally(() => active && setLoading(false));
    if (!isMutual) getStampBalance().then((n) => active && setStamps(n)).catch(() => {});
    return () => {
      active = false;
    };
  }, [isMutual]);

  const hasContact = (includePhone && !!myPhone) || kakaoId.trim().length > 0;
  const canSend = !!peerAnswerId && content.trim().length > 0 && hasContact && !sending;

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      const result = await sendMail(peerAnswerId!, content.trim(), includePhone && !!myPhone, kakaoId.trim() || null);
      Alert.alert(
        '편지를 보냈어요',
        result.freeByMatch ? '서로 하트를 주고받은 사이라 우표 없이 보냈어요.' : '우표 1장을 사용했어요.',
        [{ text: '확인', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('보내기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSending(false);
    }
  }

  /** 우표를 쓰는 행동이라 한 번 확인한다. 상호 하트면 확인 없이 바로. */
  function confirmSend() {
    if (!canSend) return;
    if (isMutual) {
      void send();
      return;
    }
    Alert.alert(
      '편지 보내기',
      stamps != null
        ? `우표 1장을 사용해요. (남은 우표 ${stamps}장)\n서로 하트를 주고받은 사이라면 우표 없이 보내져요.`
        : '우표 1장을 사용해요.\n서로 하트를 주고받은 사이라면 우표 없이 보내져요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '보내기', onPress: () => void send() },
      ],
    );
  }

  return (
    <SubScreen title="편지 쓰기" c={c}>
      {loading ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {nickname ? (
              <Text style={[styles.to, { color: c.text, fontFamily: Fonts.serif }]}>{nickname}님께</Text>
            ) : null}
            <Text style={[styles.lead, { color: c.textSecondary }]}>
              이 편지가 전해지면 대화는 앱 밖에서 이어져요.{'\n'}짧은 인사와 함께 연락처를 건네보세요.
            </Text>

            <TextInput
              value={content}
              onChangeText={(t) => setContent(t.slice(0, CONTENT_MAX))}
              multiline
              placeholder="만나서 반가웠어요. 편하게 연락 주세요."
              placeholderTextColor={c.textSecondary}
              style={[styles.body, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
            />
            <Text style={[styles.counter, { color: c.textSecondary }]}>
              {content.length}/{CONTENT_MAX}
            </Text>

            {/* 함께 보낼 연락처 — 하나 이상 필수. 전화번호 값은 서버가 내 프로필에서 읽는다. */}
            <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>함께 보낼 연락처</Text>
            <Pressable
              onPress={() => {
                if (!myPhone) {
                  Alert.alert('전화번호가 없어요', '기본 정보에서 전화번호를 먼저 등록해주세요.', [
                    { text: '취소', style: 'cancel' },
                    { text: '등록하러 가기', onPress: () => router.push('/my/edit-basic') },
                  ]);
                  return;
                }
                setIncludePhone((v) => !v);
              }}
              style={[
                styles.contactRow,
                {
                  backgroundColor: includePhone && myPhone ? c.backgroundSelected : c.backgroundElement,
                  borderColor: includePhone && myPhone ? c.primary : c.border,
                },
              ]}
            >
              <View style={styles.flex}>
                <Text style={[styles.contactLabel, { color: c.text }]}>전화번호</Text>
                <Text style={[styles.contactValue, { color: c.textSecondary }]}>
                  {myPhone ? formatPhoneDigits(myPhone) : '기본 정보에서 등록해주세요'}
                </Text>
              </View>
              <Text style={[styles.contactCheck, { color: includePhone && myPhone ? c.primaryStrong : c.border }]}>
                ✓
              </Text>
            </Pressable>

            <View style={[styles.kakaoRow, { backgroundColor: c.backgroundElement, borderColor: kakaoId.trim() ? c.primary : c.border }]}>
              <Text style={[styles.contactLabel, { color: c.text }]}>카카오톡 ID</Text>
              <TextInput
                value={kakaoId}
                onChangeText={setKakaoId}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                placeholder="담지 않으려면 비워두세요"
                placeholderTextColor={c.textSecondary}
                style={[styles.kakaoInput, { color: c.text }]}
              />
            </View>
            {!hasContact && (
              <Text style={[styles.contactHint, { color: c.primaryStrong }]}>
                전화번호나 카카오톡 ID 중 하나는 함께 보내야 해요.
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={confirmSend}
              disabled={!canSend}
              style={[styles.submit, { backgroundColor: c.primary, opacity: canSend ? 1 : 0.5 }]}
            >
              <Text style={[styles.submitText, { color: c.primaryText }]}>
                {sending ? '보내는 중...' : isMutual ? '우표 없이 보내기' : '우표 1장으로 보내기'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 24 },

  to: { fontSize: 21, fontWeight: '700' },
  lead: { fontSize: 13.5, lineHeight: 21, marginTop: 8, marginBottom: 18 },

  body: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 16,
    fontSize: 15.5,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  counter: { fontSize: 12, textAlign: 'right', marginTop: 6 },

  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, marginTop: 22, marginBottom: 8 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contactLabel: { fontSize: 14.5, fontWeight: '600' },
  contactValue: { fontSize: 13, marginTop: 3 },
  contactCheck: { fontSize: 18, fontWeight: '700' },
  kakaoRow: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12, marginTop: 10 },
  kakaoInput: { fontSize: 14.5, paddingVertical: 6, marginTop: 2 },
  contactHint: { fontSize: 12.5, marginTop: 10 },

  footer: { paddingHorizontal: 20, paddingBottom: 12 },
  submit: { height: 54, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 15.5, fontWeight: '700' },
});
