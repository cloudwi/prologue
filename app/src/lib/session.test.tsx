import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError } from './api';
import { getAccessToken } from './auth-storage';
import { getMyProfile, type MemberProfile } from './member';
import { SESSION_QUERY_KEY, useSession } from './session';

jest.mock('./auth-storage');
jest.mock('./member');

const profile = { accountId: 'member-a', preferredGender: 'FEMALE' } as MemberProfile;
let client: QueryClient;

beforeEach(() => {
  jest.resetAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  jest.mocked(getAccessToken).mockResolvedValue('access');
  jest.mocked(getMyProfile).mockResolvedValue(profile);
});

afterEach(() => { client.clear(); });

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('세션 조회', () => {
  it('토큰이 없는 손님은 프로필 API를 호출하지 않는다', async () => {
    jest.mocked(getAccessToken).mockResolvedValue(null);
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signedIn).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getMyProfile).not.toHaveBeenCalled();
  });

  it('일시적인 프로필 조회 실패를 오류로 알리고, 재시도하면 회원 상태를 복구한다', async () => {
    const offline = new TypeError('Network request failed');
    jest.mocked(getMyProfile).mockRejectedValueOnce(offline);
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.error).toBe(offline));

    await act(() => { result.current.retry(); });
    await waitFor(() => expect(result.current.dating).toBe(true));
    expect(result.current.signedIn).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('백그라운드 갱신 실패는 이미 확인한 회원 프로필을 지우지 않는다', async () => {
    client.setQueryData(SESSION_QUERY_KEY, { signedIn: true, profile });
    jest.mocked(getMyProfile).mockRejectedValue(new Error('unavailable'));
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(client.getQueryState(SESSION_QUERY_KEY)?.status).toBe('error'));

    expect(result.current.profile).toEqual(profile);
    expect(result.current.dating).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('확정된 세션 만료로 토큰이 지워졌으면 손님 상태로 전환한다', async () => {
    jest.mocked(getMyProfile).mockImplementation(async () => {
      jest.mocked(getAccessToken).mockResolvedValue(null);
      throw new ApiError(401);
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signedIn).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('프로필이 아직 없는 계정은 통신 실패와 구분한다', async () => {
    jest.mocked(getMyProfile).mockResolvedValue(null);
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signedIn).toBe(true);
    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
