# 웹·스토어 프로필 사진

- 요청: 더 자연스럽고 예쁜 20대 한국인 여성 사진으로 웹 이미지를 교체.
- 제작일: 2026-09-07.
- 제작 방식: 내장 `image_gen` 도구. 실제 인물이나 회원 사진을 참조하지 않은 가상 인물.
- 원본: `cafe-portrait-2026-09.png`.
- 웹 배포본: `../../web/public/photos/cafe-portrait-2026-09.webp` (폭 800px, WebP 품질 85).
- 사용처: `ProfilePreview.astro`를 통한 웹 첫 화면, 문답 남기기, 오늘의 상대 안내.
- 얼굴과 사진 내용은 생성 결과 그대로 유지하고, 웹 배포본은 크기와 파일 형식만 최적화했다.
- 앱 계정 사진은 변경하지 않는다.

## 현재 사용 사진 — 일상 셀카

2026-09-07 사용자 요청에 따라 `cafe-selfie-2026-09.png`로 교체했다. 웹과 각 스토어 스크린샷이 `../../web/public/photos/cafe-selfie-2026-09.webp`를 공유한다. 내장 image_gen 편집 도구로 생성했으며, 최종 프롬프트는 [selfie-prompt-2026-09.md](selfie-prompt-2026-09.md)에 기록했다. 아래는 이전 카페 인물사진의 기록이다.

## 최종 생성 프롬프트

```text
Use case: photorealistic-natural
Asset type: a standalone portrait photograph for a Korean dating app's website demonstration profile, NOT a screenshot or UI.
Primary request: A beautiful, approachable Korean adult woman in her late twenties (age 28), looking natural and relaxed rather than like a polished AI fashion model. Entirely fictional person, not based on any real person or celebrity.
Scene/backdrop: a quiet, contemporary neighborhood cafe in Seoul, beside a large window. A neutral linen curtain, softly out-of-focus wooden furniture, and gentle daylight. She has been writing in a small notebook on the table and looks up toward the friend taking the photograph with a warm, subtle, spontaneous smile.
Subject: One adult Korean woman, softly flowing dark brown shoulder-length hair with a few natural flyaways, minimal everyday makeup, healthy natural skin texture and normal facial asymmetry. Simple ivory cotton blouse or lightweight cardigan, tasteful casual everyday outfit. Attractive and graceful but believable as an ordinary candid portrait. Both hands relaxed near the open notebook on the table, anatomically accurate fingers.
Composition/framing: Vertical 4:5 photograph, medium portrait from mid torso upward with her face fully visible, centered slightly above the middle. Enough breathing room around hair and shoulders to crop into a mobile profile card. Camera at her eye level, realistic 50mm lens perspective, gentle background separation, natural proportions.
Lighting/mood: soft diffused morning window light, warm friendly atmosphere, balanced neutral colors, realistic editorial photo, slight fine film grain. Avoid intense orange color grading.
Constraints: photograph only, no interface, no text or letters, no logo, no watermark, no collage, no beauty filter, no waxy airbrushed skin, no doll-like face, no exaggerated smile or makeup, no glamour or sexualized pose, no school uniform, no other people.
```
