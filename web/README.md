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

## 배포

루트의 `render.yaml`에 Render 정적 사이트로 등록되어 있어 main 푸시 시 자동 배포됩니다.
도메인 구입 후 `astro.config.mjs`의 `site` 값을 교체하세요.
