import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { KeyboardEvent, Ref } from 'react';
import { Radius, Type, type ThemeColors } from '@/constants/theme';
import type { QuestionInputType, QuestionOption } from '@/lib/daily';

export function QuestionChoices({ inputType, options, selected, onChange, disabled, c, firstOptionRef }: {
  inputType: QuestionInputType;
  options: QuestionOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
  c: ThemeColors;
  firstOptionRef?: Ref<View>;
}) {
  const multiple = inputType === 'MULTIPLE_CHOICE';
  return <View style={styles.root} accessibilityRole={multiple ? undefined : 'radiogroup'} accessibilityLabel={multiple ? '여러 개 골라도 좋아요' : '한 가지를 골라주세요'}>
    <Text style={[Type.caption, { color: c.textSecondary }]}>{multiple ? '여러 개 골라도 좋아요' : '한 가지를 골라주세요'}</Text>
    {options.map((option, index) => {
      const checked = selected.includes(option.id);
      return <Pressable
        key={option.id}
        ref={index === 0 ? firstOptionRef : undefined}
        accessibilityRole={multiple ? 'checkbox' : 'radio'}
        accessibilityLabel={inputType === 'OX' ? `${option.id}, ${option.label}` : option.label}
        accessibilityState={{ checked, disabled }}
        aria-checked={checked}
        aria-disabled={disabled}
        disabled={disabled}
        {...(Platform.OS === 'web' ? {
          tabIndex: disabled ? -1 : multiple || checked || (selected.length === 0 && index === 0) ? 0 : -1,
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (disabled) return;
            if (event.key === ' ') {
              event.preventDefault();
              onChange(multiple ? checked ? selected.filter((id) => id !== option.id) : [...selected, option.id] : [option.id]);
            } else if (!multiple && ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
                : (index + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
              onChange([options[next].id]);
              event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
            }
          },
        } : {})}
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
