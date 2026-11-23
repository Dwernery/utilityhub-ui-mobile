import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { accents, colors, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

/** "All time | 2026 | 2025 | …" pills that pick what the Metrics stats below describe (null = all time). */
export function PeriodPicker({ years, value, onChange }: {
  years: number[];
  value: number | null;
  onChange: (year: number | null) => void;
}) {
  const options: { key: string; label: string; year: number | null }[] = [
    { key: 'all', label: 'All time', year: null },
    ...years.map((y) => ({ key: String(y), label: String(y), year: y })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel="Period">
      {options.map((o) => {
        const selected = o.year === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(o.year);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.pill, selected && styles.pillSelected, pressed && !selected && { opacity: 0.6 }]}>
            <Text style={[type.subheadline, tabularNums, { color: selected ? colors.white : colors.label, fontWeight: '600' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.secondaryGroupedBackground,
  },
  pillSelected: { backgroundColor: accents.library },
});
