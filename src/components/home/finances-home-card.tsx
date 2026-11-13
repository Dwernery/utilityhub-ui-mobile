import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, CardHeader } from '@/components/ui/card';
import { accents, colors, spacing, tabularNums, type } from '@/constants/theme';
import { ROOMY_BREAKPOINT, useIsWide } from '@/hooks/use-is-wide';
import { useNetWorthHistory, useTransactions } from '@/lib/finance/hooks';
import {
  financeHomeSummary,
  dollarFormat,
  signedPercent,
  type AccountChange,
} from '@/lib/finance/utils/homeSummary';

import { CardDivider, CardError, CardSkeleton, MetricRow, SectionLabel } from './parts';

const toneOf = (n: number | null) => (n == null || n === 0 ? colors.secondaryLabel : n > 0 ? colors.positive : colors.negative);

const monthName = (offset = 0) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleString('en-US', { month: 'long' });
};

function AccountRow({ account, fmt }: { account: AccountChange; fmt: ReturnType<typeof dollarFormat> }) {
  const { change, percentChange } = account;
  const hasChange = change !== null && change !== 0;
  return (
    <View
      style={styles.accountRow}
      accessible
      accessibilityLabel={`${account.accountName}: ${fmt.plain(account.balance || 0)}${
        hasChange ? `, ${fmt.signed(change!)} this month` : ''
      }`}>
      <Text style={[type.subheadline, styles.accountName]} numberOfLines={1}>
        {account.accountName || 'Unknown'}
      </Text>
      <Text style={[type.subheadline, tabularNums, styles.balance]} numberOfLines={1}>
        {fmt.plain(account.balance || 0)}
      </Text>
      <View style={styles.changeCell}>
        <Text style={[type.subheadline, tabularNums, { color: toneOf(change), fontWeight: '600' }]} numberOfLines={1}>
          {hasChange ? fmt.signed(change!) : '—'}
        </Text>
        {percentChange !== null && percentChange !== 0 && (
          <Text style={[type.caption1, tabularNums, { color: toneOf(percentChange), fontWeight: '600' }]}>
            {signedPercent(percentChange)}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * Net worth snapshot (no graph; that lives on the Finances dashboard). Whole-dollar amounts at
 * phone width, like the web card; full cents in the wide layout.
 */
export function FinancesHomeCard() {
  const history = useNetWorthHistory();
  const { data: transactions } = useTransactions();
  const s = useMemo(() => financeHomeSummary(history.data, transactions), [history.data, transactions]);
  const projectedDelta = s.projectedNetWorth - s.netWorth;
  // Whole dollars only where three columns are tight (folded phone); cents with room (unfolded, iPad).
  const fmt = dollarFormat(useIsWide(ROOMY_BREAKPOINT));
  const wide = useIsWide();

  return (
    <Card>
      <CardHeader title="Finances" icon="dollarsign.circle" tint={accents.finances as string} />
      {history.isPending ? (
        <CardSkeleton tall />
      ) : history.isError ? (
        <CardError what="finances data" error={history.error} onRetry={history.refetch} />
      ) : (
        <View style={styles.body}>
          {wide ? (
            // Wide: summary on the left, accounts on the right, so the 3-column list isn't stretched.
            <View style={styles.split}>
              <View style={styles.half}>
                <SectionLabel icon="calendar">Current ({monthName(-1)})</SectionLabel>
                <MetricRow
                  metrics={[
                    { value: fmt.plain(s.netWorth), label: 'Net Worth' },
                    { value: fmt.signed(s.dollarChange), label: 'Change $', tint: toneOf(s.dollarChange || 1) },
                    { value: signedPercent(s.percentChange), label: 'Change %', tint: toneOf(s.percentChange || 1) },
                  ]}
                />
                <CardDivider />
                <SectionLabel icon="calendar.badge.clock">Projected ({monthName(0)})</SectionLabel>
                <MetricRow
                  metrics={[
                    { value: fmt.plain(s.projectedNetWorth), label: 'Net Worth' },
                    { value: fmt.signed(projectedDelta), label: 'Change $', tint: toneOf(projectedDelta || 1) },
                    {
                      value: signedPercent(s.projectedPercentChange),
                      label: 'Change %',
                      tint: toneOf(s.projectedPercentChange || 1),
                    },
                  ]}
                />
              </View>
              {s.accountChanges.length > 0 && (
                <>
                  <View style={styles.splitDivider} />
                  <View style={styles.half}>
                    <SectionLabel icon="building.columns">Accounts</SectionLabel>
                    <View>
                      {s.accountChanges.map((a, i) => (
                        <View key={a.id || a.accountId}>
                          {i > 0 && <View style={styles.rowSeparator} />}
                          <AccountRow account={a} fmt={fmt} />
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          ) : (
            <>
              <SectionLabel icon="calendar">Current ({monthName(-1)})</SectionLabel>
              <MetricRow
                metrics={[
                  { value: fmt.plain(s.netWorth), label: 'Net Worth' },
                  { value: fmt.signed(s.dollarChange), label: 'Change $', tint: toneOf(s.dollarChange || 1) },
                  { value: signedPercent(s.percentChange), label: 'Change %', tint: toneOf(s.percentChange || 1) },
                ]}
              />
              <CardDivider />
              <SectionLabel icon="calendar.badge.clock">Projected ({monthName(0)})</SectionLabel>
              <MetricRow
                metrics={[
                  { value: fmt.plain(s.projectedNetWorth), label: 'Net Worth' },
                  { value: fmt.signed(projectedDelta), label: 'Change $', tint: toneOf(projectedDelta || 1) },
                  {
                    value: signedPercent(s.projectedPercentChange),
                    label: 'Change %',
                    tint: toneOf(s.projectedPercentChange || 1),
                  },
                ]}
              />
              {s.accountChanges.length > 0 && (
                <>
                  <CardDivider />
                  <View>
                    {s.accountChanges.map((a, i) => (
                      <View key={a.id || a.accountId}>
                        {i > 0 && <View style={styles.rowSeparator} />}
                        <AccountRow account={a} fmt={fmt} />
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.lg },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  accountName: { flex: 0.9, color: colors.label },
  balance: { flex: 1, textAlign: 'right', color: colors.label, fontWeight: '600' },
  changeCell: { flex: 1.3, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 4 },
  split: { flexDirection: 'row', gap: spacing.xl },
  half: { flex: 1, minWidth: 0 },
  splitDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  rowSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
});
