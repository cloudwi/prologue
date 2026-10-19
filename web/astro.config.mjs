// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * 글별 수정일 — 사이트맵 lastmod에 쓴다.
 *
 * 전에는 lastmod: new Date()로 모든 페이지가 "빌드한 날"에 바뀐 것처럼 보였다.
 * 그러면 검색 엔진이 lastmod를 믿지 않게 되고, 정말 고친 글도 새로 읽어가지 않는다.
 * 설정 파일에서는 astro:content를 못 불러서 frontmatter를 직접 읽는다(updatedDate가 있으면 그것, 없으면 pubDate).
 */
const storyLastmod = new Map(
  readdirSync('./src/content/blog')
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const head = readFileSync(`./src/content/blog/${f}`, 'utf8').split('\n---')[0];
      const date = (key) => head.match(new RegExp(`^${key}:\\s*(\\S+)`, 'm'))?.[1];
      return [`/story/${f.replace(/\.md$/, '')}`, date('updatedDate') ?? date('pubDate')];
    }),
);

export default defineConfig({
  site: 'https://prologue.day',
  // 이전 웹 모임 주소는 앱 다운로드로 보낸다. 운영 Render의 같은 주소도
  // backend rewrite 대신 /download redirect로 설정해야 한다(render.yaml).
  redirects: {
    '/meetups': '/download',
    '/host': '/download',
  },
  integrations: [
    sitemap({
      // 운영 도구·인증 콜백은 검색 결과에 나올 이유가 없다(페이지 자체도 noindex).
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, '');
        return !path.startsWith('/admin') && !path.startsWith('/auth') &&
          !['/meetups', '/host'].includes(path);
      },
      changefreq: 'weekly',
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, '');
        const lastmod = storyLastmod.get(path);
        // 글이 아닌 페이지는 lastmod를 비워 둔다 — 모르는 날짜를 지어내지 않는다.
        return lastmod ? { ...item, lastmod: new Date(lastmod) } : item;
      },
    }),
  ],
});
