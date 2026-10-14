# 스토어 이미지와 소개 문구 · 2026-10-14

앞 두 장에서 가벼운 OX와 복수 선택을 보여주고, 상대 소개·편지·모임을 각각 한 장에 담는다.
제목과 보조 글씨를 키우고 편지의 중복 설명을 줄였다. 모임 상세는 현재 앱의 정보 요약 카드로 재현한다.

이미지는 앱 컴포넌트의 글꼴 크기·선택지·저장 버튼·모임 정보 구조를 옮긴 예시 화면이다.
인물·문답·편지·모임은 가상이며 각 이미지에 표시했다. 실제 사용자 사진이나 답변을 사용하지 않는다.
프로필 이미지는 기존 `design/photos/`와 앱의 `demo-profiles/` 생성 이미지를 재사용한다.

## 파일

- `build.mjs`: `node store/v4/build.mjs`로 HTML 15개와 manifest를 준비한다. 앱·웹 파일은 수정하지 않는다.
- `styles.css`: v3의 프레임·기본 화면 CSS를 공유하고 현재 앱 구조에 맞춰 조정한다.
- `out/android`: 1080×1920, Google Play 휴대전화 스크린샷 5장.
- `out/ios`: 1320×2868, App Store 6.9인치 스크린샷 5장.
- `out/ios65`: 1284×2778, App Store 6.5인치 스크린샷 5장.
- `description-ko.txt`, `short-description-ko.txt`, `promotional-text-ko.txt`: 실제 반영할 한국어 문구.

## 이미지 생성과 확인

HTML은 로컬 정적 서버에서 열고 cua_repl의 Chrome viewport를 해당 판형으로 지정한다.
각 페이지의 제목·본문·사진 로딩과 헤더/기기 겹침을 확인한 뒤 문서화된 screenshot API로 저장한다.
뷰포트는 작업 후 원래대로 돌린다. 캡처 결과의 파일 형식이 JPEG이면 크기를 바꾸지 않고 PNG로 변환한다.
한글·선택지·사진·중요 버튼과 실제 PNG 규격을 모두 확인한 이미지로만 스토어를 갱신한다.

## 등록

Google Play는 기존 제목과 다른 설정을 유지하고 한국어 짧은/상세 소개 및 이미지 5장만 갱신한다.
새 edit에서 파일 SHA256과 문구를 확인한 뒤 commit하고 별도 edit에서 다시 읽어 검증한다.
Google Play 공개 페이지에서 새 이미지와 짧은/상세 소개의 반영을 확인했다.
App Store는 iOS 1.3.2(빌드 34), 새 이미지 10장, 새 상세 소개를 함께 심사에 제출했다.
현재 상태는 `WAITING_FOR_REVIEW`이며 `AFTER_APPROVAL`로 승인 후 자동 출시한다.
짧은 홍보 문구는 현재 1.3.1 한국어 페이지에도 반영했다. 먼저 제출한 스크린샷 단독
Product Page Optimization 심사는 전체 앱 버전 제출로 통합하면서 취소했다.

## iOS 빌드

EAS 무료 클라우드 빌드 한도로 인해 Apple 공식 Xcode 26.6(17F113)으로 로컬 빌드했다.
앱과 결제 라이브러리에 맞춰 production 이미지도 `macos-tahoe-26.5-xcode-26.6`으로 고정했다.
전역 Xcode 선택을 바꾸지 않고 `DEVELOPER_DIR`로 해당 Xcode를 지정했다.
최신 macOS의 Command Line Tools SDK와 섞이지 않도록 설치 단계의 `SDKROOT`도
해당 Xcode의 MacOSX26.5 SDK로 지정한다.

`app/scripts/patch-expo-jsi.cjs`는 Swift 6.3이 거부하는 조건부 C 콜백 변환을 분기별 직접 변환으로
바꾸며, 읽기 전용 객체의 nil setter를 보존한다. 알려진 원문과 다르면 설치를 중단한다.
기존 Sentry 조직 토큰이 유효하지 않아 소스맵 업로드 실패가 빌드를 막지 않도록
`SENTRY_ALLOW_FAILURE=true`를 사용한다. 앱의 오류 수집은 끄지 않는다.
기존 Expo SDK 56의 Hermes 메모리 회귀 및 권장 패치 버전 경고는 후속 정비 항목이다.

Apple 파일 검증과 업로드, 빌드 `VALID`, 심사용 계정 로그인, CI 통과를 확인했다.
시뮬레이터 Release 빌드와 실행도 확인했으나 실제 화면 확인은 Mac 잠금으로 제한됐다.
실제 등록·심사·공개 상태는 로컬 release/ops/store-update-2026-10-14/ 기록으로 구분한다.
