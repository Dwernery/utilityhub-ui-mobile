import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { LibrarySwitcher } from '@/components/library/library-switcher';
import { CurrentlyReadingCard } from '@/components/library/metrics/currently-reading';
import { YearChartCard, YearComparisonCard } from '@/components/library/metrics/year-sections';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { StatTile } from '@/components/ui/stat-tile';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useIsWide } from '@/hooks/use-is-wide';
import { useBooks } from '@/lib/library/hooks';
import { calculateMetrics } from '@/lib/library/utils/metricUtils';
import { SkeletonCard, SkeletonTiles } from '@/components/ui/skeleton';
import type { GraphMetric } from '@/lib/library/utils/yearDetails';

export default function Metrics() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('books');
  const { data: books = [], isPending, isError, error, refetch, isRefetching } = useBooks();
  const wide = useIsWide();
  const metrics = useMemo(() => calculateMetrics(books, selectedYear), [books, selectedYear]);

  return (
    <ScreenScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
      <LibrarySwitcher current="Metrics" />

      {isPending ? (
        <View style={styles.stack} accessibilityLabel="Loading" accessibilityRole="progressbar">
          <SkeletonCard lines={1} />
          <SkeletonTiles count={4} perRow={wide ? 4 : 2} />
          <SkeletonCard lines={0} tall={200} />
        </View>
      ) : isError ? (
        <View style={styles.state}>
          <Text style={[type.subheadline, { color: colors.negative, textAlign: 'center' }]}>
            Failed to load books: {error?.message || 'Unknown error'}
          </Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={[type.headline, { color: accents.library }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <CurrentlyReadingCard books={books} />

          {/* Wide: one row of four tiles; phone: 2×2. */}
          <View style={[styles.tiles, wide && styles.tileRow]}>
            <View style={[styles.tileRow, wide && styles.flex]}>
              <StatTile label="Books" value={metrics.allTimeBooks} style={styles.tile} />
              <StatTile label="Pages" value={metrics.allTimePages.toLocaleString()} style={styles.tile} />
            </View>
            <View style={[styles.tileRow, wide && styles.flex]}>
              <StatTile
                label="Avg pages"
                value={metrics.allTimeBooks > 0 ? Math.round(metrics.allTimePages / metrics.allTimeBooks) : 0}
                style={styles.tile}
              />
              <StatTile label="Avg rating" value={metrics.allTimeRating} style={styles.tile} />
            </View>
          </View>

          {/* Wide: chart beside the year list; phone: stacked. */}
          <View style={wide ? styles.columns : styles.stack}>
            <View style={wide ? styles.flex : undefined}>
              <YearChartCard
                metrics={metrics}
                graphMetric={graphMetric}
                setGraphMetric={setGraphMetric}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
              />
            </View>
            <View style={wide ? styles.flex : undefined}>
              <YearComparisonCard
                metrics={metrics}
                books={books}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
              />
            </View>
          </View>
        </>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  state: { alignItems: 'center', gap: spacing.sm, paddingVertical: 64 },
  flex: { flex: 1, minWidth: 0 },
  stack: { gap: spacing.lg },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  tiles: { gap: spacing.sm },
  tileRow: { flexDirection: 'row', gap: spacing.sm },
  tile: { backgroundColor: colors.secondaryGroupedBackground },
});
