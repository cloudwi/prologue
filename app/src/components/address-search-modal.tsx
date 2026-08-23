import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import type { ThemeColors } from '@/constants/theme';

/**
 * 주소 검색 — 다음(카카오) 우편번호 서비스를 앱 안의 WebView로 연다.
 * 배송지 검색과 같은 UX. 키·비용 없이 쓰는 공개 위젯이고, 선택 결과만
 * postMessage로 받아 앱에 돌려준다. 외부 브라우저 왕복이 없다.
 */

export type PickedAddress = { road: string; building: string };

/** 위젯을 심은 최소 HTML — 페이지를 따로 호스팅하지 않고 앱이 직접 그린다. */
const POSTCODE_HTML = `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>html,body,#p{margin:0;height:100%;}</style>
</head><body>
<div id="p"></div>
<script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
<script>
new daum.Postcode({
  oncomplete: function (data) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      road: data.roadAddress || data.jibunAddress || '',
      building: data.buildingName || ''
    }));
  },
  width: '100%',
  height: '100%'
}).embed(document.getElementById('p'));
</script>
</body></html>`;

export function AddressSearchModal({
  visible,
  onPicked,
  onClose,
  c,
}: {
  visible: boolean;
  onPicked: (address: PickedAddress) => void;
  onClose: () => void;
  c: ThemeColors;
}) {
  const source = useMemo(() => ({ html: POSTCODE_HTML, baseUrl: 'https://prologue.day' }), []);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: c.text }]}>주소 검색</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.close, { color: c.textSecondary }]}>닫기</Text>
          </Pressable>
        </View>
        <WebView
          source={source}
          onMessage={(e) => {
            try {
              const data = JSON.parse(e.nativeEvent.data) as PickedAddress;
              if (data.road) onPicked(data);
            } catch {
              // 위젯 외 메시지는 무시
            }
          }}
          style={styles.web}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  close: { fontSize: 15.5 },
  web: { flex: 1 },
});
