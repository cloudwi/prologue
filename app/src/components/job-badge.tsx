import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, type ThemeColors } from '@/constants/theme';

/**
 * 직장 인증 배지 — 이 앱에서 유일한 신원 신호.
 *
 * 아이콘은 방패 안의 체크다. 처음에는 서류가방(briefcase)이었는데, 그건 "일"이나 "가방"이지
 * "확인됐다"가 아니다. 배지가 말해야 하는 건 직업이 아니라 **누군가 확인해 줬다**는 사실이라
 * 여권 도장이나 인증 마크의 문법을 따른다.
 *
 * 면은 포인트색으로 꽉 채운다(유저 결정 2026-08-24 — 반투명은 눈에 안 들어왔다).
 * 디자인 시스템의 "한 화면에 포인트 한 곳" 규칙에는 예외인데, 이 배지는 장식이 아니라
 * 신뢰를 파는 물건이라 흐려지면 존재 이유가 없어진다.
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
  /** 아이콘만 — 이름이 늘어선 자리라 글자를 더하면 줄이 무너지는 곳에서 쓴다. */
  mark?: boolean;
}) {
  if (mark) {
    return <Ionicons name="shield-checkmark" size={12} color={c.primaryStrong} />;
  }
  return (
    <View style={[styles.chip, { backgroundColor: c.primary }]}>
      <Ionicons name="shield-checkmark" size={11.5} color={c.primaryText} />
      <Text style={[styles.text, { color: c.primaryText }]}>{label ?? (domain ? `${domain} 인증` : '직장 인증')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 글자보다 조금 넉넉한 높이 — 도장처럼 보이려면 글자가 테두리에 닿지 않아야 한다.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    height: 23,
    paddingLeft: 7,
    paddingRight: 9,
    borderRadius: Radius.pill,
  },
  text: { fontSize: 12.5, fontWeight: '700', letterSpacing: -0.1 },
});
