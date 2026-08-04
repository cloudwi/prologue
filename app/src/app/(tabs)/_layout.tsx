import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="mails">
        <NativeTabs.Trigger.Icon sf="envelope.fill" drawable="ic_dialog_email" />
        <NativeTabs.Trigger.Label>편지함</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover">
        <NativeTabs.Trigger.Icon sf="sparkles" drawable="ic_menu_search" />
        <NativeTabs.Trigger.Label>발견</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my">
        <NativeTabs.Trigger.Icon sf="person.fill" drawable="ic_menu_myplaces" />
        <NativeTabs.Trigger.Label>MY</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
