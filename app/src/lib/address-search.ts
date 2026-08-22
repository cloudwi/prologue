import { Linking } from 'react-native';

/**
 * 주소 검색 다리 — 다음 우편번호 위젯(prologue.day/address)을 브라우저로 열고,
 * 선택된 주소가 딥링크(prologue://address)로 돌아오면 구독자에게 전한다.
 * WebView 네이티브 모듈 없이(OTA 유지) 배송지 검색식 UX를 만든다.
 */

export type PickedAddress = { road: string; building: string };

let listener: ((address: PickedAddress) => void) | null = null;

/** 폼이 결과를 기다리도록 등록한다. 화면을 떠날 때 null로 해제. */
export function onAddressPicked(cb: ((address: PickedAddress) => void) | null) {
  listener = cb;
}

/** 딥링크 라우트(/address)가 호출한다. */
export function deliverAddress(address: PickedAddress) {
  listener?.(address);
}

/** 검색 페이지 열기. */
export function openAddressSearch() {
  void Linking.openURL('https://prologue.day/address');
}
