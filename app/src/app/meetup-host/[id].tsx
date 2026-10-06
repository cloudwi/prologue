import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SubScreen } from '@/components/sub-screen';
import { ScreenLoadError } from '@/components/screen-load-error';
import { Radius, Type } from '@/constants/theme';
import { useHostMeetups } from '@/hooks/use-host-meetups';
import { useTheme } from '@/hooks/use-theme';
import { feeValue, hostingStatus, manageApplication, manageMeetup } from '@/lib/meetups';
import { koreanMeetupWhen } from '@/lib/meetup-format';

export default function HostMeetupDetail() {
  const c = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hosts = useHostMeetups();
  const cache = useQueryClient();
  const m = hosts.data?.meetups.find((item) => item.meetupId === id);
  const [busy, setBusy] = useState(false);
  const [openedAt] = useState(() => Date.now());
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try { await action(); await cache.invalidateQueries({ queryKey: ['meetups'] }); }
    catch (e) { Alert.alert('처리하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요.'); }
    finally { setBusy(false); }
  }
  function ask(title: string, message: string, action: () => Promise<void>, destructive = false) {
    Alert.alert(title, message, [{ text: '돌아가기', style: 'cancel' }, { text: '확인', style: destructive ? 'destructive' : 'default', onPress: () => void run(action) }]);
  }
  if (hosts.isError || hosts.session.error) return <ScreenLoadError title="모임을 불러오지 못했어요" onRetry={() => { hosts.session.retry(); void hosts.refetch(); }} />;
  if (hosts.session.loading || (hosts.session.signedIn && hosts.isPending)) return <SubScreen title="모임 관리" c={c}><ActivityIndicator /></SubScreen>;
  if (!m) return <SubScreen title="모임 관리" c={c}><Text style={[styles.content, Type.body, { color: c.text }]}>내가 여는 모임을 찾을 수 없어요.</Text></SubScreen>;
  const ended = m.status === 'DONE' || m.status === 'CANCELED';
  const mayConfirm = m.status === 'OPEN' || m.status === 'CLOSED';
  const button = (label: string, onPress: () => void) => <Pressable accessibilityRole="button" disabled={busy} onPress={onPress} style={[styles.button, { backgroundColor: c.backgroundSelected, opacity: busy ? 0.5 : 1 }]}><Text style={[Type.button, { color: c.text }]}>{label}</Text></Pressable>;
  return <SubScreen title="모임 관리" c={c} onSave={!ended ? () => router.push(`/meetup-host/edit?id=${id}`) : undefined} saveLabel="수정" saveDisabled={busy}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={hosts.isRefetching} onRefresh={() => void hosts.refetch()} />}>
      <Text style={[Type.caption, { color: c.textSecondary }]}>{hostingStatus(m.status)}</Text>
      <Text style={[Type.display, { color: c.text }]}>{m.title}</Text>
      <Text style={[Type.body, { color: c.textSecondary }]}>{koreanMeetupWhen(m)}{'\n'}{m.place} · {feeValue(m)}</Text>
      {m.status === 'PENDING' && <Text style={[Type.body, { color: c.textSecondary }]}>운영자가 확인하면 공개돼요. 신청 기록은 그대로 유지됩니다.</Text>}
      {m.reviewNote ? <Text style={[Type.body, { color: c.text }]}>수정 안내: {m.reviewNote}</Text> : null}
      <View style={styles.row}>
        {['OPEN', 'CLOSED'].includes(m.status) && button('초대장 공유', () => { void Share.share({ message: `${m.title}\nhttps://prologue.day/m/${id}` }).catch(() => Alert.alert('공유하지 못했어요')); })}
        {m.kakaoLink ? button('연락 링크 열기', () => { void Linking.openURL(m.kakaoLink).catch(() => Alert.alert('링크를 열지 못했어요')); }) : null}
      </View>
      <Text style={[Type.title, { color: c.text }]}>참가자 · 확정 {m.confirmedCount}/{m.capacity}명</Text>
      {m.applications.length === 0 && <Text style={[Type.body, { color: c.textSecondary }]}>아직 신청자가 없어요.</Text>}
      {m.applications.map((a) => <View key={a.applicationId} style={[styles.card, { backgroundColor: c.backgroundElement }]}>
        <Text style={[Type.title, { color: c.text }]}>{a.nickname ?? '참가자'}</Text>
        <Text style={[Type.caption, { color: c.textSecondary }]}>{[a.age != null ? `${a.age}세` : null, a.region].filter(Boolean).join(' · ')}</Text>
        <Text style={[Type.body, { color: c.textSecondary }]}>{({ APPLIED: '확정 대기', CONFIRMED: '참석 확정', DECLINED: '참여 거절', CANCELED: '신청 취소' })[a.status]}</Text>
        {!ended && mayConfirm && ['APPLIED', 'CONFIRMED', 'DECLINED'].includes(a.status) && <View style={styles.row}>
          {a.status !== 'CONFIRMED' && button('참석 확정', () => ask(`${a.nickname ?? '참가자'}님을 확정할까요?`, m.fee > 0 || (m.feeFemale ?? 0) > 0 ? '참가비를 직접 확인했다면 확정해주세요. 확정 알림이 전달돼요.' : '참석 확정 알림이 전달돼요.', () => manageApplication(a.applicationId, 'confirm')))}
          {a.status !== 'DECLINED' && button(a.status === 'CONFIRMED' ? '확정 취소' : '참여 거절', () => ask('참여를 거절할까요?', '참가비를 받았다면 환불 안내도 직접 전달해주세요.', () => manageApplication(a.applicationId, 'decline'), true))}
        </View>}
      </View>)}
      {!ended && <>
        <Text style={[Type.title, { color: c.text }]}>모집 관리</Text>
        {m.status === 'OPEN' && button('모집 마감', () => ask('모집을 마감할까요?', '새 신청만 멈추고 기존 참가자 확정은 계속할 수 있어요.', () => manageMeetup(id, 'close')))}
        {m.status === 'CLOSED' && button('다시 모집하기', () => ask('다시 모집할까요?', '모임이 다시 신청을 받아요.', () => manageMeetup(id, 'reopen')))}
        {mayConfirm && new Date(m.meetAt).getTime() <= Math.max(openedAt, hosts.dataUpdatedAt) && m.confirmedCount > 0 && button('개최 완료', () => ask('모임을 마쳤나요?', '완료하면 참가 이력이 유지되고 모임 내용은 수정할 수 없어요. 후기를 쓸 필요는 없어요.', () => manageMeetup(id, 'complete')))}
        {button('모임 취소', () => ask('모임을 취소할까요?', '신청자에게 취소 알림이 전달돼요. 받은 참가비가 있다면 직접 환불해주세요.', () => manageMeetup(id, 'cancel'), true))}
      </>}
      {busy && <ActivityIndicator />}
    </ScrollView>
  </SubScreen>;
}
const styles = StyleSheet.create({ content: { padding: 20, gap: 16, paddingBottom: 48 }, card: { padding: 20, borderRadius: Radius.lg, gap: 8 }, row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, button: { padding: 14, borderRadius: Radius.sm, alignItems: 'center' } });
