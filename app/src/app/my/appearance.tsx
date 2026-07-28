import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubScreen } from '@/components/sub-screen';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { APPEARANCE_DESC, APPEARANCE_LABEL, APPEARANCE_MODES, useAppearance, type AppearanceMode } from '@/lib/appearance';

/** 화면 테마 선택. 고르는 즉시 적용되고 저장되므로 저장 버튼을 두지 않는다. */
export default function AppearanceScreen() {
  const c = useTheme();
  const { mode, setMode } = useAppearance();

  return (
    <SubScreen title="화면 테마" c={c}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lead, { color: c.textSecondary }]}>
          고르는 즉시 앱 전체에 적용돼요.
        </Text>

        <View style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
          {APPEARANCE_MODES.map((m, i) => (
            <Option
              key={m}
              mode={m}
              selected={mode === m}
              onPress={() => setMode(m)}
              c={c}
              last={i === APPEARANCE_MODES.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </SubScreen>
  );
}

function Option({
  mode,
  selected,
  onPress,
  c,
  last,
}: {
  mode: AppearanceMode;
  selected: boolean;
  onPress: () => void;
  c: ThemeColors;
  last: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.flex}>
        <Text style={[styles.label, { color: c.text }]}>{APPEARANCE_LABEL[mode]}</Text>
        <Text style={[styles.desc, { color: c.textSecondary }]}>{APPEARANCE_DESC[mode]}</Text>
      </View>
      {selected && <Text style={[styles.check, { color: c.primaryStrong }]}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  lead: { fontSize: 13.5, marginBottom: 14 },
  card: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  label: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 12.5, marginTop: 2 },
  check: { fontSize: 17, fontWeight: '700' },
});
