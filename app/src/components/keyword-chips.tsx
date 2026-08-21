import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';

export function KeywordChips({
  options,
  selected,
  onChange,
  c,
  max,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  c: ThemeColors;
  max?: number;
}) {
  function toggle(k: string) {
    if (selected.includes(k)) {
      onChange(selected.filter((s) => s !== k));
    } else {
      if (max != null && selected.length >= max) return;
      onChange([...selected, k]);
    }
  }

  return (
    <View style={styles.wrap}>
      {options.map((k) => {
        const on = selected.includes(k);
        return (
          <Pressable
            key={k}
            onPress={() => toggle(k)}
            style={[
              styles.chip,
              { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : c.backgroundElement },
            ]}
          >
            <Text style={{ color: on ? c.primaryText : c.text, fontSize: 15, fontWeight: on ? '700' : '500' }}>{k}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
