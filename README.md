# 프롤로그 (Prologue)

> 하루 한 문답, 서로를 알아가는 블라인드 소개팅 앱

사진 없이 매일 질문 1개에 답하면 상대의 답변이 열리는 **가치관 기반 소개팅 서비스**입니다. (Give & Take · 1:1 매칭)

## 구조 (모노레포)

| 디렉터리 | 설명 | 스택 |
|---|---|---|
| [`app/`](./app) | 모바일 앱 | Expo (React Native) · TypeScript · expo-router |
| [`backend/`](./backend) | API 서버 | Spring Boot · Kotlin · JPA |

## 시작하기

### app
```bash
cd app
npm install
npx expo start
```

### backend
```bash
cd backend
./gradlew bootRun
```
