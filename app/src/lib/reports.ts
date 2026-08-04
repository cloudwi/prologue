import { Alert } from 'react-native';

import { authedRequest } from './api';

/**
 * 신고 — 사용자 콘텐츠(프로필·답변·편지) 검토 요청. 앱스토어 UGC 요건.
 * 대상은 서버가 식별자로 판정한다: 프로필/답변은 peerAnswerId, 받은 편지는 mailId.
 */

const REASONS = [
  { key: 'SPAM', label: '스팸·광고예요' },
  { key: 'ABUSE', label: '욕설·혐오 표현이에요' },
  { key: 'SEXUAL', label: '성적으로 불쾌해요' },
  { key: 'FAKE', label: '사칭·허위 프로필 같아요' },
  { key: 'OTHER', label: '기타' },
] as const;

async function sendReport(target: { peerAnswerId?: string; mailId?: string }, reason: string): Promise<void> {
  await authedRequest<void>('POST', '/reports', { ...target, reason });
}

/** 사유를 고르게 한 뒤 신고를 보낸다 — 별도 화면 없이 시스템 다이얼로그로 가볍게. */
export function promptReport(target: { peerAnswerId?: string; mailId?: string }) {
  Alert.alert('신고하기', '어떤 문제가 있나요?', [
    ...REASONS.map((r) => ({
      text: r.label,
      onPress: async () => {
        try {
          await sendReport(target, r.key);
          Alert.alert('신고가 접수됐어요', '빠르게 확인하고 조치할게요. 알려주셔서 고마워요.');
        } catch (e) {
          Alert.alert('신고하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요');
        }
      },
    })),
    { text: '취소', style: 'cancel' as const },
  ]);
}
