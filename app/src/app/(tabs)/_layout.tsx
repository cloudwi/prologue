import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Easing, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { enableNotifications } from '@/lib/notifications';

/**
 * 하단 탭.
 *
 * 네이티브 탭(NativeTabs) 대신 직접 그린다. 네이티브 탭은 안드로이드에서 시스템 드로어블만
 * 쓸 수 있어 아이콘이 제각각이었고(봉투는 solid, 돋보기는 outline, MY는 깃발 든 사람),
 * 선택 표시도 Material 기본 파란 알약이라 테라코타 하나로 온기를 내는 팔레트와 어긋났다.
 *
 * 아이콘은 한 세트(Ionicons)에서만 고르고, 선택되면 outline이 채워진다 —
 * 색만 바뀌는 것보다 눈에 띄면서도 요란하지 않다.
 */
type TabIcon = { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap };

const ICONS: Record<string, TabIcon> = {
  mails: { outline: 'mail-outline', filled: 'mail' },
  discover: { outline: 'sparkles-outline', filled: 'sparkles' },
  my: { outline: 'person-outline', filled: 'person' },
};

export default function TabsLayout() {
  const c = useTheme();

  // 권한은 앱의 본 화면에 도달했을 때 묻는다. 가입 첫 화면에서 물으면
  // 무엇에 쓰는 알림인지 모른 채 거절당하고, 한 번 거절되면 되돌리기 어렵다.
  useEffect(() => {
    void enableNotifications();
  }, []);
  // 제스처 바가 있는 기기에서는 그만큼을 바닥에 더 둬야 라벨이 눌리지 않는다
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        // 기본값은 'none'이라 화면이 툭 바뀐다. 짧은 페이드 하나만 둔다 —
        // 옆으로 미는 전환(shift)은 세 탭을 오갈 때 시선이 따라다녀 산만하다.
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: { duration: 160, easing: Easing.out(Easing.quad) },
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: {
          backgroundColor: c.backgroundElement,
          borderTopColor: c.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: BottomTabInset + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        // 기본 버튼은 경계 없는(borderless) 안드로이드 리플이라 탭바 밖까지 검게 번진다.
        // 앱의 다른 버튼들처럼 눌림을 opacity로만 표현해 톤을 맞춘다.
        // ref는 타입이 맞지 않아 넘기지 않는다 — 탭 버튼에서는 쓰이지 않는다.
        tabBarButton: ({ children, style, ref: _ref, ...rest }) => (
          <Pressable
            {...rest}
            android_ripple={null}
            style={({ pressed }) => [style, { opacity: pressed ? 0.55 : 1 }]}
          >
            {children}
          </Pressable>
        ),
        tabBarIcon: ({ focused, color }) => {
          const icon = ICONS[route.name];
          if (!icon) return null;
          return <Ionicons name={focused ? icon.filled : icon.outline} size={24} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="mails" options={{ title: '편지함' }} />
      <Tabs.Screen name="discover" options={{ title: '발견' }} />
      <Tabs.Screen name="my" options={{ title: 'MY' }} />
    </Tabs>
  );
}
