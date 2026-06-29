import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type SocialButtonProps = {
  label: string;
  /** 좌측 아이콘 자리에 표시할 간단한 글리프(로고 대체). */
  iconText: string;
  backgroundColor: string;
  textColor: string;
  iconColor?: string;
  iconBackground?: string;
  borderColor?: string;
  loading?: boolean;
  onPress: () => void;
};

export function SocialButton({
  label,
  iconText,
  backgroundColor,
  textColor,
  iconColor,
  iconBackground,
  borderColor,
  loading = false,
  onPress,
}: SocialButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: borderColor ?? 'transparent',
          borderWidth: borderColor ? 1.5 : 0,
          opacity: pressed || loading ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.iconSlot}>
        <View style={[styles.iconBubble, { backgroundColor: iconBackground ?? 'transparent' }]}>
          <Text style={[styles.iconText, { color: iconColor ?? textColor }]}>{iconText}</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    position: 'absolute',
    left: 18,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  iconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 15,
    fontWeight: '800',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
