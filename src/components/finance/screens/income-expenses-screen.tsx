import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { FinanceSwitcher } from '@/components/finance/finance-switcher';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { haptics } from '@/lib/haptics';
import { useIsWide } from '@/hooks/use-is-wide';
import { useClearAllPaid, useTransactions, useUpdateTransaction } from '@/lib/finance/hooks';
import type { Transaction, TransactionType } from '@/lib/finance/types';
import { Currencyformatter } from '@/lib/finance/utils/currency';
import { transactionTotals } from '@/lib/finance/utils/monthly';

const fmt = (n: number) => Currencyformatter.format(n);
type PaidFilter = 'ALL' | 'PAID' | 'UNPAID';
const FILTERS: { key: PaidFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'Paid' },
  { key: 'UNPAID', label: 'Unpaid' },
];

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.tile, { backgroundImage: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }]} accessible accessibilityLabel={`${label}: ${fmt(value)}`}>
      <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.tileValue, tabularNums]} numberOfLines={1} adjustsFontSizeToFit>
        {fmt(value)}
      </Text>
    </View>
  );
}

function TransactionRow({ t, first, onTogglePaid, busy }: { t: Transaction; first: boolean; onTogglePaid: () => void; busy: boolean }) {
  const income = t.transactionType === 'INCOME';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/finances/transaction/[id]', params: { id: String(t.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`${t.name}, ${fmt(t.amount)}${t.paid ? ', paid' : ''}`}
      accessibilityHint="Edit transaction"
      style={({ pressed }) => [styles.row, !first && styles.rowBorder, pressed && { backgroundColor: colors.fill }]}>
      <Pressable
        onPress={onTogglePaid}
        disabled={busy}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: t.paid, disabled: busy }}
        accessibilityLabel={`${t.name} paid`}>
        <SymbolView
          name={t.paid ? 'checkmark.circle.fill' : 'circle'}
          size={22}
          tintColor={t.paid ? (income ? colors.positive : colors.negative) : colors.tertiaryLabel}
        />
      </Pressable>
      <Text style={[type.subheadline, styles.name, t.paid && styles.paidName]} numberOfLines={2}>
        {t.name}
      </Text>
      <Text style={[type.subheadline, tabularNums, { color: income ? colors.positive : colors.negative, fontWeight: '700' }]}>
        {fmt(t.amount)}
      </Text>
      <SymbolView name="chevron.right" size={11} weight="semibold" tintColor={colors.tertiaryLabel} />
    </Pressable>
  );
}

export default function IncomeExpenses() {
  const { data: transactions = [], isPending, isError, error, refetch, isRefetching } = useTransactions();
  const update = useUpdateTransaction();
  const clearPaid = useClearAllPaid();
  const addToast = useToast();
  const [filter, setFilter] = useState<PaidFilter>('ALL');
  const wide = useIsWide();

  const filtered = transactions.filter((t) => (filter === 'PAID' ? t.paid : filter === 'UNPAID' ? !t.paid : true));
  const totals = transactionTotals(filtered);
  const positive = totals.netIncome >= 0;

  const togglePaid = (t: Transaction) => {
    haptics.tap();
    update.mutate(
      { id: t.id, name: t.name, amount: t.amount, paid: !t.paid },
      { onError: (e) => addToast(e.message || 'Failed to update transaction', 'error') },
    );
  };

  const confirmClear = () =>
    Alert.alert('Clear paid status from all income and expense transactions?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All Paid',
        style: 'destructive',
        onPress: () =>
          clearPaid.mutate(undefined, {
            onSuccess: () => addToast('Cleared paid status from all transactions', 'success'),
            onError: (e) => addToast(e.message || 'Failed to clear paid status', 'error'),
          }),
      },
    ]);

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis.circle" accessibilityLabel="More">
          <Stack.Toolbar.MenuAction icon="xmark.circle" destructive onPress={confirmClear}>
            Clear All Paid
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
        <FinanceSwitcher current="Expenses" />

        {isPending ? (
          <ActivityIndicator style={styles.state} />
        ) : isError ? (
          <View style={styles.state}>
            <Text style={[type.subheadline, { color: colors.negative, textAlign: 'center' }]}>
              Failed to load transactions: {error?.message || 'Unknown error'}
            </Text>
            <Pressable onPress={() => refetch()} accessibilityRole="button">
              <Text style={[type.headline, { color: accents.finances }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.tiles, wide && styles.tileRow]}>
              <View style={[styles.tileRow, wide && styles.flex]}>
                <Tile label="Total Income" value={totals.income} color="#10b981" />
                <Tile label="Total Expenses" value={totals.expenses} color="#f43f5e" />
              </View>
              <View style={[styles.tileRow, wide && styles.flex]}>
                <Tile label="Net Cash Flow" value={totals.netCashFlow} color={positive ? '#3b82f6' : '#f97316'} />
                <Tile label="Net Income" value={totals.netIncome} color={positive ? '#3b82f6' : '#f97316'} />
              </View>
            </View>

            <SegmentedControl
              values={FILTERS.map((f) => f.label)}
              selectedIndex={FILTERS.findIndex((f) => f.key === filter)}
              onChange={(e) => {
                const next = FILTERS[e.nativeEvent.selectedSegmentIndex]?.key;
                if (next && next !== filter) {
                  haptics.selection();
                  setFilter(next);
                }
              }}
              accessibilityLabel="Paid filter"
            />

            {/* Wide: Income and Expenses side by side, as on the web. */}
            <View style={wide ? styles.columns : styles.stack}>
              {(['INCOME', 'EXPENSE'] as TransactionType[]).map((dir) => {
                const list = filtered.filter((t) => t.transactionType === dir);
                const income = dir === 'INCOME';
                return (
                  <View key={dir} style={[{ gap: 6 }, wide && styles.flex]}>
                    <View style={styles.sectionHeader}>
                      <SymbolView
                        name={income ? 'chart.line.uptrend.xyaxis' : 'chart.line.downtrend.xyaxis'}
                        size={14}
                        tintColor={income ? colors.positive : colors.negative}
                      />
                      <Text style={[styles.sectionTitle, { color: income ? colors.positive : colors.negative }]}>
                        {income ? 'INCOME' : 'EXPENSES'}
                      </Text>
                    </View>
                    <View style={styles.group}>
                      {list.length === 0 ? (
                        <Text style={[type.subheadline, styles.empty]}>None</Text>
                      ) : (
                        list.map((t, i) => (
                          <TransactionRow
                            key={t.id}
                            t={t}
                            first={i === 0}
                            busy={update.isPending && update.variables?.id === t.id}
                            onTogglePaid={() => togglePaid(t)}
                          />
                        ))
                      )}
                    </View>
                  </View>
                );
              })}
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
  tiles: { gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  stack: { gap: spacing.lg },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  tileRow: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', alignItems: 'center', gap: 2 },
  tileLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600', letterSpacing: 0.6 },
  tileValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xs },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  group: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.secondaryGroupedBackground },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  name: { flex: 1, color: colors.label, fontWeight: '500' },
  paidName: { color: colors.secondaryLabel },
  empty: { color: colors.tertiaryLabel, padding: spacing.lg },
});
