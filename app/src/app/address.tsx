import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { deliverAddress } from '@/lib/address-search';

/**
 * 주소 딥링크 수신 — prologue://address?road=...&building=...
 * 브라우저의 주소 검색 페이지가 이 경로로 앱을 다시 연다.
 * 결과를 구독자(모임 열기 폼)에게 넘기고, 열려 있던 폼으로 즉시 돌아간다.
 */
export default function AddressReceiver() {
  const router = useRouter();
  const { road, building } = useLocalSearchParams<{ road?: string; building?: string }>();

  useEffect(() => {
    if (road) deliverAddress({ road: String(road), building: building ? String(building) : '' });
    // 폼이 스택에 살아 있으면 그대로 복귀, 콜드 스타트면 모임 탭으로.
    if (router.canGoBack()) router.back();
    else router.replace('/meetups');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <View />;
}
