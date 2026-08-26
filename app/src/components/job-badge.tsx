import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { type ThemeColors } from '@/constants/theme';

/**
 * 직장 인증 배지 — 편지에 찍는 인장.
 *
 * 앞서 서류가방과 방패를 거쳤는데 둘 다 남의 말이었다. 가방은 "일"이지 "확인됐다"가 아니고,
 * 방패는 보안 앱의 언어다. 이 앱은 편지로 말하는 서비스다 — 브랜드 마크가 **하트 씰로 봉한
 * 편지 봉투**이고(design/README.md), 코드도 아직 안 연 봉투를 `sealed`라고 부른다.
 *
 * 그래서 인증도 인장으로 찍는다. 봉인은 원래 "내가 확인했고, 그 사이 아무도 손대지 않았다"는
 * 표시였다. 이 배지가 말해야 하는 것과 정확히 같다. 하트 씰이 마음의 봉인이라면 이건 신원의
 * 봉인이라, 같은 조형에 다른 마크를 넣는다.
 *
 * 형태도 도장을 따른다. 알약에 글자를 가두지 않고 **인장을 찍고 그 옆에 글자를 둔다** —
 * 편지지 위에 인장이 찍힌 모습이 이 서비스의 그림이다. 색 덩어리는 인장이 지고, 글자는
 * `primaryStrong`으로 대비를 지킨다(작은 글자에 `primary`는 4.5:1을 못 넘긴다).
 *
 * **회사 도메인은 호출하는 쪽이 정한다.** 목록에서는 넘기지 않는다 — 훑기만 해도 여러 사람의
 * 직장이 한 번에 수집되는 자리이기 때문이다. 어느 회사인지는 상세에서만 열린다.
 */
export function JobBadge({
  c,
  domain,
  label,
  mark = false,
}: {
  c: ThemeColors;
  /** 회사 도메인. 넘기면 "도메인 인증", 없으면 "직장 인증". 상세에서만 넘긴다. */
  domain?: string | null;
  /** 글자를 직접 정할 때(신청자 행의 "인증"처럼 자리가 좁을 때). */
  label?: string;
  /** 인장만 — 이름이 늘어선 자리라 글자를 더하면 줄이 무너지는 곳에서 쓴다. */
  mark?: boolean;
}) {
  const seal = (
    <View style={[styles.seal, { backgroundColor: c.primary }]}>
      {/* 밀랍이 눌리며 생기는 도드라진 테 — 이 선 하나가 원을 도장으로 만든다. */}
      <View style={[styles.sealRim, { borderColor: c.primaryText }]} />
      <Ionicons name="checkmark" size={9} color={c.primaryText} />
    </View>
  );

  if (mark) return seal;

  return (
    <View style={styles.badge}>
      {seal}
      <Text style={[styles.text, { color: c.primaryStrong }]}>{label ?? (domain ? `${domain} 인증` : '직장 인증')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5 },
  seal: { width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  // 테는 살짝 안쪽으로 — 밀랍 가장자리가 눌려 퍼진 모양이라 바깥선이 아니라 안쪽 선이다.
  sealRim: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, borderRadius: 7, borderWidth: 0.9, opacity: 0.5 },
  text: { fontSize: 12.5, fontWeight: '700', letterSpacing: -0.1 },
});
