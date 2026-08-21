import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { REGIONS, SIDO_LIST } from '@/constants/regions';
import type { ThemeColors } from '@/constants/theme';

/** 지역(시/도 + 구/군) 네이티브 휠 픽커. 바텀시트 안에 UIPickerView 휠 2개. */

type RegionPickerProps = {
  value: string | null; // "서울 서초구" 형식
  onChange: (value: string) => void;
  c: ThemeColors;
};

export function RegionPicker({ value, onChange, c }: RegionPickerProps) {
  const [open, setOpen] = useState(false);

  const initialSido = value ? value.split(' ')[0] : SIDO_LIST[0];
  const initialDistrict = value ? value.split(' ').slice(1).join(' ') : REGIONS[SIDO_LIST[0]][0];
  const [sido, setSido] = useState(initialSido);
  const [district, setDistrict] = useState(initialDistrict);

  function openSheet() {
    setSido(initialSido);
    setDistrict(initialDistrict);
    setOpen(true);
  }

  // 시/도를 바꾸면 구/군 목록이 달라지므로 첫 항목으로 리셋
  function changeSido(next: string) {
    setSido(next);
    setDistrict(REGIONS[next][0]);
  }

  function confirm() {
    onChange(`${sido} ${district}`);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={openSheet}
        style={[styles.trigger, { borderColor: c.border, backgroundColor: c.backgroundElement }]}
      >
        <Text style={{ color: value ? c.text : c.textSecondary, fontSize: 17 }}>
          {value ?? '지역을 선택하세요'}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.background }]} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={{ color: c.textSecondary, fontSize: 17 }}>취소</Text>
              </Pressable>
              <Text style={[styles.sheetTitle, { color: c.text }]}>지역</Text>
              <Pressable onPress={confirm} hitSlop={10}>
                <Text style={{ color: c.primary, fontSize: 17, fontWeight: '700' }}>완료</Text>
              </Pressable>
            </View>
            <View style={styles.wheels}>
              <Picker
                selectedValue={sido}
                onValueChange={changeSido}
                style={styles.wheel}
                itemStyle={{ color: c.text }}
              >
                {SIDO_LIST.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
              <Picker
                selectedValue={district}
                onValueChange={setDistrict}
                style={styles.wheel}
                itemStyle={{ color: c.text }}
              >
                {REGIONS[sido].map((d) => (
                  <Picker.Item key={d} label={d} value={d} />
                ))}
              </Picker>
            </View>
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
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  wheels: { flexDirection: 'row' },
  wheel: { flex: 1 },
});
