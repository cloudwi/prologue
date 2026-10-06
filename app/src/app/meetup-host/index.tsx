import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SubScreen } from '@/components/sub-screen';
import { ScreenLoadError } from '@/components/screen-load-error';
import { Radius, Type } from '@/constants/theme';
import { useHostMeetups } from '@/hooks/use-host-meetups';
import { useTheme } from '@/hooks/use-theme';
import { feeValue, hostingStatus } from '@/lib/meetups';
import { koreanMeetupWhen } from '@/lib/meetup-format';

export default function HostedMeetups() {
  const c = useTheme();
  const router = useRouter();
  const hosts = useHostMeetups();
  if (hosts.isError || hosts.session.error) return <ScreenLoadError title="내 모임을 불러오지 못했어요" onRetry={() => { hosts.session.retry(); void hosts.refetch(); }} />;
  const loading = hosts.session.loading || (hosts.session.signedIn && hosts.isPending);
  return <SubScreen title="내가 여는 모임" c={c} onSave={!hosts.session.loading && hosts.session.signedIn ? () => router.push('/meetup-host/edit') : undefined} saveLabel="만들기">
    {loading ? <ActivityIndicator /> : !hosts.session.signedIn ? <View style={styles.content}>
      <Text style={[Type.body, { color: c.text }]}>모임을 관리하려면 로그인해주세요.</Text>
      <Pressable onPress={() => router.replace('/')}><Text style={[Type.button, { color: c.primaryStrong }]}>로그인하기</Text></Pressable>
    </View> : <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={hosts.isRefetching} onRefresh={() => void hosts.refetch()} />}>
      {hosts.data?.meetups.length === 0 && <Text style={[Type.body, { color: c.textSecondary }]}>첫 모임을 열어볼까요? 필요한 정보 몇 가지만 적으면 돼요.</Text>}
      {hosts.data?.meetups.map((m) => <Pressable accessibilityRole="button" key={m.meetupId} onPress={() => router.push(`/meetup-host/${m.meetupId}`)} style={[styles.card, { backgroundColor: c.backgroundElement }]}>
        <Text style={[Type.caption, { color: c.textSecondary }]}>{hostingStatus(m.status)}</Text>
        <Text style={[Type.title, { color: c.text }]}>{m.title}</Text>
        <Text style={[Type.body, { color: c.textSecondary }]}>{koreanMeetupWhen(m)} · {m.place}</Text>
        <Text style={[Type.caption, { color: c.textSecondary }]}>확정 {m.confirmedCount}/{m.capacity}명 · 대기 {m.applications.filter((a) => a.status === 'APPLIED').length}명 · {feeValue(m)}</Text>
        {m.reviewNote ? <Text style={[Type.body, { color: c.text }]}>{m.reviewNote}</Text> : null}
      </Pressable>)}
    </ScrollView>}
  </SubScreen>;
}
const styles = StyleSheet.create({ content: { padding: 20, gap: 16, paddingBottom: 48 }, card: { padding: 20, borderRadius: Radius.lg, gap: 8 } });
