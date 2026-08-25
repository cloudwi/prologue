import * as Haptics from 'expo-haptics';

/**
 * 촉각 피드백 — 화면이 아니라 손에 남는 확인.
 *
 * 마음이 오가는 순간(하트·편지·확정)은 화면 변화만으로는 가볍게 지나간다.
 * 짧은 진동 하나가 "지금 일어났다"를 몸으로 알려준다.
 *
 * 규칙: **사용자가 시작한 행동의 결과에만** 준다. 화면 전환이나 스크롤처럼
 * 저절로 일어나는 일에 붙이면 앱이 수다스러워진다.
 * 실패해도 삼킨다 — 진동이 안 되는 기기·설정에서 앱이 멈출 이유는 없다.
 */
export const haptics = {
  /** 가벼운 확인 — 토글, 선택. */
  select: () => void Haptics.selectionAsync().catch(() => {}),
  /** 뜻이 있는 성공 — 답변 저장, 하트, 신청. */
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** 막혔을 때 — 조건 미달, 실패. */
  warn: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
