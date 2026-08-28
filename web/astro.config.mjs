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
      /*
        /meetups는 이 사이트의 페이지가 아니라 백엔드가 그린다(render.yaml의 rewrite).
        Astro는 자기 페이지만 알아서 사이트맵에 안 넣어주는데, 검색에 걸리라고 만든
        페이지가 사이트맵에 없으면 만든 뜻이 절반은 없어진다.
      */
      customPages: ['https://prologue.day/meetups'],
    }),
  ],
});
