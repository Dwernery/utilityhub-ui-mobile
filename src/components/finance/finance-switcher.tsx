import { MenuView } from '@expo/ui/community/menu';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
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

/**
 * Year picker: a segmented control for up to 5 years, otherwise the most recent 5 plus a calendar
 * button whose menu lists every year. An older selected year takes the place of the oldest segment.
 */
export function YearSegments({ years, selected, onSelect }: { years: number[]; selected: number | null; onSelect: (y: number) => void }) {
  const recent = years.slice(-5);
  const shown = selected == null || recent.includes(selected) ? recent : [selected, ...recent.slice(1)];
  if (shown.length < 2) return null;
  const pick = (y: number | undefined) => {
    if (y == null || y === selected) return;
    haptics.selection();
    onSelect(y);
  };
  const segments = (
    <SegmentedControl
      style={styles.flex}
      values={shown.map(String)}
      selectedIndex={selected != null ? shown.indexOf(selected) : shown.length - 1}
      onChange={(e) => pick(shown[e.nativeEvent.selectedSegmentIndex])}
      accessibilityLabel="Year"
    />
  );
  if (years.length <= 5) return segments;
  return (
    <View style={styles.yearRow}>
      {segments}
      <MenuView
        title="Year"
        actions={[...years].reverse().map((y) => ({ id: String(y), title: String(y), state: y === selected ? 'on' : 'off' }))}
        onPressAction={(e) => pick(Number(e.nativeEvent.event))}>
        <View style={styles.allYears} accessible accessibilityRole="button" accessibilityLabel="All years">
          <SymbolView name="calendar" size={17} tintColor={colors.label} />
        </View>
      </MenuView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xs },
  flex: { flex: 1 },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  allYears: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tertiaryFill,
  },
});
