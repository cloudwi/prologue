// 답변·프로필·전체 URL을 보내지 않는 공개 웹 퍼널. 키가 없는 빌드에서는 비활성이다.
const EVENTS = new Set(['web_landing_viewed', 'web_preview_completed', 'web_download_clicked', 'web_store_opened']);
const SOURCES = new Set(['instagram', 'threads', 'community', 'partner', 'direct']);
const MEDIA = new Set(['organic_social', 'referral', 'qr', 'cpc']);

export function createWebAnalytics({ key, enabled, browser = window }) {
  const active = enabled && !!key && ['/', '/download'].includes(browser.location.pathname)
    && browser.navigator.doNotTrack !== '1' && !browser.navigator.globalPrivacyControl;
  if (!active) return () => {};
  let id;
  let attribution = {};
  try {
    id = browser.sessionStorage.getItem('prologue_web_session') || `web_${browser.crypto.randomUUID()}`;
    browser.sessionStorage.setItem('prologue_web_session', id);
    const params = new URLSearchParams(browser.location.search);
    if (params.has('utm_source')) {
      attribution = {
        source: SOURCES.has(params.get('utm_source')) ? params.get('utm_source') : 'other',
        medium: MEDIA.has(params.get('utm_medium')) ? params.get('utm_medium') : 'other',
        campaign: params.get('utm_campaign') === 'first_connection' ? 'first_connection' : 'other',
      };
      browser.sessionStorage.setItem('prologue_web_attribution', JSON.stringify(attribution));
    } else {
      const saved = JSON.parse(browser.sessionStorage.getItem('prologue_web_attribution') || '{}');
      // 저장소 값도 허용 목록으로 다시 제한한다.
      attribution = {
        source: SOURCES.has(saved.source) ? saved.source : 'direct',
        medium: MEDIA.has(saved.medium) ? saved.medium : 'other',
        campaign: saved.campaign === 'first_connection' ? saved.campaign : 'other',
      };
    }
  } catch {
    // 저장소·브라우저 기능 차단은 서비스 이용을 막지 않는다.
    if (!id) return () => {};
  }
  return (event, store) => {
    if (!EVENTS.has(event)) return;
    const payload = JSON.stringify({
      token: key, event, distinct_id: id,
      properties: { ...attribution, page: browser.location.pathname, $process_person_profile: false,
        ...(store === 'ios' || store === 'android' ? { store } : {}) },
    });
    try {
      const sent = browser.navigator.sendBeacon?.('https://us.i.posthog.com/i/v0/e/', new Blob([payload], { type: 'text/plain' }));
      if (!sent) void browser.fetch('https://us.i.posthog.com/i/v0/e/', {
        method: 'POST', body: payload, headers: { 'Content-Type': 'text/plain' }, keepalive: true, credentials: 'omit',
      }).catch(() => {});
    } catch { /* 분석 전송 실패는 이동·체험에 영향을 주지 않는다. */ }
  };
}

export const trackWeb = typeof window === 'undefined' ? () => {} : createWebAnalytics({
  key: import.meta.env.PUBLIC_POSTHOG_KEY,
  enabled: import.meta.env.PROD,
});

export function initWebAnalytics(doc = document, track = trackWeb) {
  if (doc.location.pathname === '/') track('web_landing_viewed');
  doc.addEventListener('click', (event) => {
    const link = event.target.closest?.('a');
    if (!link) return;
    if (link.getAttribute('href') === '/download') track('web_download_clicked');
    if (link.dataset.store) track('web_store_opened', link.dataset.store);
  });
}
