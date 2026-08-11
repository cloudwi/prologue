import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
 */
const REVEAL_MS = 20_000;

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

  // 열어둔 채 화면을 떠나거나 잊어버려도 알아서 닫힌다
  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(false), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [revealed]);

  if (!phone && !kakaoId) return null;

  return (
    <Pressable
      onPress={() => setRevealed((v) => !v)}
      style={({ pressed }) => [
        styles.box,
        { backgroundColor: c.backgroundSelected, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.lines}>
        {phone ? (
          <Text selectable={revealed} style={[styles.line, { color: c.text }]}>
            전화번호  {revealed ? formatPhoneDigits(phone) : maskPhone(phone)}
          </Text>
        ) : null}
        {kakaoId ? (
          <Text selectable={revealed} style={[styles.line, { color: c.text }]}>
            카카오톡  {revealed ? kakaoId : maskId(kakaoId)}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.hint, { color: c.primaryStrong }]}>{revealed ? '가리기' : '보기'}</Text>
    </Pressable>
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
  lines: { gap: 6, flexShrink: 1 },
  line: { fontSize: 14, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 13, fontWeight: '700' },
});
