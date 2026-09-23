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
  integrations: [
    sitemap({
      // 운영 도구·인증 콜백은 검색 결과에 나올 이유가 없다(페이지 자체도 noindex).
      filter: (page) => !page.includes('/admin') && !page.includes('/auth'),
      changefreq: 'weekly',
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, '');
        const lastmod = storyLastmod.get(path);
        // 글이 아닌 페이지는 lastmod를 비워 둔다 — 모르는 날짜를 지어내지 않는다.
        return lastmod ? { ...item, lastmod: new Date(lastmod) } : item;
      },
      /*
        /meetups는 이 사이트의 페이지가 아니라 백엔드가 그린다(render.yaml의 rewrite).
        Astro는 자기 페이지만 알아서 사이트맵에 안 넣어주는데, 검색에 걸리라고 만든
        페이지가 사이트맵에 없으면 만든 뜻이 절반은 없어진다.
      */
      customPages: ['https://prologue.day/meetups'],
    }),
  ],
});
