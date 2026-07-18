# TestFlight 업로드 가이드 (Expo EAS 사용)

우리 앱 프로젝트는 Expo 기반으로 구성되어 있으므로, **EAS(Expo Application Services)**를 이용해 가장 쉽고 빠르게 TestFlight에 빌드 파일을 업로드할 수 있습니다.

## 1. 사전 준비 사항
* **Apple 개발자 계정** ($99/년 유료 계정 필요)
* **Expo 계정**
* macOS 개발 환경

---

## 2. 업로드 단계

### 단계 1: EAS CLI 설치 및 로그인
터미널에서 Expo EAS 도구를 설치하고 로그인합니다.
```bash
npm install -g eas-cli
eas login
```

### 단계 2: EAS 프로젝트 설정 (최초 1회)
프로젝트 루트 디렉토리에서 EAS 설정을 초기화합니다.
```bash
eas build:configure
```
* 플랫폼 선택 창이 뜨면 **iOS** (또는 All)를 선택합니다. 이 과정에서 프로젝트 루트에 `eas.json` 파일이 생성됩니다.

### 단계 3: TestFlight 빌드 및 자동 제출 실행
아래 명령어를 실행하면 Expo 서버에서 클라우드 빌드를 진행한 후, 완료되면 자동으로 Apple TestFlight로 앱을 업로드(Submit)합니다.
```bash
eas build --platform ios --auto-submit
```

### 단계 4: Apple ID 연동 및 인증 진행
명령어를 실행하면 터미널 창에 다음과 같은 요청이 순서대로 나타납니다. 지시에 따라 진행해 주세요.
1. **Apple ID와 비밀번호 입력**: Expo가 Apple Developer 포털에 접속하여 배포용 인증서(Certificate)와 프로비저닝 프로파일(Provisioning Profile)을 자동으로 생성하기 위해 필요합니다. (이중 인증 번호 입력 필요)
2. **Bundle Identifier 확인 및 생성 동의**
3. **Apple Push Notification 키 생성 동의**

---

## 3. 업로드 완료 확인
1. 빌드 및 업로드가 완료되면 [App Store Connect](https://appstoreconnect.apple.com/) 사이트에 접속합니다.
2. **내 앱** -> **TestFlight** 탭으로 이동합니다.
3. Apple 측의 자체 처리(Processing)가 몇 분에서 수십 분 정도 소요된 후, 테스터들에게 배포할 수 있는 상태가 됩니다.
