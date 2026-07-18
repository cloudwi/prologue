import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';

/** 키(cm) 네이티브 휠 픽커. */

type HeightPickerProps = {
  /** cm 숫자 문자열 (빈 문자열 = 미선택). */
  value: string;
  onChange: (height: string) => void;
  c: ThemeColors;
};

const MIN_CM = 140;
const MAX_CM = 210;
const DEFAULT_CM = '170';
const HEIGHTS = Array.from({ length: MAX_CM - MIN_CM + 1 }, (_, i) => String(MIN_CM + i));

export function HeightPicker({ value, onChange, c }: HeightPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || DEFAULT_CM);

  function openSheet() {
    setDraft(value || DEFAULT_CM);
    setOpen(true);
  }

  function confirm() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={openSheet}
        style={[styles.trigger, { borderColor: c.border, backgroundColor: c.backgroundElement }]}
      >
        <Text style={{ color: value ? c.text : c.textSecondary, fontSize: 16 }}>
          {value ? `${value}cm` : '키를 선택하세요'}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.background }]} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={{ color: c.textSecondary, fontSize: 16 }}>취소</Text>
              </Pressable>
              <Text style={[styles.sheetTitle, { color: c.text }]}>키</Text>
              <Pressable onPress={confirm} hitSlop={10}>
                <Text style={{ color: c.primary, fontSize: 16, fontWeight: '700' }}>완료</Text>
              </Pressable>
            </View>
            <Picker selectedValue={draft} onValueChange={setDraft} itemStyle={{ color: c.text }}>
              {HEIGHTS.map((h) => (
                <Picker.Item key={h} label={`${h}cm`} value={h} />
              ))}
            </Picker>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
});
