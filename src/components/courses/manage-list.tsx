import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, tabularNums, type } from '@/constants/theme';

/** One row of the Creators / Groups lists: name, course count, then icon buttons. */
export function ManageRow({
  name,
  count,
  first,
  last,
  children,
}: {
  name: string;
  count: number;
  first: boolean;
  last: boolean;
  children: ReactNode;
}) {
  return (
    <View
      style={[styles.row, first && styles.first, last && styles.last]}
      accessible={false}>
      <Text style={[type.body, styles.name]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[type.footnote, tabularNums, styles.count]}>
        {count} {count === 1 ? 'course' : 'courses'}
      </Text>
      <View style={styles.actions}>{children}</View>
      {!last && <View style={styles.separator} />}
    </View>
  );
}

export function ManageButton({
  icon,
  label,
  onPress,
  disabled = false,
  destructive = false,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.5 }, disabled && { opacity: 0.25 }]}>
      <SymbolView name={icon} size={17} tintColor={destructive ? colors.negative : colors.secondaryLabel} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: 48,
    backgroundColor: colors.secondaryGroupedBackground,
  },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderCurve: 'continuous' },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, borderCurve: 'continuous' },
  name: { flex: 1, minWidth: 0, color: colors.label },
  count: { color: colors.secondaryLabel },
  actions: { flexDirection: 'row', alignItems: 'center' },
  button: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  separator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: spacing.lg,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
});
