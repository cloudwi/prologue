import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { REGIONS, SIDO_LIST } from '@/constants/regions';
import type { ThemeColors } from '@/constants/theme';

type RegionPickerProps = {
  value: string | null; // "서울 서초구" 형식
  onChange: (value: string) => void;
  c: ThemeColors;
};

export function RegionPicker({ value, onChange, c }: RegionPickerProps) {
  const [open, setOpen] = useState(false);
  const [sido, setSido] = useState<string | null>(value ? value.split(' ')[0] : null);

  function selectDistrict(district: string) {
    if (!sido) return;
    onChange(`${sido} ${district}`);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: c.border, backgroundColor: c.backgroundElement }]}
      >
        <Text style={{ color: value ? c.text : c.textSecondary, fontSize: 16 }}>
          {value ?? '지역을 선택하세요'}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.background }]} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.text }]}>지역 선택</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={{ color: c.textSecondary, fontSize: 16 }}>닫기</Text>
              </Pressable>
            </View>
            <View style={styles.columns}>
              {/* 시/도 */}
              <FlatList
                style={[styles.column, { borderColor: c.border }]}
                data={SIDO_LIST}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const selected = item === sido;
                  return (
                    <Pressable
                      onPress={() => setSido(item)}
                      style={[styles.cell, selected && { backgroundColor: c.backgroundElement }]}
                    >
                      <Text style={{ color: selected ? c.primary : c.text, fontWeight: selected ? '700' : '400' }}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                }}
              />
              {/* 구/군 */}
              <FlatList
                style={styles.column}
                data={sido ? REGIONS[sido] : []}
                keyExtractor={(item) => item}
                ListEmptyComponent={
                  <Text style={[styles.empty, { color: c.textSecondary }]}>시/도를 먼저 선택하세요</Text>
                }
                renderItem={({ item }) => {
                  const selected = value === `${sido} ${item}`;
                  return (
                    <Pressable onPress={() => selectDistrict(item)} style={styles.cell}>
                      <Text style={{ color: selected ? c.primary : c.text, fontWeight: selected ? '700' : '400' }}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                }}
              />
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
  sheet: { height: '62%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  columns: { flex: 1, flexDirection: 'row', gap: 8 },
  column: { flex: 1, borderRightWidth: StyleSheet.hairlineWidth },
  cell: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8 },
  empty: { padding: 16, fontSize: 13 },
});
