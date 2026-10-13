import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Type, type ThemeColors } from '@/constants/theme';

const COLLAPSED_LINES = 6;

/** 글자 수가 아니라 같은 폭·글꼴에서 실제로 잘리는지를 측정한다. */
export function FeedAnswer({ content, c }: { content: string; c: ThemeColors }) {
  const [truncated, setTruncated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textStyle = [styles.text, { color: c.text }];
  return <View style={styles.root}>
    <Text numberOfLines={expanded ? undefined : COLLAPSED_LINES} style={textStyle}>{content}</Text>
    <Text
      testID="feed-answer-measure"
      aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      pointerEvents="none" style={[textStyle, styles.measure]}
      onTextLayout={(e) => { if (Platform.OS !== 'web') setTruncated(e.nativeEvent.lines.length > COLLAPSED_LINES); }}
      onLayout={(e) => { if (Platform.OS === 'web') setTruncated(e.nativeEvent.layout.height > Type.read.lineHeight * COLLAPSED_LINES + 1); }}
    >{content}</Text>
    {truncated && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} hitSlop={6} style={styles.more}>
      <Text style={[Type.label, { color: c.primaryStrong }]}>{expanded ? '접기' : '더보기'}</Text>
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  root: { marginTop: 8 },
  text: { ...Type.read, includeFontPadding: false },
  measure: { position: 'absolute', top: 0, width: '100%', opacity: 0 },
  more: { marginTop: 8, alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
});
