import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

const SECTIONS = [
  { label: 'Dashboard', key: 'dashboard' },
  { label: 'Expenses', key: 'expenses' },
  { label: 'History', key: 'history' },
] as const;

export type FinanceSection = (typeof SECTIONS)[number]['label'];
export type SectionKey = (typeof SECTIONS)[number]['key'];
export const SECTION_KEYS = SECTIONS.map((s) => s.key);

/** The web's Dashboard / Income & Expenses / Income History tabs as a segmented control. */
export function FinanceSwitcher({ current }: { current: FinanceSection }) {
  return (
    <View style={styles.container}>
      <SegmentedControl
        values={SECTIONS.map((s) => s.label)}
        selectedIndex={SECTIONS.findIndex((s) => s.label === current)}
        onChange={(e) => {
          const next = SECTIONS[e.nativeEvent.selectedSegmentIndex];
          if (!next || next.label === current) return;
          haptics.selection();
          // Same screen, new content: swapping a param never pushes or pops, so there's no back animation.
          router.setParams({ section: next.key });
        }}
        accessibilityLabel="Finances section"
      />
    </View>
  );
}

/** Year picker: a segmented control for up to 5 years, otherwise the most recent 5. */
export function YearSegments({ years, selected, onSelect }: { years: number[]; selected: number | null; onSelect: (y: number) => void }) {
  const shown = years.slice(-5);
  if (shown.length < 2) return null;
  return (
    <SegmentedControl
      values={shown.map(String)}
      selectedIndex={selected != null ? shown.indexOf(selected) : shown.length - 1}
      onChange={(e) => {
        const y = shown[e.nativeEvent.selectedSegmentIndex];
        if (y != null && y !== selected) {
          haptics.selection();
          onSelect(y);
        }
      }}
      accessibilityLabel="Year"
    />
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xs },
});
