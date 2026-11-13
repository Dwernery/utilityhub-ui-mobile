import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardInset } from '@/hooks/use-keyboard-inset';

import { FormButtonRow, FormSection, FormTextField } from '@/components/ui/form';
import { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';
import { accents, colors, spacing } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useDeleteIncomeSource, useIncomeSources, useSaveIncomeSource } from '@/lib/finance/hooks';

/** Add (`id = new`, with `year`) or edit/delete an income source (the web's Income History modal). */
export default function IncomeSourceSheet() {
  const { id, year } = useLocalSearchParams<{ id: string; year?: string }>();
  const { data: sources = [] } = useIncomeSources();
  const existing = id !== 'new' ? sources.find((s) => String(s.id) === String(id)) : undefined;
  const yearNum = existing?.year ?? Number(year);

  return <Form key={existing?.id ?? 'new'} id={existing ? String(existing.id) : undefined} year={yearNum} initialName={existing?.name ?? ''} initialAmount={existing ? String(existing.amount) : ''} />;
}

function Form({ id, year, initialName, initialAmount }: { id?: string; year: number; initialName: string; initialAmount: string }) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const save = useSaveIncomeSource();
  const remove = useDeleteIncomeSource();
  const addToast = useToast();
  const [name, setName] = useState(initialName);
  const [amount, setAmount] = useState(initialAmount);
  const busy = save.isPending || remove.isPending;
  const dirty = name !== initialName || amount !== initialAmount;

  const onSave = () => {
    const value = parseFloat(amount);
    if (Number.isNaN(value)) return addToast('Please enter a valid amount', 'error');
    if (!name.trim()) return addToast('Please enter a source name', 'error');
    save.mutate(
      { id, year, name, amount: value },
      {
        onSuccess: () => {
          addToast(id ? 'Income source updated' : 'Income source added', 'success');
          router.back();
        },
        onError: (e) => addToast(e.message || 'Failed to save income source', 'error'),
      },
    );
  };

  const onDelete = () =>
    Alert.alert(`Delete ${initialName}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(id!, {
            onSuccess: () => {
              addToast(`${initialName} deleted`, 'success');
              router.back();
            },
            onError: (e) => addToast(e.message || 'Failed to delete income source', 'error'),
          }),
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit Income' : `Add Income · ${year}` }} />
      <FormSheetToolbar dirty={dirty} busy={busy} onSave={onSave} tint={accents.finances} />
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentInset={{ bottom: keyboardInset }}
        scrollIndicatorInsets={{ bottom: keyboardInset }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }]}>
        <FormSection>
          <FormTextField label="Source" value={name} onChangeText={setName} placeholder="e.g. Salary" autoFocus={!id} editable={!busy} />
          <FormTextField label="Amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" editable={!busy} />
        </FormSection>
        {id && (
          <FormSection>
            <FormButtonRow title="Delete Income Source" destructive onPress={onDelete} disabled={busy} />
          </FormSection>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
});
