import { Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useMemo } from 'react';
import { ActionSheetIOS, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { haptics } from '@/lib/haptics';
import {
  useAccounts,
  useCopyPreviousMonthBalances,
  useCreateAccount,
  useNetWorthHistory,
  useRemoveAccountBalance,
  useSetAccountBalance,
} from '@/lib/finance/hooks';
import type { Account, AccountCategory } from '@/lib/finance/types';
import { Currencyformatter, parseMoney } from '@/lib/finance/utils/currency';
import { MONTH_LABELS } from '@/lib/finance/utils/metrics';
import { addableAccounts } from '@/lib/finance/utils/accounts';
import { ASSET_TYPES, copyResultMessage, monthAccounts, previousMonthToCopy } from '@/lib/finance/utils/monthly';
import { parseMonthKey } from '@/lib/routeParams';

const fmt = (n: number) => Currencyformatter.format(n);

type Row = ReturnType<typeof monthAccounts>['assets'][number];

const SECTION = {
  ASSET: { title: 'Assets', icon: 'chart.line.uptrend.xyaxis', tint: colors.positive, glyph: 'wallet.bifold', newName: 'e.g. My Crypto Wallet' },
  LIABILITY: { title: 'Liabilities', icon: 'chart.line.downtrend.xyaxis', tint: colors.negative, glyph: 'creditcard', newName: 'e.g. Personal Loan' },
} as const satisfies Record<AccountCategory, { title: string; icon: SFSymbol; tint: unknown; glyph: SFSymbol; newName: string }>;

/** iOS text prompt with a decimal keypad; resolves the typed text, or null if cancelled. */
function promptAmount(title: string, message: string | undefined, initial = ''): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.prompt(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Save', onPress: (v?: string) => resolve(v ?? '') },
      ],
      'plain-text',
      initial,
      'decimal-pad',
    );
  });
}

function promptText(title: string, message: string | undefined, placeholder = ''): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.prompt(
      title,
      message ?? placeholder,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Next', onPress: (v?: string) => resolve((v ?? '').trim()) },
      ],
      'plain-text',
    );
  });
}

function actionSheet(
  title: string,
  options: string[],
  { destructiveIndex, message }: { destructiveIndex?: number; message?: string } = {},
): Promise<number | null> {
  return new Promise((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, message, options: [...options, 'Cancel'], cancelButtonIndex: options.length, destructiveButtonIndex: destructiveIndex },
      (i) => resolve(i === options.length ? null : i),
    );
  });
}

/** One month's account balances (ported from the web MonthlyDetailModal). */
export default function MonthDetail() {
  const month = parseMonthKey(useLocalSearchParams<{ key: string }>().key);

  // Validate the URL before any data hooks run: a bad deep link gets a clear message,
  // not a sheet titled "undefined NaN" that sends requests for "garbage-01".
  if (!month) {
    return (
      <>
        <Stack.Screen options={{ title: 'Month' }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>This month doesn’t exist.</Text>
        </View>
      </>
    );
  }
  return <MonthSheet year={month.year} month={month.month} />;
}

function MonthSheet({ year, month: monthNumber }: { year: number; month: number }) {
  const date = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
  const title = `${MONTH_LABELS[monthNumber - 1]} ${year}`;

  const { data: history } = useNetWorthHistory();
  const accounts = useAccounts();
  const setBalance = useSetAccountBalance();
  const removeBalance = useRemoveAccountBalance();
  const createAccount = useCreateAccount();
  const addToast = useToast();
  const copyPrevious = useCopyPreviousMonthBalances();
  const busy = setBalance.isPending || removeBalance.isPending || createAccount.isPending || copyPrevious.isPending;

  const month = useMemo(() => monthAccounts(history, date), [history, date]);
  const accountById = new Map((accounts.data ?? []).map((a) => [a.id, a]));

  // Offered only on an empty month whose previous month has balances.
  const copySource = month.hasData ? null : previousMonthToCopy(history, date);
  const onCopyPrevious = () => {
    haptics.tap();
    copyPrevious.mutate(date, {
      onSuccess: (result) => {
        if (result.copied > 0) haptics.success();
        addToast(copyResultMessage(result), result.copied === 0 ? 'info' : 'success');
      },
      onError: (e) => addToast(e.message || "Failed to copy last month's balances", 'error'),
    });
  };

  const saveBalance = (accountId: number, accountName: string, balance: number, verb: string) =>
    setBalance.mutate(
      { accountId, date, balance },
      {
        onSuccess: () => addToast(`${accountName} ${verb}`, 'success'),
        onError: (e) => addToast(e.message || 'Failed to update balance', 'error'),
      },
    );

  const askBalance = async (name: string, initial = '') => {
    const text = await promptAmount(name, `Balance for ${title}`, initial);
    if (text === null) return null;
    // Balances may be negative (e.g. an overdrawn account), unlike transactions and income.
    const parsed = parseMoney(text, { allowNegative: true });
    if (!parsed.ok) {
      addToast(parsed.error, 'error');
      return null;
    }
    return parsed.value;
  };

  const onRow = async (row: Row) => {
    haptics.selection();
    const choice = await actionSheet(row.accountName, ['Edit Balance', 'Remove from Month'], { destructiveIndex: 1 });
    if (choice === 0) {
      const v = await askBalance(row.accountName, String(row.balance));
      if (v !== null) saveBalance(row.accountId, row.accountName, v, 'balance updated');
    } else if (choice === 1) {
      Alert.alert(`Delete ${row.accountName} from this month?`, undefined, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            removeBalance.mutate(
              { accountId: row.accountId, date },
              {
                onSuccess: () => addToast(`${row.accountName} removed from this month`, 'success'),
                onError: (e) => addToast(e.message || 'Failed to delete account', 'error'),
              },
            ),
        },
      ]);
    }
  };

  /**
   * `+` on a section: pick an existing account or create one. Like the web's add form, the list
   * says when accounts are still loading, failed to load (with Retry), or are all in this month
   * already, and New Account… stays available in every case.
   * `loaded` is the freshly fetched list after a Retry (the hook's value is from the last render).
   */
  const onAdd = async (category: AccountCategory, loaded?: Account[]) => {
    if (!loaded) haptics.selection();
    const list = loaded ?? accounts.data;
    const failed = !list && accounts.isError;
    const present = new Set([...month.assets, ...month.liabilities].map((row) => row.accountId));
    // Archived accounts aren't offered for new months.
    const available = addableAccounts(list ?? [], category, present);
    const message = !list
      ? failed
        ? `Couldn’t load accounts${accounts.error?.message ? `: ${accounts.error.message}` : ''}`
        : 'Loading accounts…'
      : available.length === 0
        ? 'All accounts are already in this month'
        : undefined;
    const options = [
      ...(failed ? ['Retry'] : []),
      ...available.map((a) => `${a.accountName} (${a.accountType})`),
      'New Account…',
    ];
    const choice = await actionSheet(`Add ${SECTION[category].title.slice(0, -1).toLowerCase()} for ${title}`, options, { message });
    if (choice === null) return;

    if (failed && choice === 0) {
      const result = await accounts.refetch();
      if (result.data) return onAdd(category, result.data);
      return addToast(result.error?.message || 'Couldn’t load accounts', 'error');
    }

    const index = failed ? choice - 1 : choice;
    if (index < available.length) {
      const account = available[index];
      const v = await askBalance(account.accountName);
      if (v !== null) saveBalance(account.id, account.accountName, v, 'added for this month');
      return;
    }

    // New account: name → type → balance (the web's "Create New" form, as native prompts)
    const name = await promptText('New Account', undefined, SECTION[category].newName);
    if (name === null) return;
    if (!name) return addToast('Please enter an account name', 'error');

    let accountType: string | null;
    if (category === 'ASSET') {
      const t = await actionSheet('Account Type', [...ASSET_TYPES]);
      accountType = t === null ? null : ASSET_TYPES[t];
    } else {
      accountType = await promptText('Account Type', 'e.g. Credit Card, Mortgage');
    }
    if (accountType === null) return; // cancelled
    if (!accountType) return addToast('Please enter an account type', 'error');

    const balance = await askBalance(name);
    if (balance === null) return;

    try {
      await createAccount.mutateAsync({
        accountName: name,
        accountType,
        category,
        initialBalance: { balance, date },
      });
      addToast(`${name} created and added for this month`, 'success');
    } catch (e) {
      addToast((e as Error).message || 'Failed to create account', 'error');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <SheetCloseButton />
      <ScreenScrollView sideInsets={false} contentContainerStyle={styles.content}>
        <View style={styles.header} accessible accessibilityLabel={`${title} net worth ${fmt(month.netWorth)}`}>
          <Text style={[type.footnote, { color: colors.secondaryLabel }]}>Net worth</Text>
          <Text style={[type.title1, tabularNums, { color: colors.emphasis }]} selectable>
            {fmt(month.netWorth)}
          </Text>
        </View>

        {!month.hasData && (
          <View style={styles.notice}>
            <SymbolView name="exclamationmark.circle.fill" size={20} tintColor={colors.notice} />
            <View style={{ flex: 1 }}>
              <Text style={[type.subheadline, { color: colors.label, fontWeight: '600' }]}>No data for this month yet</Text>
              <Text style={[type.footnote, { color: colors.secondaryLabel }]}>
                {copySource
                  ? `Start from ${copySource.label}’s balances and update what changed, or tap + on Assets or Liabilities.`
                  : `Tap + on Assets or Liabilities to add balances for ${title}.`}
              </Text>
              {copySource && (
                <Pressable
                  onPress={onCopyPrevious}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy, busy: copyPrevious.isPending }}
                  style={({ pressed }) => [styles.copyButton, (pressed || busy) && { opacity: 0.6 }]}>
                  <SymbolView name="doc.on.doc" size={13} weight="semibold" tintColor={colors.white} />
                  <Text style={[type.footnote, { color: colors.white, fontWeight: '600' }]}>
                    {copyPrevious.isPending ? 'Copying…' : `Copy from ${copySource.label}`}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {(['ASSET', 'LIABILITY'] as const).map((category) => {
          const cfg = SECTION[category];
          const rows = category === 'ASSET' ? month.assets : month.liabilities;
          return (
            <View key={category} style={{ gap: 6 }}>
              <View style={styles.sectionHeader}>
                <SymbolView name={cfg.icon} size={14} tintColor={cfg.tint} />
                <Text style={[styles.sectionTitle, { color: cfg.tint }]}>{cfg.title.toUpperCase()}</Text>
                <Pressable
                  onPress={() => onAdd(category)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Add to ${cfg.title.toLowerCase()}`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.addButton, { backgroundColor: cfg.tint }, (pressed || busy) && { opacity: 0.6 }]}>
                  <SymbolView name="plus" size={13} weight="bold" tintColor={colors.white} />
                </Pressable>
              </View>
              <View style={styles.group}>
                {rows.length === 0 ? (
                  <Text style={[type.subheadline, styles.emptyRow]}>None this month</Text>
                ) : (
                  rows.map((row, i) => {
                    // For liabilities a decrease is good, so the colors flip (as on the web).
                    const good = row.change === null ? null : category === 'ASSET' ? row.change >= 0 : row.change < 0;
                    const tone = good === null ? colors.secondaryLabel : good ? colors.positive : colors.negative;
                    return (
                      <Pressable
                        key={row.accountId}
                        onPress={() => onRow(row)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`${row.accountName}, ${row.accountType}, ${fmt(row.balance)}`}
                        accessibilityHint="Edit balance or remove"
                        style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && { backgroundColor: colors.fill }]}>
                        <SymbolView name={cfg.glyph} size={18} tintColor={cfg.tint} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[type.subheadline, { color: colors.label, fontWeight: '500' }]} numberOfLines={1}>
                            {row.accountName}
                          </Text>
                          <Text style={[type.caption1, { color: colors.secondaryLabel }]} numberOfLines={1}>
                            {row.accountType}
                            {accountById.get(row.accountId)?.archived ? ' · Archived' : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[type.subheadline, tabularNums, { color: colors.label, fontWeight: '700' }]}>{fmt(row.balance)}</Text>
                          {row.change !== null && (
                            <Text style={[type.caption1, tabularNums, { color: tone, fontWeight: '500' }]}>
                              {row.change >= 0 ? '+' : ''}
                              {fmt(row.change)} ({row.change >= 0 ? '+' : ''}
                              {(row.changePercent ?? 0).toFixed(1)}%)
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          );
        })}
      </ScreenScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.xl },
  header: { gap: 2 },
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.noticeBackground,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: accents.finances,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xs },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  addButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  group: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.secondaryGroupedBackground },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  emptyRow: { color: colors.tertiaryLabel, padding: spacing.lg },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
