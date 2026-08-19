// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://prologue.day',
  integrations: [
    sitemap({
      // 운영 도구·인증 콜백은 검색 결과에 나올 이유가 없다(페이지 자체도 noindex).
      filter: (page) => !page.includes('/admin') && !page.includes('/auth'),
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
});
