import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { clearMailDraft, loadMailDraft, saveMailDraft } from '@/lib/mail-drafts';
import { getMyProfile } from '@/lib/member';
import { formatPhoneDigits } from '@/lib/phone';
import { sendMail, sendMailReply } from '@/lib/mails';
import { getInkBalance, INK_PRICE } from '@/lib/ink';

const CONTENT_MAX = 300;

/**
 * 편지 쓰기 — 인앱 채팅 대신 연락처를 건네는 한 통.
 * 300자 메시지에 전화번호/카카오톡 ID 중 하나 이상을 반드시 싣는다.
 * 한 통에 잉크 50 — 서로 하트여도, 답장이어도 부치는 값은 같다.
 * 상대는 둘 중 하나로 정해진다: 답변 id(peerAnswerId) 또는 답장할 원본 편지(replyMailId).
 * 초안은 상대별로 기기에 임시저장된다: 쓰다 나가도 다음에 이어 쓰고, 보내면 지운다.
 */
export default function MailComposeScreen() {
  const c = useTheme();
  const router = useRouter();
  const { peerAnswerId, replyMailId, nickname } = useLocalSearchParams<{
    peerAnswerId?: string;
    replyMailId?: string;
    nickname?: string;
  }>();
  // 임시저장 키 — 일반 편지는 상대 답변 id, 답장은 원본 편지 id로 구분한다.
  const draftKey = peerAnswerId ?? (replyMailId ? `reply-${replyMailId}` : undefined);

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [includePhone, setIncludePhone] = useState(true);
  const [kakaoId, setKakaoId] = useState('');
  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [ink, setInk] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  // 초안을 읽기 전에는 자동 저장을 멈춰둔다 — 빈 값이 초안을 덮어쓰지 않게.
  const [draftLoaded, setDraftLoaded] = useState(false);

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
    getInkBalance().then((n) => active && setInk(n)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // 쓰다 만 초안이 있으면 이어 쓴다.
  useEffect(() => {
    if (!draftKey) {
      setDraftLoaded(true);
      return;
    }
    let active = true;
    loadMailDraft(draftKey)
      .then((draft) => {
        if (active && draft) setContent((prev) => (prev.length > 0 ? prev : draft));
      })
      .catch(() => {})
      .finally(() => active && setDraftLoaded(true));
    return () => {
      active = false;
    };
  }, [draftKey]);

  // 자동 임시저장 — 입력이 멎고 잠시 뒤 기기에 남긴다. 비우면 초안도 지워진다.
  useEffect(() => {
    if (!draftLoaded || !draftKey) return;
    const timer = setTimeout(() => void saveMailDraft(draftKey, content).catch(() => {}), 600);
    return () => clearTimeout(timer);
  }, [content, draftLoaded, draftKey]);

  // 화면을 나갈 때 마지막 입력을 놓치지 않게 한 번 더 저장한다(디바운스 꼬리 유실 방지).
  // 이미 부친 편지는 초안을 되살리면 안 되므로 건너뛴다.
  const flushRef = useRef({ draftKey, content, draftLoaded, sent: false });
  flushRef.current = { ...flushRef.current, draftKey, content, draftLoaded };
  useEffect(
    () => () => {
      const f = flushRef.current;
      if (f.draftLoaded && f.draftKey && !f.sent) void saveMailDraft(f.draftKey, f.content).catch(() => {});
    },
    [],
  );

  const hasContact = (includePhone && !!myPhone) || kakaoId.trim().length > 0;
  const canSend = (!!peerAnswerId || !!replyMailId) && content.trim().length > 0 && hasContact && !sending;

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      const body = content.trim();
      const withPhone = includePhone && !!myPhone;
      const kakao = kakaoId.trim() || null;
      if (replyMailId) await sendMailReply(replyMailId, body, withPhone, kakao);
      else await sendMail(peerAnswerId!, body, withPhone, kakao);
      flushRef.current.sent = true;
      if (draftKey) void clearMailDraft(draftKey).catch(() => {}); // 부친 편지의 초안은 지운다
      Alert.alert('편지를 보냈어요', `잉크 ${INK_PRICE.MAIL}을 사용했어요.`, [{ text: '확인', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('보내기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
    } finally {
      setSending(false);
    }
  }

  /** 잉크를 쓰는 행동이라 한 번 확인한다 — 남은 잉크를 함께 보여주고. */
  function confirmSend() {
    if (!canSend) return;
    Alert.alert(
      '편지 보내기',
      ink != null
        ? `잉크 ${INK_PRICE.MAIL}을 사용해요. (남은 잉크 ${ink})`
        : `잉크 ${INK_PRICE.MAIL}을 사용해요.`,
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
              {replyMailId
                ? '답장은 한 번만 보낼 수 있어요.\n내 연락처를 건네면 상대의 연락처도 열려요.'
                : '이 편지가 전해지면 대화는 앱 밖에서 이어져요.\n짧은 인사와 함께 연락처를 건네보세요.'}
            </Text>

            <TextInput
              value={content}
              onChangeText={(t) => setContent(t.slice(0, CONTENT_MAX))}
              multiline
              placeholder="만나서 반가웠어요. 편하게 연락 주세요."
              placeholderTextColor={c.textSecondary}
              style={[styles.body, { color: c.text, borderColor: c.border, backgroundColor: c.backgroundElement }]}
            />
            <View style={styles.counterRow}>
              <Text style={[styles.draftHint, { color: c.textSecondary }]}>
                {content.trim().length > 0 ? '쓰다 나가도 임시저장돼요' : ''}
              </Text>
              <Text style={[styles.counter, { color: c.textSecondary }]}>
                {content.length}/{CONTENT_MAX}
              </Text>
            </View>

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
                {sending ? '보내는 중...' : `잉크 ${INK_PRICE.MAIL}으로 보내기`}
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
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  draftHint: { fontSize: 12 },
  counter: { fontSize: 12, textAlign: 'right' },

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
