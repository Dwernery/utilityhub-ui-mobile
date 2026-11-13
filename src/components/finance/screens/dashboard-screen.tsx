import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { DETAILS_MS, HeroCard, MonthlyList } from '@/components/finance/dashboard-parts';
import { useEasedNumber } from '@/hooks/use-eased-number';
import { FinanceSwitcher, YearSegments } from '@/components/finance/finance-switcher';
import { Card } from '@/components/ui/card';
import { describeSeries, formatThousands, LineChart } from '@/components/ui/charts';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { accentHex, accents, colors, spacing, type } from '@/constants/theme';
import { useIsWide } from '@/hooks/use-is-wide';
import { useNetWorthHistory } from '@/lib/finance/hooks';
import { Currencyformatter } from '@/lib/finance/utils/currency';
import { getMonthlyChartData, getYears } from '@/lib/finance/utils/metrics';
import { Skeleton, SkeletonCard, SkeletonListGroup } from '@/components/ui/skeleton';
import { buildMonthlyRows } from '@/lib/finance/utils/monthly';

/** Smallest the wide-layout chart may shrink to before the left column grows past the month list. */
const MIN_CHART = 160;

export default function Dashboard() {
  const { data: history, isPending, isError, error, refetch, isRefetching } = useNetWorthHistory();
  const wide = useIsWide();
  const years = useMemo(() => getYears(history), [history]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  /** Space left for the chart in the wide layout (measured). */
  const [chartHeight, setChartHeight] = useState(MIN_CHART);
  const [measures, setMeasures] = useState(0);
  // Ease the chart to its new height (e.g. when the hero details open) instead of snapping, but take
  // the first measurement as-is so the page doesn't animate on load.
  const easedChartHeight = useEasedNumber(chartHeight, measures <= 1 ? 0 : DETAILS_MS);
  const year = selectedYear ?? years.at(-1) ?? null;

  const chart = useMemo(
    () => (year ? getMonthlyChartData(history, year).map((d) => ({ label: d.month.slice(0, 3), value: d.netWorth })) : []),
    [history, year],
  );
  const chartView = (height: number) => (
    <LineChart
      data={chart}
      tint={accentHex.library /* the web graph is blue */}
      yStep={10_000}
      formatY={formatThousands}
      formatValue={(n) => Currencyformatter.format(n)}
      height={height}
      emptyText="No complete months yet"
      accessibilityLabel={`Net worth by month in ${year}: ${describeSeries(chart, (n) => Currencyformatter.format(n))}`}
    />
  );
  const rows = useMemo(() => (year ? buildMonthlyRows(history, year) : []), [history, year]);

  return (
    <ScreenScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
      <FinanceSwitcher current="Dashboard" />

      {isPending ? (
        <View style={styles.stack} accessibilityLabel="Loading" accessibilityRole="progressbar">
          <Skeleton height={32} r={9} />
          <View style={wide ? styles.columns : styles.stack}>
            <View style={[styles.stack, wide && styles.mainCol]}>
              <SkeletonCard lines={1} tall={60} />
              <SkeletonCard lines={0} tall={190} />
            </View>
            <View style={wide ? styles.sideCol : undefined}>
              <SkeletonListGroup rows={6} cover={false} />
            </View>
          </View>
        </View>
      ) : isError ? (
        <View style={styles.state}>
          <Text style={[type.subheadline, { color: colors.negative, textAlign: 'center' }]}>
            Failed to load net worth: {error?.message || 'Unknown error'}
          </Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={[type.headline, { color: accents.finances }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <YearSegments years={years} selected={year} onSelect={setSelectedYear} />
          {/* Wide: summary + chart on the left, month list on the right (the web's desktop layout). */}
          {/* Wide: columns stretch to the month list's height, and the chart card grows to fill the
              rest of the left column so both columns end flush. */}
          <View style={wide ? [styles.columns, styles.stretch] : styles.stack}>
            <View style={[styles.stack, wide && styles.mainCol]}>
              <HeroCard history={history} year={year} />
              <Card style={wide ? styles.grow : undefined}>
                {wide ? (
                  // The chart is absolutely positioned so it never sets the column height itself: the
                  // row takes the month list's height, and the chart fills whatever is left (shrinking
                  // when "Show details" opens) instead of pushing everything down.
                  <View style={styles.chartSlot} onLayout={(e) => {
                      setChartHeight(Math.round(e.nativeEvent.layout.height));
                      setMeasures((n) => n + 1);
                    }}>
                    <View style={StyleSheet.absoluteFill}>{chartView(Math.max(easedChartHeight, MIN_CHART))}</View>
                  </View>
                ) : (
                  chartView(230)
                )}
              </Card>
            </View>
            <View style={wide ? styles.sideCol : undefined}>
              <MonthlyList
                rows={rows}
                onOpen={(m) => router.push({ pathname: '/finances/month/[key]', params: { key: m.key } })}
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
  stack: { gap: spacing.lg },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  mainCol: { flex: 1.4, minWidth: 0 },
  sideCol: { flex: 1, minWidth: 0 },
  stretch: { alignItems: 'stretch' },
  grow: { flex: 1 },
  chartSlot: { flex: 1, minHeight: MIN_CHART },
});
