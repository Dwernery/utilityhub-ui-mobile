import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { HeroCard, MonthlyList } from '@/components/finance/dashboard-parts';
import { FinanceSwitcher, YearSegments } from '@/components/finance/finance-switcher';
import { Card } from '@/components/ui/card';
import { describeSeries, formatThousands, LineChart } from '@/components/ui/charts';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { accentHex, accents, colors, spacing, type } from '@/constants/theme';
import { useIsWide } from '@/hooks/use-is-wide';
import { useLayoutKey } from '@/hooks/use-layout-key';
import { useNetWorthHistory } from '@/lib/finance/hooks';
import { Currencyformatter } from '@/lib/finance/utils/currency';
import { getMonthlyChartData, getYears } from '@/lib/finance/utils/metrics';
import { Skeleton, SkeletonCard, SkeletonListGroup } from '@/components/ui/skeleton';
import { buildMonthlyRows } from '@/lib/finance/utils/monthly';

/** Chart height in the stacked (phone) layout. Wide, the chart fills the space beside the month list. */
const CHART_HEIGHT = 230;

export default function Dashboard() {
  const { data: history, isPending, isError, error, refetch, isRefetching } = useNetWorthHistory();
  const wide = useIsWide();
  // Lay out fresh after rotating/unfolding (see useLayoutKey). With the summary always open on
  // wide screens, only the scroll position resets.
  const layoutKey = useLayoutKey();
  const years = useMemo(() => getYears(history), [history]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const year = selectedYear ?? years.at(-1) ?? null;

  const chart = useMemo(
    () => (year ? getMonthlyChartData(history, year).map((d) => ({ label: d.month.slice(0, 3), value: d.netWorth })) : []),
    [history, year],
  );
  const chartView = (height: number | 'fill') => (
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
    <>
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button icon="building.columns" accessibilityLabel="Accounts" onPress={() => router.push('/finances/accounts')} />
    </Stack.Toolbar>
    <ScreenScrollView
      key={layoutKey}
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
          {/* Wide: summary + chart on the left, month list on the right (the web's desktop layout).
              Both columns end flush: the month list is always 12 rows, the summary always shows its
              details (no toggle), and the chart fills what's left. Nothing changes height, so
              rotating or unfolding lays out the same as opening the screen fresh. */}
          <View style={wide ? [styles.columns, styles.stretch] : styles.stack}>
            <View style={[styles.stack, wide && styles.mainCol]}>
              <HeroCard history={history} year={year} alwaysOpen={wide} />
              <Card style={wide && styles.grow}>{chartView(wide ? 'fill' : CHART_HEIGHT)}</Card>
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
    </>
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
  grow: { flex: 1, minHeight: 200 },
});
