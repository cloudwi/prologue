# 첫 방문 UI·UX 개선 · 2026-11-06

운영 웹과 호환되는 설치 앱의 production OTA를 반영했다. 기능 소스는 `5dc76c36a0ad32d9b60bac04ac61647f771c828a`다. 기존 마케팅·모임 작업은 커밋에 포함하지 않았다.

## 개선한 흐름

- 앱 시작 화면에 서비스 설명과 예시 문답을 함께 보여준다. 문답 체험·가입·로그인·모임의 우선순위를 정리하고, 작은 화면에서는 스크롤로 모든 행동에 도달한다. 데스크톱은 설명과 행동을 두 열로 나눈다.
- 체험은 내 생각 선택 → 예시 답 읽기의 두 단계로 표시한다. 선택 변경·초기화·재체험을 지원하고, 초기화 시 첫 선택지로 포커스를 돌린다. 예시 프로필을 보고 돌아와도 선택이 유지된다.
- 비회원 발견 안내에서도 문답 체험으로 들어간다. 모임 전용 가입 경로는 유지하며, 실제 소개 상대가 없으면 기다릴 수 있음을 안내한다.
- 로그인·동의·비회원 안내의 데스크톱 폭을 제한하고 글꼴·버튼·라운드를 기존 토큰에 맞췄다. 동의 체크 상태, 비활성·처리 중 버튼, 오류 안내를 보조기기에 제공한다. 선택형 문답은 웹에서 Space·방향키·Home/End와 ARIA 선택 상태를 지원한다.
- 웹은 첫 화면의 반복 다운로드 배지와 장식용 번호·강조색을 줄여 문답 체험을 앞당겼다. 공통 탐색에 문답 체험을 추가했다. 예시는 실제 회원과 구분하며 선택을 저장·전송하지 않는다.

## 최종 검증

| 검사 | 결과 |
| --- | --- |
| 앱 TypeScript / 전체 소스 ESLint | 통과 |
| 앱 Jest | 26개 suite, 189개 테스트 통과 |
| 웹 Vitest | 5개 파일, 48개 테스트 통과 |
| 웹 Astro 정적 빌드 | 통과 |
| Expo iOS·Android·웹 번들 export | 통과, 새 스토어 바이너리 빌드와는 구분 |
| 원격 CI | 앱·웹·백엔드(Postgres 통합 포함) 모두 통과 |
| `git diff --check` | 통과 |
| 로컬 브라우저 | 앱 320·390·768·1280px, 웹 320·390·1280px 확인 |
| 운영 브라우저 | 웹 390·1280px, 선택 변경·초기화·키보드·메뉴 Escape·다운로드·뒤로 가기 확인 |

앱에서 예시 프로필 열기·복귀, 가입 동의 진입·취소, 약관 열기·복귀, 로그인 입력에 따른 버튼 활성화, 비회원 모임 → 발견 → 체험 → 복귀도 확인했다. 운영 브라우저 검증으로 발생한 방문·체험·다운로드 이벤트는 QA 활동이다.

## 운영 반영

- [기능 커밋](https://github.com/cloudwi/prologue/commit/5dc76c36a0ad32d9b60bac04ac61647f771c828a), [CI](https://github.com/cloudwi/prologue/actions/runs/42170604205), [CD](https://github.com/cloudwi/prologue/actions/runs/42170941759).
- [운영 웹](https://prologue.day/)은 Render 자동 배포 성공을 확인했다. GitHub deployment `7593415147`이 기능 SHA와 일치하며 상태는 `success`다. 공개 HTML의 새 제목·초기화 컨트롤과 실제 상호작용을 확인했다.
- CD workflow는 성공 상태지만 기존 deploy hook secret이 없어 두 요청 단계를 건너뛴다. 이번 웹 반영 근거는 Render 자동 배포와 운영 화면이다. 백엔드 소스·DB는 변경하지 않았고 별도 백엔드 배포는 없었다. 공개 health `UP`, 앱 설정과 웹은 HTTP 200이다.
- 기존 production 채널에 아래 OTA를 발행한 뒤 인증된 Expo API에서 플랫폼·런타임·소스 SHA를 다시 읽어 확인했다. 발행 중 임시 변경한 앱 버전은 원래 `1.3.2`로 복원했다. 네이티브 코드·의존성·권한 설정 변경은 없다.

| 런타임 | 플랫폼 | OTA 그룹 |
| --- | --- | --- |
| 1.3.1 | Android·iOS | `b0811e14-d5ce-43bb-ad54-efaecf9aea0b` |
| 1.3.2 | iOS | `20a8bf5e-7d88-479a-9ec6-8754ea0c165c` |

공개 Expo manifest GET은 `u.expo.dev/2ea86b1c-287c-4acd-96a0-a5768eba7752`에서 Cloudflare HTTP 403 / error 1010(`browser_signature_banned`)으로 차단됐다. SDK 소스로 확인한 요청 헤더를 적용한 한 번의 확인도 차단돼 추가 요청이나 우회는 하지 않았다. 따라서 **OTA 발행·원격 메타데이터 확인은 완료했지만, 공개 manifest·번들 다운로드 무결성과 실제 기기의 OTA 적용은 검증하지 못했다.**

복구 기준은 기능 소스 이전 `01d9230d2790819face6b254a4cc3905c473f32e`, 1.3.1의 기존 OTA 그룹 `c81c8eb4-96c3-4255-a494-322e03903d50`, 1.3.2의 기존 그룹 `8d0fb009-15a4-4bd7-bde7-579dae99fa39`다. 복구 동작은 실행하지 않았다.

## 스토어 스크린샷 검토

[공개 App Store](https://apps.apple.com/kr/app/id6803755105)와 [Google Play](https://play.google.com/store/apps/details?id=day.prologue.app&hl=ko)의 현재 이미지 5장을 실제로 확인했다. `store/v4/`의 OX·선택형·상대·편지·모임 구성과 일치하며, 이번에 개편한 첫 방문·로그인·가입 전 체험 화면은 포함돼 있지 않다. 해당 5장의 화면 구조는 이번 변경으로 바뀌지 않아 전면 교체가 필수인 상태는 아니다.

다음 스토어 자료 갱신 때 **가입 없이 문답 체험을 보여주는 한 장을 추가**하는 것을 권장한다. 신규 화면의 로컬 검증 캡처를 보관했으며, 스토어용 합성 이미지나 제출용 파일을 새로 만들거나 등록·심사 제출하지 않았다.

## 변경 파일과 증거

- 앱: `src/app/index.tsx`, `preview.tsx`, `consent.tsx`, `email-auth.tsx`, `(tabs)/discover.tsx`, `src/components/signup-gate.tsx`, `question-choices.tsx`.
- 웹: `src/pages/index.astro`, `src/components/FirstLook.astro`, `src/layouts/Base.astro`, `src/lib/first-look.js`.
- 검증: `app/src/screens/preview.test.tsx`, `auth-entry.test.tsx`, `app/src/components/question-choices.test.tsx`, `web/src/lib/first-look.test.js`.
- 디자인 결정: `design/README.md`.
- 로컬 상세 증거(미커밋): `release/ops/deploy-20261106-uiux/`의 배포 요약·OTA 원격 재조회와 `screenshots/`의 앱·운영 웹·공개 스토어 캡처 7장.

실제 iOS·Android 기기, VoiceOver·TalkBack, 네이티브 키보드, 운영 계정 가입·사진 업로드·매칭·편지 전송은 미실행이다. 이번 변경의 실제 사용자 전환율 개선은 아직 측정하지 않았다.
