import { useQuery } from '@tanstack/react-query';

import { getAccessToken } from './auth-storage';
import { getMyProfile, type MemberProfile } from './member';

/**
 * 지금 이 화면을 보는 사람이 누구인지 — 한 곳에서만 답한다.
 *
 * 1.3부터 앱에는 세 종류의 사람이 있다.
 *  - **손님**: 로그인하지 않았다. 모임은 둘러볼 수 있고, 소개팅은 닫혀 있다.
 *  - **모임 회원**: 가입했지만 선호 성별을 비워뒀다. 모임만 쓴다.
 *  - **소개팅 회원**: 선호 성별이 있다. 전부 쓴다.
 *
 * 화면마다 토큰을 읽고 프로필을 물어보면 판단이 조금씩 어긋난다. 그래서 이 훅 하나가
 * 답을 쥐고, 캐시(React Query)에 담아 탭을 옮겨도 다시 묻지 않게 한다.
 */
export type Session = {
  /** 로그인했는가. 프로필을 아직 안 만들었어도 토큰이 살아 있으면 참. */
  signedIn: boolean;
  /** 가입을 마친 회원의 프로필. 손님이거나 온보딩 전이면 null. */
  profile: MemberProfile | null;
  /** 소개팅을 쓰는가 — 선호 성별이 채워져 있는가. */
  dating: boolean;
  /** 아직 확인 중. 첫 프레임에서 손님으로 단정해 가입 유도를 띄우지 않기 위해 본다. */
  loading: boolean;
};

export const SESSION_QUERY_KEY = ['session'] as const;

export function useSession(): Session {
  const q = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) return { signedIn: false, profile: null };
      // 토큰이 죽었으면 authedFetch가 지운다 — 여기서는 손님으로 떨어질 뿐이다.
      const profile = await getMyProfile().catch(() => null);
      return { signedIn: profile != null || (await getAccessToken()) != null, profile };
    },
  });

  return {
    signedIn: q.data?.signedIn ?? false,
    profile: q.data?.profile ?? null,
    dating: q.data?.profile?.preferredGender != null,
    loading: q.isPending,
  };
}
