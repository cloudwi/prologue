import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  return (
    <Tabs
      initialRouteName="chats"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        tabBarStyle: { backgroundColor: c.background, borderTopColor: c.border },
      }}
    >
      <Tabs.Screen name="chats" options={{ title: '대화' }} />
      <Tabs.Screen name="discover" options={{ title: '발견' }} />
      <Tabs.Screen name="my" options={{ title: 'MY' }} />
    </Tabs>
  );
}
