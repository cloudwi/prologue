# 디자인 원본 (SVG)

앱에 들어가는 자체 제작 이미지의 **원본 SVG**입니다. 수정 후 아래 명령으로 PNG 재생성하세요.

> ⚠️ 반드시 `rsvg-convert` 사용 (`brew install librsvg`).
> ImageMagick 내장 SVG 렌더러는 stroke(선)를 누락시킵니다.

```bash
# 아바타 (1~8)
rsvg-convert -w 240 -h 240 design/avatars/1.svg -o app/assets/images/avatars/avatar-1.png

# 브랜드 마크 (말풍선+하트)
rsvg-convert -w 84  -h 84  design/brand/brand-mark.svg -o app/assets/images/brand-mark.png
rsvg-convert -w 168 -h 168 design/brand/brand-mark.svg -o app/assets/images/brand-mark@2x.png
rsvg-convert -w 252 -h 252 design/brand/brand-mark.svg -o app/assets/images/brand-mark@3x.png
```

- 아바타: 잉크(#2B2723) 라인아트 + 파스텔 배경. 1깐머리 2숏컷 3덮은머리 4단발 5웨이브롱 6스트레이트롱 7번(묶음) 8뱅단발
- 팔레트: 크림 #FAF6F0 · 잉크 #2B2723 · 테라코타 #D9694C
