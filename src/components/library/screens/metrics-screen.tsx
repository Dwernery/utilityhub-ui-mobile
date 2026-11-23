import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { LibrarySwitcher } from '@/components/library/library-switcher';
import { CurrentlyReadingCard } from '@/components/library/metrics/currently-reading';
import { GoalCard, useGoalEditor } from '@/components/library/metrics/goal-card';
import { PeriodPicker } from '@/components/library/metrics/period-picker';
import { YearChartCard, YearDetailsCard } from '@/components/library/metrics/year-sections';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { StatTile } from '@/components/ui/stat-tile';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useIsWide } from '@/hooks/use-is-wide';
import { useBooks } from '@/lib/library/hooks';
import { calculateMetrics } from '@/lib/library/utils/metricUtils';
import { formatDelta, periodStats, periodYears } from '@/lib/library/utils/period';
import { SkeletonCard, SkeletonTiles } from '@/components/ui/skeleton';
import type { GraphMetric } from '@/lib/library/utils/yearDetails';

export default function Metrics() {
  // What the stats below "now" describe: all time (null) or one year.
  const [period, setPeriod] = useState<number | null>(null);
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('books');
  const { data: books = [], isPending, isError, error, refetch, isRefetching } = useBooks();
  const wide = useIsWide();
  const metrics = useMemo(() => calculateMetrics(books, period), [books, period]);
  const years = useMemo(() => periodYears(books), [books]);
  const stats = useMemo(() => periodStats(books, period), [books, period]);
  const thisYear = new Date().getFullYear();
  const goalEditor = useGoalEditor(thisYear);

  // Up is green, down is red, for books, pages and rating; longer or shorter books aren't better or worse.
  const tone = (n: number | null | undefined, neutral = false) =>
    n == null || n === 0 || neutral ? colors.secondaryLabel : n > 0 ? colors.positive : colors.negative;
  const tile = (label: string, value: string | number, change: number | null | undefined, decimals = 0, neutral = false) => (
    <StatTile
      label={label}
      value={value}
      caption={formatDelta(change ?? null, decimals) ?? undefined}
      captionTint={tone(change, neutral)}
      style={styles.tile}
    />
  );

  return (
    <>
      {/* Like Inventory's Filter and +: Start Reading, and this year's goal. The web keeps these in the cards. */}
      <Stack.Toolbar placement="right">
        {goalEditor.ready ? (
          <Stack.Toolbar.Menu icon="target" accessibilityLabel={`${thisYear} reading goal`}>
            <Stack.Toolbar.MenuAction icon="pencil" disabled={goalEditor.busy} onPress={goalEditor.edit}>
              {goalEditor.goal ? `Edit ${thisYear} Goal…` : `Set ${thisYear} Goal…`}
            </Stack.Toolbar.MenuAction>
            {goalEditor.goal ? (
              <Stack.Toolbar.MenuAction icon="trash" destructive disabled={goalEditor.busy} onPress={goalEditor.remove}>
                Remove Goal
              </Stack.Toolbar.MenuAction>
            ) : null}
          </Stack.Toolbar.Menu>
        ) : null}
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Start reading" onPress={() => router.push('/library/start-reading')} />
      </Stack.Toolbar>
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
          {/* Wide: lined up with the stat tiles below (same gap): Currently Reading spans 3 tiles,
              the goal 1, equal heights. Phone: stacked. */}
          <View style={wide ? styles.nowRow : styles.stack}>
            <CurrentlyReadingCard books={books} style={wide && styles.threeTiles} />
            <GoalCard
              year={thisYear}
              done={metrics.byYear[thisYear]?.books ?? 0}
              stacked={wide}
              style={wide && styles.oneTile}
            />
          </View>

          {/* Everything below follows the picker: the tiles describe the period, then all time shows
              the per-year chart (tap a bar to pick that year) and a year shows its months and books. */}
          <View style={styles.periodSection}>
            {/* A hairline separates "now" (above) from the history the picker drives (below). */}
            <View style={styles.divider} />
            <PeriodPicker years={years} value={period} onChange={setPeriod} />

            {/* Wide: one row of four tiles; phone: 2×2. */}
            <View style={[styles.tiles, wide && styles.tileRow]}>
              <View style={[styles.tileRow, wide && styles.flex]}>
                {tile('Books', stats.books, stats.vs?.books)}
                {tile('Pages', stats.pages.toLocaleString(), stats.vs?.pages)}
              </View>
              <View style={[styles.tileRow, wide && styles.flex]}>
                {tile('Avg pages', stats.avgPages ?? '—', stats.vs?.avgPages, 0, true)}
                {tile('Avg rating', stats.avgRating != null ? stats.avgRating.toFixed(1) : '—', stats.vs?.avgRating, 1)}
              </View>
            </View>
          </View>

          {period == null ? (
            <YearChartCard
              metrics={metrics}
              graphMetric={graphMetric}
              setGraphMetric={setGraphMetric}
              onPickYear={setPeriod}
            />
          ) : (
            <YearDetailsCard year={period} metrics={metrics} books={books} />
          )}
        </>
      )}
    </ScreenScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  state: { alignItems: 'center', gap: spacing.sm, paddingVertical: 64 },
  flex: { flex: 1, minWidth: 0 },
  stack: { gap: spacing.lg },
  // With gap g, a tile is (W − 3g) / 4. Growing 3:1 from a 2g head start makes Currently Reading
  // exactly 3 tiles + 2 gaps and the goal exactly 1 tile, so both edges line up with the tiles.
  // Alone (no goal), Currently Reading fills the row.
  nowRow: { flexDirection: 'row', gap: spacing.sm },
  threeTiles: { flexGrow: 3, flexShrink: 1, flexBasis: spacing.sm * 2, minWidth: 0 },
  oneTile: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  periodSection: { gap: spacing.md },
  divider: { height: 1, backgroundColor: colors.divider, marginBottom: spacing.xs },
  tiles: { gap: spacing.sm },
  tileRow: { flexDirection: 'row', gap: spacing.sm },
  tile: { backgroundColor: colors.secondaryGroupedBackground },
});
