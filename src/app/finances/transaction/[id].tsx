import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardInset } from '@/hooks/use-keyboard-inset';

import { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';
import { FormControlRow, FormSection, FormTextField } from '@/components/ui/form';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useTransactions, useUpdateTransaction } from '@/lib/finance/hooks';
import type { Transaction } from '@/lib/finance/types';

/** Edit a transaction's name, amount and paid flag (the web's inline edit form). */
export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transactions = [] } = useTransactions();
  const t = transactions.find((x) => String(x.id) === String(id));

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
  return <Form key={t.id} t={t} />;
}

function Form({ t }: { t: Transaction }) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const update = useUpdateTransaction();
  const addToast = useToast();
  const [name, setName] = useState(t.name);
  const [amount, setAmount] = useState(String(t.amount));
  const [paid, setPaid] = useState(!!t.paid);
  const dirty = name !== t.name || amount !== String(t.amount) || paid !== !!t.paid;

  const save = () => {
    const value = parseFloat(amount);
    if (Number.isNaN(value)) return addToast('Please enter a valid amount', 'error');
    if (!name.trim()) return addToast('Please enter a transaction name', 'error');
    update.mutate(
      { id: t.id, name, amount: value, paid },
      {
        onSuccess: () => {
          addToast('Transaction updated successfully', 'success');
          router.back();
        },
        onError: (e) => addToast(e.message || 'Failed to update transaction', 'error'),
      },
    );
  };

  const tint = t.transactionType === 'INCOME' ? colors.positive : colors.negative;

  return (
    <>
      <Stack.Screen options={{ title: t.transactionType === 'INCOME' ? 'Edit Income' : 'Edit Expense' }} />
      <FormSheetToolbar dirty={dirty} busy={update.isPending} onSave={save} tint={accents.finances} />
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentInset={{ bottom: keyboardInset }}
        scrollIndicatorInsets={{ bottom: keyboardInset }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }]}>
        <FormSection>
          <FormTextField label="Name" value={name} onChangeText={setName} placeholder="Transaction name" autoFocus editable={!update.isPending} />
          <FormTextField
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={!update.isPending}
          />
          <FormControlRow label="Paid">
            <Switch value={paid} onValueChange={setPaid} trackColor={{ true: tint as string }} disabled={update.isPending} />
          </FormControlRow>
        </FormSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
