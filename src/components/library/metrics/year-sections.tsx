import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { StarRating } from '@/components/library/star-rating';
import { Card } from '@/components/ui/card';
import { BarChart, describeSeries } from '@/components/ui/charts';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { Book } from '@/lib/library/types';
import { formatDate } from '@/lib/library/utils/dateUtils';
import type { LibraryMetrics, YearComparison } from '@/lib/library/utils/metricUtils';
import { finishedInYear, GRAPH_METRICS, MONTH_SHORT, signed, type GraphMetric } from '@/lib/library/utils/yearDetails';

const METRIC_KEYS: GraphMetric[] = ['books', 'pages', 'rating'];

/** "Books / Pages / Ratings per year" bar chart (Swift Charts). The selected year is highlighted. */
export function YearChartCard({ metrics, graphMetric, setGraphMetric, selectedYear }: {
  metrics: LibraryMetrics;
  graphMetric: GraphMetric;
  setGraphMetric: (m: GraphMetric) => void;
  selectedYear: number | null;
}) {
  const cfg = GRAPH_METRICS[graphMetric];
  const data = [...metrics.yearComparisons]
    .sort((a, b) => a.year - b.year)
    .map((y) => ({ label: String(y.year), value: cfg.value(y) }));

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={[type.headline, { color: colors.label }]}>{cfg.label}</Text>
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
        highlight={selectedYear != null ? String(selectedYear) : null}
        height={190}
        style={{ marginTop: spacing.md }}
        emptyText="No finished books yet"
        accessibilityLabel={`${cfg.label}: ${describeSeries(data, cfg.format)}`}
      />
      {/* Swift Charts has no tap handling or value labels; show the numbers underneath instead. */}
      <View style={styles.valueRow}>
        {data.map((d) => (
          <View key={d.label} style={styles.valueCell}>
            <Text
              style={[
                type.caption1,
                tabularNums,
                { color: String(selectedYear) === d.label ? accents.library : colors.secondaryLabel, fontWeight: '600' },
              ]}>
              {cfg.format(d.value)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function TrendPill({ diff, percent, label }: { diff: number | null; percent: number | null; label: string }) {
  if (diff === null || percent === null) return null;
  const icon: SFSymbol = diff > 0 ? 'arrow.up.right' : diff < 0 ? 'arrow.down.right' : 'arrow.right';
  const tone = diff > 0 ? colors.positive : diff < 0 ? colors.negative : colors.secondaryLabel;
  return (
    <View
      style={styles.pill}
      accessible
      accessibilityLabel={`${signed(diff)} ${label === 'BK' ? 'books' : 'pages'}, ${signed(percent)} percent`}>
      <SymbolView name={icon} size={10} weight="bold" tintColor={tone} />
      <Text style={[styles.pillValue, { color: tone }]}>{signed(diff)}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillValue, { color: tone }]}>{signed(percent)}</Text>
      <Text style={styles.pillLabel}>%</Text>
    </View>
  );
}

function YearDetails({ year, metrics, books }: { year: number; metrics: LibraryMetrics; books: Book[] }) {
  const reduceMotion = useReducedMotion();
  const finished = finishedInYear(books, year);
  const maxBooks = Math.max(...Object.values(metrics.byMonth).map((m) => m?.books || 0), 1);

  return (
    <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(180)} style={styles.details}>
      <Text style={[type.caption1, styles.muted]}>By month</Text>
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

      <Text style={[type.caption1, styles.muted, { marginTop: spacing.md }]}>
        {finished.length} {finished.length === 1 ? 'book' : 'books'} finished
      </Text>
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
    </Animated.View>
  );
}

/** Year-over-year list; tapping a year expands its monthly breakdown and finished books in place. */
export function YearComparisonCard({ metrics, books, selectedYear, setSelectedYear }: {
  metrics: LibraryMetrics;
  books: Book[];
  selectedYear: number | null;
  setSelectedYear: (y: number | null) => void;
}) {
  const years = [...metrics.yearComparisons].sort((a, b) => b.year - a.year);
  return (
    <Card padded={false}>
      <Text style={[type.headline, styles.listTitle]}>Year comparison</Text>
      {years.map((yd: YearComparison) => {
        const selected = selectedYear === yd.year;
        return (
          <View key={yd.year}>
            <View style={styles.separator} />
            <Pressable
              onPress={() => {
                haptics.selection();
                setSelectedYear(selected ? null : yd.year);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: selected }}
              style={({ pressed }) => [styles.yearRow, (pressed || selected) && styles.yearRowActive]}>
              <Text style={[type.headline, tabularNums, styles.year, selected && { color: accents.library }]}>{yd.year}</Text>
              <View style={styles.flex}>
                <View style={styles.inline}>
                  <Text style={[type.subheadline, { color: colors.label, fontWeight: '600' }]}>{yd.books} books</Text>
                  <Text style={[type.caption1, styles.muted]}>{yd.pages.toLocaleString()} pages</Text>
                </View>
                {yd.booksDiff !== null ? (
                  <View style={[styles.inline, { marginTop: 4, flexWrap: 'wrap' }]}>
                    <TrendPill diff={yd.booksDiff} percent={yd.booksPercentChange} label="BK" />
                    <TrendPill diff={yd.pagesDiff} percent={yd.pagesPercentChange} label="PG" />
                  </View>
                ) : (
                  <Text style={[type.caption1, { color: colors.tertiaryLabel, marginTop: 2 }]}>No prior year</Text>
                )}
              </View>
              <SymbolView
                name={selected ? 'chevron.up' : 'chevron.down'}
                size={13}
                weight="semibold"
                tintColor={selected ? accents.library : colors.tertiaryLabel}
              />
            </Pressable>
            {selected && <YearDetails year={yd.year} metrics={metrics} books={books} />}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  muted: { color: colors.secondaryLabel },
  right: { alignItems: 'flex-end' },
  cardHeader: { marginBottom: spacing.md },
  valueRow: { flexDirection: 'row', paddingRight: 28, marginTop: 4 },
  valueCell: { flex: 1, alignItems: 'center' },
  listTitle: { color: colors.label, padding: spacing.lg },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  yearRowActive: { backgroundColor: colors.tertiaryFill },
  year: { width: 48, color: colors.label },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.tertiaryFill,
  },
  pillValue: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pillLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1, color: colors.secondaryLabel },
  details: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm, gap: 6, backgroundColor: colors.tertiaryFill },
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
