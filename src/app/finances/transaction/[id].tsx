import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardInset } from '@/hooks/use-keyboard-inset';

import { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';
import { FormControlRow, FormSection, FormTextField } from '@/components/ui/form';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { haptics } from '@/lib/haptics';
import { useCreateTransaction, useDeleteTransaction, useTransactions, useUpdateTransaction } from '@/lib/finance/hooks';
import type { Transaction, TransactionType } from '@/lib/finance/types';
import { parseMoney } from '@/lib/finance/utils/currency';
import { parseIdParam } from '@/lib/routeParams';

/**
 * Add (`id = new`, with `type = INCOME | EXPENSE`) or edit/delete a transaction
 * (the web's inline add and edit forms).
 */
export default function TransactionSheet() {
  const params = useLocalSearchParams<{ id: string; type?: string }>();
  const { data: transactions = [] } = useTransactions();

  if (params.id === 'new') {
    const kind: TransactionType = params.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    return <AddForm kind={kind} />;
  }

  const id = parseIdParam(params.id);
  const t = transactions.find((x) => x.id === id);
  if (!t) {
    return (
      <>
        <Stack.Screen options={{ title: 'Transaction' }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>This transaction no longer exists.</Text>
        </View>
      </>
    );
  }
  return <EditForm key={t.id} t={t} />;
}

function FormScroll({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  return (
    <ScrollView
      style={styles.flex}
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: keyboardInset }}
      scrollIndicatorInsets={{ bottom: keyboardInset }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }]}>
      {children}
    </ScrollView>
  );
}

const tintFor = (kind: TransactionType) => (kind === 'INCOME' ? colors.positive : colors.negative);

function AddForm({ kind }: { kind: TransactionType }) {
  const create = useCreateTransaction();
  const addToast = useToast();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cash, setCash] = useState(false);
  const dirty = name !== '' || amount !== '' || cash;
  const label = kind === 'INCOME' ? 'Income' : 'Expense';

  const save = () => {
    if (!name.trim()) return addToast('Please enter a name', 'error');
    const parsed = parseMoney(amount);
    if (!parsed.ok) return addToast(parsed.error, 'error');
    create.mutate(
      { name: name.trim(), transactionType: kind, amount: parsed.value, cash },
      {
        onSuccess: () => {
          haptics.success();
          addToast(`${label} added`, 'success');
          router.back();
        },
        onError: (e) => addToast(e.message || `Failed to add ${label.toLowerCase()}`, 'error'),
      },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: `Add ${label}` }} />
      <FormSheetToolbar dirty={dirty} busy={create.isPending} onSave={save} tint={accents.finances} />
      <FormScroll>
        <FormSection footer="Cash items count toward Net Cash Flow.">
          <FormTextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder={kind === 'INCOME' ? 'e.g. Salary' : 'e.g. Rent'}
            maxLength={100}
            editable={!create.isPending}
          />
          <FormTextField
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={!create.isPending}
          />
          <FormControlRow label="Cash">
            <Switch value={cash} onValueChange={setCash} trackColor={{ true: tintFor(kind) as string }} disabled={create.isPending} />
          </FormControlRow>
        </FormSection>
      </FormScroll>
    </>
  );
}

function EditForm({ t }: { t: Transaction }) {
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const addToast = useToast();
  const [name, setName] = useState(t.name);
  const [amount, setAmount] = useState(String(t.amount));
  const [paid, setPaid] = useState(!!t.paid);
  const busy = update.isPending || remove.isPending;
  const dirty = name !== t.name || amount !== String(t.amount) || paid !== !!t.paid;

  const save = () => {
    const parsed = parseMoney(amount);
    if (!parsed.ok) return addToast(parsed.error, 'error');
    if (!name.trim()) return addToast('Please enter a transaction name', 'error');
    update.mutate(
      { id: t.id, name, amount: parsed.value, paid },
      {
        onSuccess: () => {
          addToast('Transaction updated successfully', 'success');
          router.back();
        },
        onError: (e) => addToast(e.message || 'Failed to update transaction', 'error'),
      },
    );
  };

  const onDelete = () =>
    Alert.alert(`Delete ${t.name}?`, "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(t.id, {
            onSuccess: () => {
              addToast(`${t.name} deleted`, 'success');
              router.back();
            },
            onError: (e) => addToast(e.message || 'Failed to delete transaction', 'error'),
          }),
      },
    ]);

  const income = t.transactionType === 'INCOME';

  return (
    <>
      <Stack.Screen options={{ title: income ? 'Edit Income' : 'Edit Expense' }} />
      <FormSheetToolbar
        dirty={dirty}
        busy={busy}
        onSave={save}
        tint={accents.finances}
        onDelete={onDelete}
        deleteLabel={income ? 'Delete income' : 'Delete expense'}
      />
      <FormScroll>
        <FormSection>
          <FormTextField label="Name" value={name} onChangeText={setName} placeholder="Transaction name" maxLength={100} editable={!busy} />
          <FormTextField label="Amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" editable={!busy} />
          <FormControlRow label="Paid">
            <Switch value={paid} onValueChange={setPaid} trackColor={{ true: tintFor(t.transactionType) as string }} disabled={busy} />
          </FormControlRow>
        </FormSection>
      </FormScroll>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
