import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Clipboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, type ThemeColors } from '@/constants/theme';
import { formatPhoneDigits } from '@/lib/phone';

/**
 * 연락처는 기본으로 가려두고, 눌러야 잠깐 보인다.
 *
 * 화면 캡처는 막았지만 옆에서 찍는 사진이나 어깨너머 시선은 앱이 어쩌지 못한다.
 * 그래서 노출 자체를 짧게 만든다 — 연락처가 화면에 떠 있는 시간이 몇십 초로 줄면
 * 우연히 찍히거나 보일 확률이 그만큼 낮아진다.
 *
 * 확인하는 순간에 무게가 실리는 부수 효과도 있다. 편지로 건네받은 번호는
 * 스쳐 지나가는 정보가 아니라 한 번 마음먹고 여는 것이 된다.
 *
 * 열린 뒤에는 줄마다 복사 버튼이 붙는다 — 번호를 외워 옮겨 적게 두면 틀리고,
 * 틀린 번호로 건 첫 전화는 되돌릴 수 없다.
 */
const REVEAL_MS = 20_000;
const COPIED_MS = 1_600;

export function RevealableContact({
  phone,
  kakaoId,
  c,
}: {
  phone?: string | null;
  kakaoId?: string | null;
  c: ThemeColors;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<'phone' | 'kakao' | null>(null);

  // 열어둔 채 화면을 떠나거나 잊어버려도 알아서 닫힌다
  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(false), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [revealed]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!phone && !kakaoId) return null;

  /** 복사는 RN 코어의 Clipboard — 새 네이티브 모듈 없이(OTA로 나갈 수 있게) 된다. */
  function copy(kind: 'phone' | 'kakao', value: string) {
    Clipboard.setString(value);
    setCopied(kind);
  }

  return (
    <Pressable
      onPress={() => setRevealed((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={revealed ? '연락처 가리기' : '연락처 보기'}
      style={({ pressed }) => [
        styles.box,
        { backgroundColor: c.backgroundSelected, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.lines}>
        {phone ? (
          <ContactLine
            label="전화번호"
            value={revealed ? formatPhoneDigits(phone) : maskPhone(phone)}
            revealed={revealed}
            copied={copied === 'phone'}
            onCopy={() => copy('phone', phone.replace(/\D/g, ''))}
            c={c}
          />
        ) : null}
        {kakaoId ? (
          <ContactLine
            label="카카오톡"
            value={revealed ? kakaoId : maskId(kakaoId)}
            revealed={revealed}
            copied={copied === 'kakao'}
            onCopy={() => copy('kakao', kakaoId)}
            c={c}
          />
        ) : null}
      </View>

      <Text style={[styles.hint, { color: c.primaryStrong }]}>{revealed ? '가리기' : '보기'}</Text>
    </Pressable>
  );
}

function ContactLine({
  label,
  value,
  revealed,
  copied,
  onCopy,
  c,
}: {
  label: string;
  value: string;
  revealed: boolean;
  copied: boolean;
  onCopy: () => void;
  c: ThemeColors;
}) {
  return (
    <View style={styles.lineRow}>
      <Text selectable={revealed} style={[styles.line, { color: c.text }]}>
        {label}  {value}
      </Text>
      {revealed && (
        <Pressable
          onPress={onCopy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${label} 복사`}
          style={({ pressed }) => [
            styles.copyBtn,
            { backgroundColor: copied ? c.primary : c.backgroundElement, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={12} color={copied ? c.primaryText : c.primaryStrong} />
          <Text style={[styles.copyText, { color: copied ? c.primaryText : c.primaryStrong }]}>{copied ? '복사했어요' : '복사'}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** 앞 세 자리(통신사 국번)만 남긴다 — 형태는 알아보되 번호는 못 읽게. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits.slice(0, 3) || '010'}-••••-••••`;
}

/** 첫 글자만 남긴다. 길이를 그대로 드러내지 않도록 점은 고정 개수로. */
function maskId(id: string): string {
  return `${id.slice(0, 1)}••••••`;
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  lines: { gap: 8, flexShrink: 1, flex: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { fontSize: 14, fontVariant: ['tabular-nums'], flexShrink: 1 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 9, borderRadius: Radius.pill },
  copyText: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 13, fontWeight: '700' },
});
