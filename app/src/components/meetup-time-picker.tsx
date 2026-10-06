import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import { koreanDateParts } from '@/lib/meetup-draft';

export function MeetupTimePicker({ label, value, mode, onChange, c }: {
  label: string; value: string; mode: 'date' | 'time'; onChange: (value: string) => void; c: ThemeColors;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const today = koreanDateParts(new Date().toISOString()).date;
  const initial = new Date(`${mode === 'date' ? value || today : today}T${mode === 'time' ? value || '18:00' : '12:00'}:00+09:00`);
  const read = (date: Date) => koreanDateParts(date.toISOString())[mode === 'date' ? 'date' : 'time'];
  const style = [styles.input, { color: c.text, backgroundColor: c.backgroundElement }];

  if (Platform.OS === 'web') return <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={mode === 'date' ? 'YYYY-MM-DD' : 'HH:mm'} placeholderTextColor={c.textSecondary} style={style} />;

  function choose() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: initial, mode, timeZoneName: 'Asia/Seoul', is24Hour: true,
        onChange: (event, date) => { if (event.type === 'set' && date) onChange(read(date)); } });
    } else { setDraft(initial); setOpen(true); }
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={choose} style={style}>
      <Text style={[Type.body, { color: value ? c.text : c.textSecondary }]}>{value || '선택하기'}</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
        <Pressable style={[styles.sheet, { backgroundColor: c.background }]} onPress={() => {}}>
          <View style={styles.row}>
            <Pressable onPress={() => setOpen(false)}><Text style={[Type.button, { color: c.textSecondary }]}>취소</Text></Pressable>
            <Text style={[Type.title, { color: c.text }]}>{label}</Text>
            <Pressable onPress={() => { onChange(read(draft)); setOpen(false); }}><Text style={[Type.button, { color: c.primaryStrong }]}>완료</Text></Pressable>
          </View>
          <DateTimePicker value={draft} mode={mode} display="spinner" locale="ko-KR" timeZoneName="Asia/Seoul" textColor={c.text} onChange={(_, date) => { if (date) setDraft(date); }} />
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  input: { ...Type.body, minHeight: 52, borderRadius: Radius.md, padding: 16, justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
  sheet: { padding: 20, paddingBottom: 40, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
