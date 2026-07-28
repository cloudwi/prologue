# 디자인 원본

앱·웹에 들어가는 자체 제작 이미지의 **원본**입니다. 원본을 교체한 뒤에는 아래 절차로 파생 파일을 다시 만드세요.

## 브랜드 마크

- 원본: `design/brand/brand-mark.png` (투명 배경, 1637×1171, 가로세로비 1.4:1)
- 하트 씰로 봉한 편지 봉투. 손그림 외곽선(`#2B2723`) + 크림 면 채색으로 아바타와 같은 조형 언어를 씁니다.

파생 파일과 규격:

| 파일 | 규격 | 비고 |
| --- | --- | --- |
| `app/assets/images/brand-mark.png` (@2x, @3x) | 89×64 / 178×128 / 267×192 | 진입 화면 로고 |
| `app/assets/images/icon.png` | 1024×1024 | 크림 배경, 마크 폭 62% |
| `app/assets/images/android-icon-foreground.png` | 1024×1024 | 투명, 마크 폭 55% (안전영역 안쪽) |
| `app/assets/images/android-icon-monochrome.png` | 1024×1024 | 크림 면을 뺀 잉크 선·하트만 남긴 라인아트 |
| `app/assets/images/splash.png` / `splash-dark.png` | 401×369 | 마크(높이 84) + 워드마크. 워드마크는 별도 원본 없이 이 파일이 원본 |
| `web/public/brand-mark.png` | 213×152 | 헤더 39×28, 히어로 106×76으로 표시 |

> ⚠️ 마크는 가로형(1.4:1)입니다. 정사각형으로 넣으면 위아래 여백이 생겨 작아 보입니다.
> 표시 크기를 바꿀 때 `app/src/app/index.tsx`의 `styles.logo`와
> `web/src/styles/global.css`의 `.header-brand img`, `.hero .brand-mark`를 함께 맞추세요.

## 파비콘

`app/assets/images/favicon.png`, `web/public/favicon.png` (48×48)는 마크를 그대로 씁니다.
봉투 실루엣과 붉은 하트가 16px에서도 구분되는 것을 확인했습니다.
마크를 교체할 때는 16·24·32px로 줄여 형태가 남는지 반드시 확인하세요.

## 아바타

- 원본: `app/assets/images/avatars/avatar-1~4.png` (512×512)
- 웹은 같은 이미지를 256×256으로 줄여 `web/public/avatars/1~3.png`로 사용합니다.

## 팔레트

크림 `#FAF6F0` · 잉크 `#2B2723` · 테라코타 `#D9694C` · 보조 살몬 `#E8A188`
다크 배경 `#1A1613` · 다크 테라코타 `#E07A5C`

## 제미나이로 마크를 새로 만들 때

투명 배경을 요청해도 체커보드가 RGB에 그려진 **가짜 투명**으로 오는 경우가 있습니다.
흰 배경으로 받은 뒤 제거하는 편이 깨끗합니다. 이 마크는 외곽선이 닫혀 있어서,
테두리에서 밝은 영역을 flood fill 해 바깥만 지우는 방식으로 잘라냈습니다
(색 기준으로 자르면 흰 배경과 크림 봉투가 구분되지 않습니다).
