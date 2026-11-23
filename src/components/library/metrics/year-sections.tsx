import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { StarRating } from '@/components/library/star-rating';
import { Card } from '@/components/ui/card';
import { BarChart, describeSeries } from '@/components/ui/charts';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { Book } from '@/lib/library/types';
import { formatDate } from '@/lib/dates';
import type { LibraryMetrics } from '@/lib/library/utils/metricUtils';
import { finishedInYear, GRAPH_METRICS, MONTH_SHORT, type GraphMetric } from '@/lib/library/utils/yearDetails';

const METRIC_KEYS: GraphMetric[] = ['books', 'pages', 'rating'];

/** "Books / Pages / Ratings per year" bar chart, shown for "All time". Tapping a bar picks that year. */
export function YearChartCard({ metrics, graphMetric, setGraphMetric, onPickYear }: {
  metrics: LibraryMetrics;
  graphMetric: GraphMetric;
  setGraphMetric: (m: GraphMetric) => void;
  onPickYear: (year: number) => void;
}) {
  const cfg = GRAPH_METRICS[graphMetric];
  const data = [...metrics.yearComparisons]
    .sort((a, b) => a.year - b.year)
    .map((y) => ({ label: String(y.year), value: cfg.value(y) }));

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={[type.headline, { color: colors.label }]}>{cfg.label}</Text>
        <Text style={[type.caption1, styles.muted]}>Tap a year to see it</Text>
      </View>
      <SegmentedControl
        values={METRIC_KEYS.map((k) => GRAPH_METRICS[k].shortLabel)}
        selectedIndex={METRIC_KEYS.indexOf(graphMetric)}
        onChange={(e) => {
          const next = METRIC_KEYS[e.nativeEvent.selectedSegmentIndex];
          if (next && next !== graphMetric) {
            haptics.selection();
            setGraphMetric(next);
          }
        }}
        accessibilityLabel="Chart metric"
      />
      <BarChart
        data={data}
        tint={accents.library}
        highlight={null}
        height={190}
        style={{ marginTop: spacing.md }}
        emptyText="No finished books yet"
        accessibilityLabel={`${cfg.label}: ${describeSeries(data, cfg.format)}`}
        formatValue={cfg.format}
        unit={graphMetric === 'books' ? 'books' : graphMetric === 'pages' ? 'pages' : 'average rating'}
        onSelect={(label) => onPickYear(Number(label))}
      />
    </Card>
  );
}

/** One year: books finished per month, then the books themselves (newest first). */
export function YearDetailsCard({ year, metrics, books }: { year: number; metrics: LibraryMetrics; books: Book[] }) {
  const reduceMotion = useReducedMotion();
  const finished = finishedInYear(books, year);
  const maxBooks = Math.max(...Object.values(metrics.byMonth).map((m) => m?.books || 0), 1);

  return (
    <Animated.View key={year} entering={reduceMotion ? undefined : FadeIn.duration(180)}>
      <Card>
        <Text style={[type.headline, styles.title]}>By month</Text>
        <View style={styles.months}>
          {MONTH_SHORT.map((m, i) => {
            const md = metrics.byMonth[i];
            return (
              <View key={m} style={styles.monthRow} accessible accessibilityLabel={`${m}: ${md?.books ?? 0} books`}>
                <Text style={[type.caption1, styles.monthLabel]}>{m}</Text>
                <View style={styles.monthTrack}>
                  {md ? (
                    <View style={[styles.monthBar, { width: `${(md.books / maxBooks) * 100}%` }]}>
                      <Text style={styles.monthValue}>{md.books}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={[type.headline, styles.title, { marginTop: spacing.lg }]}>
          {finished.length} {finished.length === 1 ? 'book' : 'books'} finished in {year}
        </Text>
        {finished.length === 0 ? (
          <Text style={[type.subheadline, styles.muted]}>Nothing finished yet.</Text>
        ) : null}
        {finished.map(({ book, days }) => (
          <View key={book.id} style={styles.finishedRow}>
            <SymbolView name="checkmark.circle.fill" size={16} tintColor={colors.positive} />
            <View style={styles.flex}>
              <Text style={[type.subheadline, { color: colors.label, fontWeight: '500' }]} numberOfLines={1}>
                {book.title}
              </Text>
              <View style={styles.inline}>
                <Text style={[type.caption1, styles.muted]} numberOfLines={1}>
                  {book.authorName}
                </Text>
                {(book.rating ?? 0) > 0 && <StarRating value={book.rating} readonly size="sm" />}
              </View>
              <Text style={[type.caption1, styles.muted]}>
                {formatDate(book.startDate)} — {formatDate(book.endDate)}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={[type.caption1, tabularNums, styles.muted]}>{book.pages}p</Text>
              {days !== null && <Text style={[type.caption1, tabularNums, { color: colors.tertiaryLabel }]}>{days}d</Text>}
            </View>
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  muted: { color: colors.secondaryLabel },
  right: { alignItems: 'flex-end' },
  cardHeader: { marginBottom: spacing.md, gap: 2 },
  title: { color: colors.label, marginBottom: spacing.sm },
  months: { gap: 5 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthLabel: { width: 30, color: colors.secondaryLabel },
  monthTrack: { flex: 1, height: 20, borderRadius: radius.sm / 2, backgroundColor: colors.fill, overflow: 'hidden' },
  monthBar: {
    height: '100%',
    minWidth: 24,
    borderRadius: radius.sm / 2,
    backgroundColor: accents.library,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthValue: { fontSize: 11, fontWeight: '700', color: '#fff' },
  finishedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
});
