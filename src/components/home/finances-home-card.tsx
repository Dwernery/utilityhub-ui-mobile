import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { accents, colors, spacing, tabularNums, type } from '@/constants/theme';
import { ROOMY_BREAKPOINT, useIsWide } from '@/hooks/use-is-wide';
import { useNetWorthHistory, useTransactions } from '@/lib/finance/hooks';
import {
  financeHomeSummary,
  dollarFormat,
  signedPercent,
  type AccountChange,
  type FinanceHomeSummary,
} from '@/lib/finance/utils/homeSummary';

import { CardDivider, CardError, CardSkeleton, MetricRow, RefreshNotice, SectionLabel } from './parts';

const toneOf = (n: number | null) => (n == null || n === 0 ? colors.secondaryLabel : n > 0 ? colors.positive : colors.negative);

const monthName = (offset = 0) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleString('en-US', { month: 'long' });
};

type Fmt = ReturnType<typeof dollarFormat>;

function AccountRow({ account, fmt }: { account: AccountChange; fmt: Fmt }) {
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
            ({signedPercent(percentChange)})
          </Text>
        )}
      </View>
    </View>
  );
}

/** Three placeholder figures while the projected row waits for transactions. */
function MetricRowSkeleton() {
  return (
    <View style={styles.skeletonRow} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCell}>
          <Skeleton width={64} height={17} />
          <Skeleton width={44} height={10} />
        </View>
      ))}
    </View>
  );
}

/** Current and Projected rows. Projected waits for transactions and shows dashes if they failed. */
function Summary({ s, fmt, projected }: { s: FinanceHomeSummary; fmt: Fmt; projected: 'pending' | 'failed' | 'ready' }) {
  const projectedDelta = s.projectedNetWorth - s.netWorth;
  return (
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
      {projected === 'pending' ? (
        <MetricRowSkeleton />
      ) : (
        <MetricRow
          metrics={
            projected === 'failed'
              ? [
                  { value: '—', label: 'Net Worth', tint: colors.secondaryLabel },
                  { value: '—', label: 'Change $', tint: colors.secondaryLabel },
                  { value: '—', label: 'Change %', tint: colors.secondaryLabel },
                ]
              : [
                  { value: fmt.plain(s.projectedNetWorth), label: 'Net Worth' },
                  { value: fmt.signed(projectedDelta), label: 'Change $', tint: toneOf(projectedDelta || 1) },
                  {
                    value: signedPercent(s.projectedPercentChange),
                    label: 'Change %',
                    tint: toneOf(s.projectedPercentChange || 1),
                  },
                ]
          }
        />
      )}
    </>
  );
}

function AccountList({ accounts, fmt }: { accounts: AccountChange[]; fmt: Fmt }) {
  return (
    <View>
      {accounts.map((a, i) => (
        <View key={a.accountId}>
          {i > 0 && <View style={styles.rowSeparator} />}
          <AccountRow account={a} fmt={fmt} />
        </View>
      ))}
    </View>
  );
}

/**
 * Net worth snapshot (no graph; that lives on the Finances dashboard). Whole-dollar amounts at
 * phone width, like the web card; full cents in the wide layout.
 */
export function FinancesHomeCard() {
  const history = useNetWorthHistory();
  const transactions = useTransactions();
  const s = useMemo(() => financeHomeSummary(history.data, transactions.data), [history.data, transactions.data]);
  // Whole dollars only where three columns are tight (folded phone); cents with room (unfolded, iPad).
  const fmt = dollarFormat(useIsWide(ROOMY_BREAKPOINT));
  const wide = useIsWide();

  // Projected needs the unpaid transactions: hold it back until they load.
  const projected = transactions.isPending ? 'pending' : transactions.isLoadingError ? 'failed' : 'ready';
  const retryAll = () => {
    void history.refetch();
    void transactions.refetch();
  };
  const retrying = history.isFetching || transactions.isFetching;
  const notice =
    projected === 'failed' ? (
      <RefreshNotice message="Couldn’t load transactions, so Projected is missing." onRetry={retryAll} retrying={retrying} />
    ) : history.isRefetchError || transactions.isRefetchError ? (
      <RefreshNotice onRetry={retryAll} retrying={retrying} />
    ) : null;

  return (
    <Card>
      <CardHeader title="Finances" icon="dollarsign.circle" tint={accents.finances as string} />
      {history.isPending ? (
        <CardSkeleton tall />
      ) : history.isLoadingError ? (
        <CardError what="finances" error={history.error} onRetry={history.refetch} />
      ) : (
        <View style={styles.body}>
          {notice}
          {wide ? (
            // Wide: summary on the left, accounts on the right, so the 3-column list isn't stretched.
            <View style={styles.split}>
              <View style={styles.half}>
                <Summary s={s} fmt={fmt} projected={projected} />
              </View>
              {s.accountChanges.length > 0 && (
                <>
                  <View style={styles.splitDivider} />
                  <View style={styles.half}>
                    <SectionLabel icon="building.columns">Accounts</SectionLabel>
                    <AccountList accounts={s.accountChanges} fmt={fmt} />
                  </View>
                </>
              )}
            </View>
          ) : (
            <>
              <Summary s={s} fmt={fmt} projected={projected} />
              {s.accountChanges.length > 0 && (
                <>
                  <CardDivider />
                  <AccountList accounts={s.accountChanges} fmt={fmt} />
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
  skeletonRow: { flexDirection: 'row' },
  skeletonCell: { flex: 1, alignItems: 'center', gap: 4 },
});
