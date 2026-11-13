import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ui/progress-bar';
import { accents, colors, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useBooks } from '@/lib/library/hooks';

const SECTIONS = [
  { label: 'Inventory', key: 'inventory' },
  { label: 'Metrics', key: 'metrics' },
  { label: 'Randomize', key: 'randomize' },
] as const;

export type LibrarySection = (typeof SECTIONS)[number]['label'];
export type SectionKey = (typeof SECTIONS)[number]['key'];
export const SECTION_KEYS = SECTIONS.map((s) => s.key);

/**
 * Top of every Library screen: the web header's Inventory/Metrics/Randomize tabs as a native
 * segmented control, plus its "read / total" progress line.
 */
export function LibrarySwitcher({ current }: { current: LibrarySection }) {
  const { data: books = [] } = useBooks();
  const read = books.filter((b) => b.status === 'READ').length;
  const total = books.length;
  const pct = total > 0 ? Math.round((read / total) * 100) : 0;

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
        accessibilityLabel="Library section"
      />
      <View style={styles.progressRow} accessible accessibilityLabel={`${read} of ${total} books read, ${pct} percent`}>
        <Text style={[type.footnote, tabularNums, { color: colors.secondaryLabel }]}>
          {read}/{total} read
        </Text>
        <ProgressBar value={pct / 100} tint={accents.library} height={5} style={styles.bar} />
        <Text style={[type.footnote, tabularNums, styles.pct]}>{pct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, marginBottom: spacing.lg },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bar: { flex: 1, width: undefined },
  pct: { color: accents.library, fontWeight: '600' },
});
