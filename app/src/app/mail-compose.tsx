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
import { track } from '@/lib/analytics';
import { haptics } from '@/lib/haptics';
import { clearMailDraft, loadMailDraft, saveMailDraft } from '@/lib/mail-drafts';
import { getMyProfile } from '@/lib/member';
import { formatPhoneDigits } from '@/lib/phone';
import { getMailQuote, sendMail, sendMailReply, type MailQuote } from '@/lib/mails';
import { INK_PRICE } from '@/lib/ink';

const CONTENT_MAX = 300;
// 잉크를 낸 한 통이 "연락주세요" 한 줄로 끝나지 않도록 — 서버도 같은 값으로 막는다.
const CONTENT_MIN = 50;

/**
 * 편지 쓰기 — 인앱 채팅 대신 연락처를 건네는 한 통.
 * 300자 메시지에 전화번호/카카오톡 ID 중 하나 이상을 반드시 싣는다.
 * 한 통에 잉크 50, 서로 하트를 주고받은 상대에게는 35(30% 할인), 받은 편지에 답장은 25(50% 할인).
 * 값은 서버 견적(GET /mails/quote)이 정한다. 견적이 오기 전에는 화면을 그리지 않는다 —
 * 정가를 먼저 보여줬다가 할인가로 바꾸면 값이 튀어 보이고, 그 한 순간이 "속은 느낌"을 남긴다.
 * 상대는 둘 중 하나로 정해진다: 답변 id(peerAnswerId) 또는 답장할 원본 편지(replyMailId).
 * 초안은 상대별로 기기에 임시저장된다: 쓰다 나가도 다음에 이어 쓰고, 보내면 지운다.
 */
/**
 * 스토어 리뷰 요청 — OS가 알아서 빈도를 제한하므로(연 3회 등) 부담 없이 부른다.
 * 동적 import + try/catch: 네이티브 모듈이 없는 구버전 바이너리(OTA만 받은)에서는 조용히 넘어간다.
 */
async function requestStoreReview() {
  try {
    const StoreReview = await import('expo-store-review');
    if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
  } catch {
    // 다음 바이너리 빌드부터 동작한다 — 실패해도 아무 일도 없어야 한다.
  }
}

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
  /*
   * 편지값 견적 — 답장이면 절반, 서로 하트면 30% 할인.
   *
   * 서버에서 받은 값이 있으면 그것을 쓰고, 없으면 **아는 값**으로 그린다.
   * 예전에는 effect 안에서 setQuote(fallback)로 되돌렸는데, 그러면 한 프레임 헛돌고
   * "effect에서 상태를 동기적으로 바꾸지 말라"는 규칙에도 걸린다. 파생값이면 둘 다 사라진다.
   * 실제 차감은 서버가 정하므로 화면이 틀려도 돈은 안 샌다.
   */
  const [serverQuote, setServerQuote] = useState<MailQuote | null>(null);
  const quoteTarget = peerAnswerId ? { peerAnswerId } : replyMailId ? { replyMailId } : null;
  const knownQuote: MailQuote = replyMailId
    ? { price: INK_PRICE.MAIL_REPLY, discount: 'REPLY' }
    : { price: INK_PRICE.MAIL, discount: null };
  // 물어볼 곳이 없으면 아는 값이 곧 견적이다. 물어볼 곳이 있으면 답이 올 때까지 null(화면은 기다린다).
  const quote = serverQuote ?? (quoteTarget ? null : knownQuote);

  useEffect(() => track('mail_compose_started'), []);

  useEffect(() => {
    if (!peerAnswerId && !replyMailId) return;
    const target = peerAnswerId ? { peerAnswerId } : { replyMailId: replyMailId! };
    const fallback: MailQuote = replyMailId
      ? { price: INK_PRICE.MAIL_REPLY, discount: 'REPLY' }
      : { price: INK_PRICE.MAIL, discount: null };
    let active = true;
    getMailQuote(target)
      .then((q) => active && setServerQuote(q))
      .catch(() => active && setServerQuote(fallback));
    return () => {
      active = false;
    };
  }, [peerAnswerId, replyMailId]);
  const [sending, setSending] = useState(false);
  // 초안을 읽기 전에는 자동 저장을 멈춰둔다 — 빈 값이 초안을 덮어쓰지 않게.
  // 저장할 키가 아예 없으면 읽을 것도 없으니 처음부터 '읽기 끝'으로 둔다.
  const [draftLoaded, setDraftLoaded] = useState(!draftKey);

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
    return () => {
      active = false;
    };
  }, []);

  // 쓰다 만 초안이 있으면 이어 쓴다.
  useEffect(() => {
    if (!draftKey) return;
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
  // 최신 값을 ref에 옮기는 일은 렌더가 끝난 뒤에 한다 — 렌더 중 ref 변경은 값이 언제 반영될지 보장되지 않는다.
  useEffect(() => {
    flushRef.current = { ...flushRef.current, draftKey, content, draftLoaded };
  });
  useEffect(
    () => () => {
      const f = flushRef.current;
      if (f.draftLoaded && f.draftKey && !f.sent) void saveMailDraft(f.draftKey, f.content).catch(() => {});
    },
    [],
  );

  const hasContact = (includePhone && !!myPhone) || kakaoId.trim().length > 0;
  const canSend =
    (!!peerAnswerId || !!replyMailId) && !!quote && content.trim().length >= CONTENT_MIN && hasContact && !sending;

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      const body = content.trim();
      const withPhone = includePhone && !!myPhone;
      const kakao = kakaoId.trim() || null;
      const result = replyMailId
        ? await sendMailReply(replyMailId, body, withPhone, kakao)
        : await sendMail(peerAnswerId!, body, withPhone, kakao);
      flushRef.current.sent = true;
      if (draftKey) void clearMailDraft(draftKey).catch(() => {}); // 부친 편지의 초안은 지운다
      track('mail_sent', { discount: quote?.discount ?? 'NONE' });
      haptics.success(); // 연락처를 건넨 순간 — 이 앱에서 가장 무거운 행동
      Alert.alert('편지를 보냈어요', `잉크 ${result.inkSpent}을 사용했어요.`, [
        {
          text: '확인',
          onPress: () => {
            router.back();
            // 답장 = 서로의 연락처가 열린 순간 — 이 앱에서 가장 행복한 순간에만 리뷰를 청한다.
            if (replyMailId) setTimeout(() => void requestStoreReview(), 700);
          },
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '잠시 후 다시 시도해주세요';
      // 잔액은 평소에 안 보여준다 — 모자란 순간에 충전으로 바로 보내는 게 답이다(유저 결정 2026-08-24).
      if (msg.includes('잉크가 부족')) {
        Alert.alert('잉크가 부족해요', '충전하고 다시 보내볼까요?', [
          { text: '다음에', style: 'cancel' },
          { text: '충전하러 가기', onPress: () => router.push('/my/ink-topup') },
        ]);
      } else {
        Alert.alert('보내기 실패', msg);
      }
    } finally {
      setSending(false);
    }
  }

  /** 잉크를 쓰는 행동이라 한 번 확인한다 — 값만 말한다(잔액은 지갑에서만). */
  function confirmSend() {
    if (!canSend || !quote) return;
    Alert.alert(
      '편지 보내기',
      quote.discount === 'REPLY'
        ? `답장은 절반값이라 잉크 ${quote.price}으로 보내요.`
        : quote.discount === 'MUTUAL'
          ? `서로 호감을 주고받은 사이라 잉크 ${quote.price}으로 보내요.`
          : `잉크 ${quote.price}을 사용해요.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '보내기', onPress: () => void send() },
      ],
    );
  }

  return (
    <SubScreen title="편지 쓰기" c={c}>
      {loading || !quote ? (
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
                {content.trim().length > 0 && content.trim().length < CONTENT_MIN
                  ? `${CONTENT_MIN}자 이상 적어야 보낼 수 있어요`
                  : content.trim().length > 0
                    ? '쓰다 나가도 임시저장돼요'
                    : ''}
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
            {/* 할인이면 이유와 정가를 함께 — "무료로도 이어질 수 있다"는 약속이 눈에 보여야 한다 */}
            {quote.discount && (
              <Text style={[styles.discountNote, { color: c.primaryStrong }]}>
                {quote.discount === 'REPLY'
                  ? `받은 편지에 답장은 50% 할인 (정가 ${INK_PRICE.MAIL})`
                  : `서로 호감을 주고받은 사이라 30% 할인 (정가 ${INK_PRICE.MAIL})`}
              </Text>
            )}
            <Pressable
              onPress={confirmSend}
              disabled={!canSend}
              style={[styles.submit, { backgroundColor: c.primary, opacity: canSend ? 1 : 0.5 }]}
            >
              <Text style={[styles.submitText, { color: c.primaryText }]}>
                {sending ? '보내는 중...' : `잉크 ${quote.price}으로 보내기`}
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
  lead: { fontSize: 14.5, lineHeight: 22, marginTop: 8, marginBottom: 18 },

  body: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 16,
    fontSize: 16.5,
    lineHeight: 25,
    textAlignVertical: 'top',
  },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  draftHint: { fontSize: 13 },
  counter: { fontSize: 13, textAlign: 'right' },

  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginTop: 22, marginBottom: 8 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contactLabel: { fontSize: 15.5, fontWeight: '600' },
  contactValue: { fontSize: 14, marginTop: 3 },
  contactCheck: { fontSize: 18, fontWeight: '700' },
  kakaoRow: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 12, marginTop: 10 },
  kakaoInput: { fontSize: 15.5, paddingVertical: 6, marginTop: 2 },
  contactHint: { fontSize: 13.5, marginTop: 10 },

  footer: { paddingHorizontal: 20, paddingBottom: 12 },
  discountNote: { fontSize: 13.5, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  submit: { height: 54, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 16.5, fontWeight: '700' },
});
