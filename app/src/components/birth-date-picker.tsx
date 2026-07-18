import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatBirthDigits } from '@/lib/birth-date';
import type { ThemeColors } from '@/constants/theme';

/** 생년월일 네이티브 픽커. iOS는 바텀시트 휠(spinner), Android는 시스템 다이얼로그. */

type BirthDatePickerProps = {
  /** YYYYMMDD 8자리 숫자 문자열 (빈 문자열 = 미선택). */
  value: string;
  onChange: (digits: string) => void;
  c: ThemeColors;
};

const MIN_AGE = 19;
const MAX_AGE = 80;

function toDigits(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function fromDigits(digits: string): Date | null {
  if (!/^\d{8}$/.test(digits)) return null;
  return new Date(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)) - 1, Number(digits.slice(6, 8)));
}

export function BirthDatePicker({ value, onChange, c }: BirthDatePickerProps) {
  const [open, setOpen] = useState(false);

  const now = new Date();
  const maximumDate = new Date(now.getFullYear() - MIN_AGE, now.getMonth(), now.getDate());
  const minimumDate = new Date(now.getFullYear() - MAX_AGE, 0, 1);
  // 미선택 시 휠의 시작 위치 — 만 25세 언저리
  const initialDate = fromDigits(value) ?? new Date(now.getFullYear() - 25, 0, 1);

  const [draft, setDraft] = useState(initialDate);

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toDigits(date));
        },
      });
      return;
    }
    setDraft(initialDate);
    setOpen(true);
  }

  function confirm() {
    onChange(toDigits(draft));
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={openPicker}
        style={[styles.trigger, { borderColor: c.border, backgroundColor: c.backgroundElement }]}
      >
        <Text style={{ color: value ? c.text : c.textSecondary, fontSize: 16 }}>
          {value ? formatBirthDigits(value) : '생년월일을 선택하세요'}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: c.background }]} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                  <Text style={{ color: c.textSecondary, fontSize: 16 }}>취소</Text>
                </Pressable>
                <Text style={[styles.sheetTitle, { color: c.text }]}>생년월일</Text>
                <Pressable onPress={confirm} hitSlop={10}>
                  <Text style={{ color: c.primary, fontSize: 16, fontWeight: '700' }}>완료</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                locale="ko-KR"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onChange={(_, date) => date && setDraft(date)}
                textColor={c.text}
                style={styles.picker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  picker: { alignSelf: 'center' },
});
