import { ApiError, authedRequest, isSessionExpired } from './api';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './auth-storage';

jest.mock('./auth-storage');

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

function response(status: number, body: unknown = null): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

beforeEach(() => {
  jest.resetAllMocks();
  globalThis.fetch = fetchMock;
  jest.mocked(getAccessToken).mockResolvedValue('old-access');
  jest.mocked(getRefreshToken).mockResolvedValue('old-refresh');
});

afterAll(() => { globalThis.fetch = originalFetch; });

describe('토큰 재발급', () => {
  it('만료 뒤 새 토큰으로 원래 요청을 다시 보낸다', async () => {
    fetchMock.mockResolvedValueOnce(response(403))
      .mockResolvedValueOnce(response(200, tokens))
      .mockResolvedValueOnce(response(200, { value: 1 }));
    jest.mocked(saveTokens).mockImplementation(async () => {
      jest.mocked(getAccessToken).mockResolvedValue(tokens.accessToken);
    });

    await expect(authedRequest('GET', '/member/me')).resolves.toEqual({ value: 1 });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new-access');
    expect(clearTokens).not.toHaveBeenCalled();
  });

  it('재발급 중 통신이 끊겨도 토큰을 보존하고 다음 요청에서 다시 시도한다', async () => {
    const offline = new TypeError('Network request failed');
    fetchMock.mockResolvedValueOnce(response(403)).mockRejectedValueOnce(offline);

    await expect(authedRequest('GET', '/member/me')).rejects.toBe(offline);
    expect(isSessionExpired(offline)).toBe(false);
    expect(clearTokens).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(response(403))
      .mockResolvedValueOnce(response(200, tokens))
      .mockResolvedValueOnce(response(200, { recovered: true }));
    await expect(authedRequest('GET', '/member/me')).resolves.toEqual({ recovered: true });
  });

  it.each([429, 500, 503])('재발급 서버의 %s 응답은 세션 만료가 아니다', async (status) => {
    fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(status));

    await expect(authedRequest('GET', '/member/me')).rejects.toMatchObject({ status });
    expect(isSessionExpired(new ApiError(status))).toBe(false);
    expect(clearTokens).not.toHaveBeenCalled();
    expect(saveTokens).not.toHaveBeenCalled();
  });

  it.each([401, 403])('재발급 자체가 %s로 거절되면 토큰을 지운다', async (status) => {
    fetchMock.mockResolvedValueOnce(response(403)).mockResolvedValueOnce(response(status));

    await expect(authedRequest('GET', '/member/me')).rejects.toMatchObject({ status: 403 });
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });

  it('refresh token이 없으면 로그인으로 돌아갈 수 있게 정리한다', async () => {
    jest.mocked(getRefreshToken).mockResolvedValue(null);
    fetchMock.mockResolvedValueOnce(response(401));

    await expect(authedRequest('GET', '/member/me')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });

  it.each([null, {}, { accessToken: '', refreshToken: 'refresh' }])('잘못된 재발급 응답으로 기존 토큰을 덮어쓰지 않는다: %p', async (body) => {
    fetchMock.mockResolvedValueOnce(response(403)).mockResolvedValueOnce(response(200, body));

    await expect(authedRequest('GET', '/member/me')).rejects.toThrow('다시 시도');
    expect(saveTokens).not.toHaveBeenCalled();
    expect(clearTokens).not.toHaveBeenCalled();
  });

  it('여러 요청이 함께 만료되어도 재발급은 한 번만 보낸다', async () => {
    let refreshed = false;
    let finishRefresh!: (value: Response) => void;
    const pendingRefresh = new Promise<Response>((resolve) => { finishRefresh = resolve; });
    const refreshStarted = new Promise<void>((resolve) => {
      fetchMock.mockImplementation((url: string) => {
        if (url.endsWith('/auth/refresh')) {
          resolve();
          return pendingRefresh;
        }
        return Promise.resolve(response(refreshed ? 200 : 403, { ok: true }));
      });
    });
    jest.mocked(saveTokens).mockImplementation(async () => { refreshed = true; });

    const first = authedRequest('GET', '/one');
    const second = authedRequest('GET', '/two');
    await refreshStarted;
    finishRefresh(response(200, tokens));
    await Promise.all([first, second]);

    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1);
    expect(saveTokens).toHaveBeenCalledTimes(1);
    expect(clearTokens).not.toHaveBeenCalled();
  });
});
