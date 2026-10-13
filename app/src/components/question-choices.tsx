import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import type { QuestionInputType, QuestionOption } from '@/lib/daily';

export function QuestionChoices({ inputType, options, selected, onChange, disabled, c }: {
  inputType: QuestionInputType;
  options: QuestionOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
  c: ThemeColors;
}) {
  const multiple = inputType === 'MULTIPLE_CHOICE';
  return <View style={styles.root}>
    <Text style={[Type.caption, { color: c.textSecondary }]}>{multiple ? '여러 개 골라도 좋아요' : '한 가지를 골라주세요'}</Text>
    {options.map((option) => {
      const checked = selected.includes(option.id);
      return <Pressable
        key={option.id}
        accessibilityRole={multiple ? 'checkbox' : 'radio'}
        accessibilityLabel={inputType === 'OX' ? `${option.id}, ${option.label}` : option.label}
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => onChange(multiple
          ? checked ? selected.filter((id) => id !== option.id) : [...selected, option.id]
          : [option.id])}
        style={({ pressed }) => [styles.option, { backgroundColor: checked ? c.primary + '18' : c.backgroundSelected, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}
      >
        {inputType === 'OX' && <Text style={[Type.title, { color: checked ? c.primaryStrong : c.text }]}>{option.id}</Text>}
        <Text style={[Type.body, styles.label, { color: checked ? c.primaryStrong : c.text }]}>{option.label}</Text>
        <Text style={[Type.label, { color: checked ? c.primaryStrong : c.textSecondary }]}>{checked ? '✓' : multiple ? '□' : '○'}</Text>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 52, borderRadius: Radius.md },
  label: { flex: 1 },
});
