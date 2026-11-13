import { SymbolView } from 'expo-symbols';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';

/**
 * iOS grouped-form building blocks (Settings-style inset sections with hairline separators).
 * Replaces the web's stacked `<label>` + bordered `<input>` boxes.
 */

export function FormSection({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.section}>
      {title ? <Text style={[type.footnote, styles.sectionTitle]}>{title.toUpperCase()}</Text> : null}
      <View style={styles.group}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 && <View style={styles.separator} />}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={[type.footnote, styles.footer]}>{footer}</Text> : null}
    </View>
  );
}

interface FormTextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  required?: boolean;
}

/** Label on the left, editable text on the right (like Contacts). */
export function FormTextField({ label, required, editable = true, ...input }: FormTextFieldProps) {
  return (
    <View style={styles.row}>
      <Text style={[type.body, styles.label]}>
        {label}
        {required ? <Text style={{ color: colors.tertiaryLabel }}> *</Text> : null}
      </Text>
      <TextInput
        {...input}
        editable={editable}
        accessibilityLabel={label}
        placeholderTextColor={colors.tertiaryLabel}
        clearButtonMode="while-editing"
        style={[type.body, styles.input, !editable && styles.disabled]}
      />
    </View>
  );
}

interface FormValueRowProps {
  label: string;
  value?: string | null;
  placeholder?: string;
  required?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

/** Label + current value + chevron; opens a picker sheet (author, series…). */
export function FormValueRow({ label, value, placeholder = 'None', required, onPress, disabled }: FormValueRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || placeholder}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={[type.body, styles.label]}>
        {label}
        {required ? <Text style={{ color: colors.tertiaryLabel }}> *</Text> : null}
      </Text>
      <Text
        style={[type.body, styles.value, !value && { color: colors.tertiaryLabel }]}
        numberOfLines={1}>
        {value || placeholder}
      </Text>
      {onPress && <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.tertiaryLabel} />}
    </Pressable>
  );
}

/** Label + arbitrary trailing control (segmented control, date picker, switch…). */
export function FormControlRow({ label, children, stacked }: { label: string; children: ReactNode; stacked?: boolean }) {
  return (
    <View style={[styles.row, stacked && styles.stacked]}>
      <Text style={[type.body, styles.label]}>{label}</Text>
      <View style={stacked ? undefined : styles.control}>{children}</View>
    </View>
  );
}

/** Full-width button row inside a section (e.g. "Delete Book"). */
export function FormButtonRow({
  title,
  onPress,
  destructive,
  disabled,
}: {
  title: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, styles.center, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={[type.body, { color: destructive ? colors.negative : colors.label, fontWeight: '500' }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  sectionTitle: { color: colors.secondaryLabel, marginLeft: spacing.lg },
  footer: { color: colors.secondaryLabel, marginHorizontal: spacing.lg },
  group: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.secondaryGroupedBackground,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm, paddingVertical: spacing.md },
  center: { justifyContent: 'center' },
  label: { color: colors.label },
  input: { flex: 1, textAlign: 'right', color: colors.label, paddingVertical: 4 },
  value: { flex: 1, textAlign: 'right', color: colors.secondaryLabel },
  control: { flex: 1, alignItems: 'flex-end' },
  pressed: { backgroundColor: colors.fill },
  disabled: { opacity: 0.5 },
});
