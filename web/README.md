# 프롤로그 웹 (랜딩 + 블로그)

Astro 기반 정적 사이트. 랜딩 페이지와 마크다운 블로그("스토리")로 구성됩니다.

## 개발

```bash
cd web
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 에 정적 파일 생성
```

## 블로그 글 쓰는 법

`src/content/blog/` 아래에 마크다운 파일을 추가하면 끝. 파일명이 URL 슬러그가 됩니다 (`/story/<파일명>`).

```markdown
---
title: 글 제목
description: 목록·SNS 공유에 노출되는 한 줄 요약
pubDate: 2026-07-18
---

본문은 마크다운으로 자유롭게.
```

## 검색 최적화(SEO)·스토어 링크

- 스토어 링크·앱 ID·태그라인은 `src/lib/site.ts` 한 곳에서 관리한다. 랜딩·푸터·`/download`·구조화 데이터가 모두 이 값을 읽는다.
- `/download` — 폰이면 기기에 맞는 스토어로 자동 이동, 데스크톱이면 배지 둘을 보여주는 공유용 단일 링크.
- 사이트맵은 `@astrojs/sitemap`이 빌드 때 `sitemap-index.xml`로 만들고 `public/robots.txt`가 가리킨다(`/admin`, `/auth` 제외).
- 구조화 데이터(JSON-LD): 전 페이지 Organization·WebSite, 랜딩 MobileApplication·FAQPage, 글 BlogPosting·BreadcrumbList.
- 랜딩의 "이용 방법" 스크린샷은 `store/appstore-*.png`를 줄인 `public/screens/*.webp` — 스토어 스크린샷을 갈아끼우면 여기도 함께 갱신.
- 배포 후 한 번 해야 하는 것: Google Search Console·네이버 서치어드바이저에 prologue.day 등록 후 사이트맵 제출.

## 배포

루트의 `render.yaml`에 Render 정적 사이트로 등록되어 있어 main 푸시 시 자동 배포됩니다.
도메인 구입 후 `astro.config.mjs`의 `site` 값을 교체하세요.
