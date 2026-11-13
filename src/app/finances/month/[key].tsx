import { Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useMemo } from 'react';
import { ActionSheetIOS, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { haptics } from '@/lib/haptics';
import {
  useAccounts,
  useCreateAccount,
  useNetWorthHistory,
  useRemoveAccountBalance,
  useSetAccountBalance,
} from '@/lib/finance/hooks';
import type { Account, AccountBalance, AccountCategory } from '@/lib/finance/types';
import { Currencyformatter } from '@/lib/finance/utils/currency';
import { MONTH_LABELS } from '@/lib/finance/utils/metrics';
import { ASSET_TYPES, monthAccounts } from '@/lib/finance/utils/monthly';

const fmt = (n: number) => Currencyformatter.format(n);
const accountId = (a: { id?: string; accountId?: string }) => String(a.id || a.accountId);

type Row = ReturnType<typeof monthAccounts>['assets'][number];

const SECTION = {
  ASSET: { title: 'Assets', icon: 'chart.line.uptrend.xyaxis', tint: colors.positive, glyph: 'wallet.bifold', newName: 'e.g. My Crypto Wallet' },
  LIABILITY: { title: 'Liabilities', icon: 'chart.line.downtrend.xyaxis', tint: colors.negative, glyph: 'creditcard', newName: 'e.g. Personal Loan' },
} as const satisfies Record<AccountCategory, { title: string; icon: SFSymbol; tint: unknown; glyph: SFSymbol; newName: string }>;

/** iOS text prompt with a decimal keypad; resolves the parsed number, or null if cancelled/invalid. */
function promptAmount(title: string, message: string | undefined, initial = ''): Promise<number | null> {
  return new Promise((resolve) => {
    Alert.prompt(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Save', onPress: (v?: string) => resolve(v == null || v.trim() === '' ? NaN : parseFloat(v)) },
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

function actionSheet(title: string, options: string[], destructiveIndex?: number): Promise<number | null> {
  return new Promise((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [...options, 'Cancel'], cancelButtonIndex: options.length, destructiveButtonIndex: destructiveIndex },
      (i) => resolve(i === options.length ? null : i),
    );
  });
}

/** One month's account balances (ported from the web MonthlyDetailModal). */
export default function MonthDetail() {
  const { key = '' } = useLocalSearchParams<{ key: string }>();
  const date = `${key}-01`;
  const [y, m] = key.split('-').map(Number);
  const title = `${MONTH_LABELS[(m || 1) - 1]} ${y}`;

  const { data: history } = useNetWorthHistory();
  const { data: allAccounts = [] } = useAccounts();
  const setBalance = useSetAccountBalance();
  const removeBalance = useRemoveAccountBalance();
  const createAccount = useCreateAccount();
  const addToast = useToast();
  const busy = setBalance.isPending || removeBalance.isPending || createAccount.isPending;

  const month = useMemo(() => monthAccounts(history, date), [history, date]);

  const saveBalance = (account: Pick<AccountBalance, 'accountName'> & { id?: string; accountId?: string }, balance: number, verb: string) =>
    setBalance.mutate(
      { accountId: accountId(account), date, balance },
      {
        onSuccess: () => addToast(`${account.accountName} ${verb}`, 'success'),
        onError: (e) => addToast(e.message || 'Failed to update balance', 'error'),
      },
    );

  const askBalance = async (name: string, initial = '') => {
    const v = await promptAmount(name, `Balance for ${title}`, initial);
    if (v === null) return null;
    if (Number.isNaN(v)) {
      addToast('Please enter a valid number', 'error');
      return null;
    }
    return v;
  };

  const onRow = async (row: Row) => {
    haptics.selection();
    const choice = await actionSheet(row.accountName, ['Edit Balance', 'Remove from Month'], 1);
    if (choice === 0) {
      const v = await askBalance(row.accountName, String(row.balance));
      if (v !== null) saveBalance(row, v, 'balance updated');
    } else if (choice === 1) {
      Alert.alert(`Delete ${row.accountName} from this month?`, undefined, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            removeBalance.mutate(
              { accountId: accountId(row), date },
              {
                onSuccess: () => addToast(`${row.accountName} removed from this month`, 'success'),
                onError: (e) => addToast(e.message || 'Failed to delete account', 'error'),
              },
            ),
        },
      ]);
    }
  };

  const onAdd = async (category: AccountCategory) => {
    haptics.selection();
    const present = new Set([...month.assets, ...month.liabilities].map(accountId));
    const available = allAccounts.filter((a) => a.category === category && !present.has(accountId(a)));
    const choice = await actionSheet(
      `Add ${SECTION[category].title.slice(0, -1).toLowerCase()} for ${title}`,
      [...available.map((a) => `${a.accountName} (${a.accountType})`), 'New Account…'],
    );
    if (choice === null) return;

    if (choice < available.length) {
      const account = available[choice];
      const v = await askBalance(account.accountName);
      if (v !== null) saveBalance(account, v, 'added for this month');
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
    if (!accountType) return;

    const balance = await askBalance(name);
    if (balance === null) return;

    try {
      const created: Account = await createAccount.mutateAsync({ name, type: accountType, category });
      await setBalance.mutateAsync({ accountId: accountId(created), date, balance });
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
          <Text style={[type.title1, tabularNums, { color: '#1d4ed8' }]} selectable>
            {fmt(month.netWorth)}
          </Text>
        </View>

        {!month.hasData && (
          <View style={styles.notice}>
            <SymbolView name="exclamationmark.circle.fill" size={20} tintColor="#ca8a04" />
            <View style={{ flex: 1 }}>
              <Text style={[type.subheadline, { color: colors.label, fontWeight: '600' }]}>No data for this month yet</Text>
              <Text style={[type.footnote, { color: colors.secondaryLabel }]}>
                Use + on Assets or Liabilities to add balances for {title}.
              </Text>
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
                  accessibilityLabel={`Add ${cfg.title.toLowerCase()}`}
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
                        key={accountId(row)}
                        onPress={() => onRow(row)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`${row.accountName}, ${row.accountType}, ${fmt(row.balance)}`}
                        accessibilityHint="Edit or remove"
                        style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && { backgroundColor: colors.fill }]}>
                        <SymbolView name={cfg.glyph} size={18} tintColor={cfg.tint} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[type.subheadline, { color: colors.label, fontWeight: '500' }]} numberOfLines={1}>
                            {row.accountName}
                          </Text>
                          <Text style={[type.caption1, { color: colors.secondaryLabel }]} numberOfLines={1}>
                            {row.accountType}
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
    backgroundColor: 'rgba(250, 204, 21, 0.14)',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xs },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  addButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  group: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.secondaryGroupedBackground },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  emptyRow: { color: colors.tertiaryLabel, padding: spacing.lg },
});
