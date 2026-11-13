import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FinanceSwitcher } from '@/components/finance/finance-switcher';
import { Card } from '@/components/ui/card';
import { BarChart, describeSeries } from '@/components/ui/charts';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { haptics } from '@/lib/haptics';
import { useIsWide } from '@/hooks/use-is-wide';
import { useIncomeSources } from '@/lib/finance/hooks';
import { Currencyformatter } from '@/lib/finance/utils/currency';
import { getIncomeYears, getIncomeYoY, getSourcesForYear, getYearTotal } from '@/lib/finance/utils/income';

const fmt = (n: number) => Currencyformatter.format(n);

export default function IncomeHistory() {
  const { data: sources, isPending, isError, error, refetch, isRefetching } = useIncomeSources();
  const addToast = useToast();
  const years = useMemo(() => getIncomeYears(sources), [sources]);
  // Years added with "+ Year" before they have any sources saved (web behavior; not persisted).
  const [manualYears, setManualYears] = useState<number[]>([]);
  const available = useMemo(() => [...new Set([...years, ...manualYears])].sort((a, b) => a - b), [years, manualYears]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const year = selectedYear ?? available.at(-1) ?? null;
  const wide = useIsWide();
  const yearTotals = years.map((y) => ({ label: String(y), value: getYearTotal(sources, y) }));

  const list = year ? getSourcesForYear(sources, year) : [];
  const total = year ? getYearTotal(sources, year) : 0;
  const { change, changePercent } = year ? getIncomeYoY(sources, year) : { change: 0, changePercent: 0 };
  const up = change >= 0;

  const addYear = () =>
    Alert.prompt(
      'Add Year',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (v?: string) => {
            const y = parseInt(v ?? '', 10);
            if (Number.isNaN(y) || String(y).length !== 4) return addToast('Please enter a valid 4-digit year', 'error');
            setManualYears((prev) => [...new Set([...prev, y])]);
            setSelectedYear(y);
          },
        },
      ],
      'plain-text',
      String(new Date().getFullYear() - 1),
      'number-pad',
    );

  const openSource = (id: string) => router.push({ pathname: '/finances/income/[id]', params: { id, year: String(year) } });

  return (
    <ScreenScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
      <FinanceSwitcher current="History" />

      {isPending ? (
        <ActivityIndicator style={styles.state} />
      ) : isError ? (
        <View style={styles.state}>
          <Text style={[type.subheadline, { color: colors.negative, textAlign: 'center' }]}>
            Failed to load income: {error?.message || 'Unknown error'}
          </Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={[type.headline, { color: accents.finances }]}>Retry</Text>
          </Pressable>
        </View>
      ) : !year ? (
        <Card>
          <View style={styles.state}>
            <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>No income history yet. Add a year to get started.</Text>
            <Pressable onPress={addYear} accessibilityRole="button" style={styles.primary}>
              <SymbolView name="plus" size={13} weight="bold" tintColor={colors.white} />
              <Text style={[type.headline, { color: colors.white }]}>Add Year</Text>
            </Pressable>
          </View>
        </Card>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.years}>
            {available.map((y) => {
              const active = y === year;
              return (
                <Pressable
                  key={y}
                  onPress={() => {
                    haptics.selection();
                    setSelectedYear(y);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.yearChip, active && styles.yearChipActive]}>
                  <Text style={[type.subheadline, tabularNums, { color: active ? colors.white : colors.label, fontWeight: '600' }]}>{y}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={addYear} accessibilityRole="button" accessibilityLabel="Add year" style={[styles.yearChip, styles.addChip]}>
              <SymbolView name="plus" size={12} weight="bold" tintColor={colors.secondaryLabel} />
              <Text style={[type.subheadline, { color: colors.secondaryLabel, fontWeight: '600' }]}>Year</Text>
            </Pressable>
          </ScrollView>

          {/* Wide: the year's sources beside an all-years total chart. */}
          <View style={wide ? styles.columns : undefined}>
            <View style={wide ? styles.mainCol : undefined}>
              <Card padded={false}>
                <View style={styles.cardHeader}>
                  <Text style={[type.title3, { color: colors.label, flex: 1 }]}>Income — {year}</Text>
                  <Pressable
                    onPress={() => openSource('new')}
                    accessibilityRole="button"
                    accessibilityLabel="Add income source"
                    style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}>
                    <SymbolView name="plus" size={13} weight="bold" tintColor={colors.white} />
                    <Text style={[type.footnote, { color: colors.white, fontWeight: '600' }]}>Add</Text>
                  </Pressable>
                </View>

                {list.length === 0 && (
                  <Text style={[type.subheadline, styles.empty]}>No income sources yet for {year}. Tap Add to get started.</Text>
                )}
                {list.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => openSource(String(s.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.name}, ${fmt(s.amount)}`}
                    accessibilityHint="Edit or delete"
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.fill }]}>
                    <Text style={[type.subheadline, { flex: 1, color: colors.label, fontWeight: '600' }]} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={[type.subheadline, tabularNums, { color: colors.positive, fontWeight: '700' }]}>{fmt(s.amount)}</Text>
                    <SymbolView name="chevron.right" size={11} weight="semibold" tintColor={colors.tertiaryLabel} />
                  </Pressable>
                ))}

                <View style={styles.totalRow}>
                  <Text style={[type.headline, { color: colors.label, flex: 1 }]}>Total</Text>
                  <Text style={[type.title3, tabularNums, { color: colors.positive }]}>{fmt(total)}</Text>
                </View>
                <View style={styles.yoyRow} accessible accessibilityLabel={`Versus ${year - 1}: ${up ? 'up' : 'down'} ${fmt(Math.abs(change))}`}>
                  <Text style={[type.footnote, { color: colors.secondaryLabel, flex: 1 }]}>vs {year - 1}</Text>
                  <SymbolView name={up ? 'arrow.up.right' : 'arrow.down.right'} size={12} weight="bold" tintColor={up ? colors.positive : colors.negative} />
                  <Text style={[type.subheadline, tabularNums, { color: up ? colors.positive : colors.negative, fontWeight: '600' }]}>
                    {up ? '+' : ''}
                    {fmt(change)} ({up ? '+' : '-'}
                    {Math.abs(changePercent).toFixed(1)}%)
                  </Text>
                </View>
              </Card>
            </View>
            {wide && yearTotals.length > 0 && (
              <View style={styles.sideCol}>
                <Card>
                  <Text style={[type.headline, { color: colors.label, marginBottom: spacing.md }]}>Income by year</Text>
                  <BarChart
                    data={yearTotals}
                    tint={accents.finances}
                    highlight={year != null ? String(year) : null}
                    height={240}
                    accessibilityLabel={`Income by year: ${describeSeries(yearTotals, fmt)}`}
                  />
                  <View style={styles.yearTotals}>
                    {yearTotals.map((t) => (
                      <View key={t.label} style={styles.yearTotalRow}>
                        <Text style={[type.subheadline, tabularNums, { color: t.label === String(year) ? colors.label : colors.secondaryLabel, fontWeight: '600' }]}>
                          {t.label}
                        </Text>
                        <Text style={[type.subheadline, tabularNums, { color: colors.positive, fontWeight: '600' }]}>{fmt(t.value)}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </View>
            )}
          </View>
        </>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: 48 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: accents.finances,
  },
  years: { gap: spacing.sm },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  mainCol: { flex: 1.3, minWidth: 0 },
  sideCol: { flex: 1, minWidth: 0 },
  yearTotals: { marginTop: spacing.md, gap: spacing.xs },
  yearTotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  yearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.secondaryGroupedBackground,
  },
  yearChipActive: { backgroundColor: accents.finances },
  addChip: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.separator, backgroundColor: 'transparent' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: accents.finances,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
  },
  yoyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.lg },
  empty: { color: colors.secondaryLabel, textAlign: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
