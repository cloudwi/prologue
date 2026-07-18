import { StyleSheet, Text, TextInput, View, type ColorValue, type TextInputProps } from 'react-native';

/**
 * 네이티브 placeholder 대신 Text 오버레이를 그리는 TextInput.
 *
 * iOS 26에서 한글 placeholder의 자간이 비정상적으로 벌어지는 문제 우회 —
 * iOS는 placeholder에 스타일(fontFamily·letterSpacing)을 적용하지 않아
 * 스타일로는 고칠 수 없다(react-native#19002, #42589). 값이 비어 있을 때
 * 일반 Text를 입력창 위에 겹쳐 그려 렌더링을 직접 통제한다.
 */
export function PlaceholderInput({
  placeholder,
  placeholderTextColor,
  value,
  style,
  ...rest
}: TextInputProps & { placeholderTextColor?: ColorValue }) {
  const flat = StyleSheet.flatten(style) ?? {};
  const showOverlay = !value && !!placeholder;

  return (
    <View>
      <TextInput value={value} style={style} {...rest} />
      {showOverlay && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              justifyContent: rest.multiline ? 'flex-start' : 'center',
              paddingHorizontal: flat.paddingHorizontal ?? flat.padding ?? 0,
              paddingTop: rest.multiline ? (flat.paddingTop ?? flat.padding ?? 0) : 0,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={{ fontSize: flat.fontSize ?? 16, lineHeight: flat.lineHeight, color: placeholderTextColor }}
          >
            {placeholder}
          </Text>
        </View>
      )}
    </View>
  );
}
