/**
 * Expo가 제공하는 전역 타입(이미지·CSS 등 사이드이펙트 import 선언)을 끌어온다.
 *
 * 같은 참조가 `expo-env.d.ts`에도 있지만 그 파일은 Expo CLI가 만들고 **gitignore된다** —
 * 그래서 새로 클론한 곳(CI)에서는 없고, `@/global.css` 사이드이펙트 import가 타입 오류가 났다.
 * 이 파일은 커밋되므로 어디서든 `tsc`가 같은 결과를 낸다.
 */
/// <reference types="expo/types" />
