# 스테이징 — 배포 전에 진짜로 써보는 자리

운영에 나가기 전 같은 코드를 **다른 데이터**로 돌려보는 곳입니다.
서버는 Render 서비스 하나, 앱은 "스테이징을 보는 빌드" 하나면 끝입니다.

## 1. 서버 (한 번만)

1. **Supabase 프로젝트를 새로 만듭니다.** 무료로 두 개까지 됩니다.
   ⚠️ **운영 DB를 재사용하지 마세요.** 마이그레이션 리허설이 곧 운영 사고가 됩니다 —
   스테이징의 존재 이유가 V49 같은 변경을 먼저 돌려보는 것입니다.
2. Render에서 Blueprint를 다시 동기화하면 `render.yaml`의 `prologue-backend-staging`이 생깁니다.
3. 그 서비스의 환경변수에 **새 Supabase**의 `SPRING_DATASOURCE_URL` / `USERNAME` / `PASSWORD`를 넣습니다.
4. `main`에 푸시할 때마다 자동 배포됩니다 — 스테이징은 늘 최신이어야 먼저 깨져 줍니다.

무료 티어라 안 쓰면 잠듭니다. 첫 요청이 수십 초 걸리는 건 정상입니다.

## 2. 앱 (한 번만)

```bash
cd app
eas build -p android --profile preview   # iOS는 -p ios
```

`eas.json`의 `preview` 프로파일이 `EXPO_PUBLIC_API_URL`을 스테이징으로 넘겨 굽습니다.
운영 앱과 **다른 앱으로 깔려** 폰에 나란히 둘 수 있습니다.

## 3. 그다음부터 (매번)

```bash
cd app
eas update --branch preview --environment preview -m "무엇을 바꿨는지"
```

몇 분이면 그 폰에 들어옵니다. **네이티브 변경이 없는 한 재빌드는 필요 없습니다.**
확인이 끝나면 운영으로 승격합니다:

```bash
eas update --branch production --environment production -m "..."
```

## 다시 빌드해야 하는 때

OTA는 JS만 실어 나릅니다. 아래는 **새 빌드**가 필요합니다.

- 네이티브 모듈을 새로 넣었을 때 (예: `expo-haptics` — 2026-08-25 추가, 지금 스토어 빌드엔 없어 진동만 안 울립니다)
- 앱 아이콘·스플래시 이미지처럼 네이티브 리소스를 바꿨을 때 (안드로이드 아이콘 48% 조정 — 2026-08-25)
- `app.json`의 플러그인·권한·버전을 바꿨을 때

`runtimeVersion`이 `appVersion` 정책이라, **앱 버전을 올리면 이전 빌드는 새 OTA를 받지 못합니다.**
버전을 올릴 때는 스토어 배포와 짝을 맞추세요.
