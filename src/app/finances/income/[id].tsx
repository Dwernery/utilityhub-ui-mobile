import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardInset } from '@/hooks/use-keyboard-inset';

import { FormSection, FormTextField } from '@/components/ui/form';
import { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useDeleteIncomeSource, useIncomeSources, useSaveIncomeSource } from '@/lib/finance/hooks';
import { parseMoney } from '@/lib/finance/utils/currency';
import { parseIdParam } from '@/lib/routeParams';

/** A 4-digit year from a route param, or undefined (same rule as the "Add Year" prompt). */
const parseYearParam = (value: string | undefined) => (value && /^\d{4}$/.test(value) ? Number(value) : undefined);

/** Add (`id = new`, with `year`) or edit/delete an income source (the web's Income History modal). */
export default function IncomeSourceSheet() {
  const params = useLocalSearchParams<{ id: string; year?: string }>();
  const { data: sources = [] } = useIncomeSources();

  if (params.id === 'new') {
    const year = parseYearParam(params.year);
    if (year === undefined) return <Missing message="This year isn’t valid." />;
    return <Form key="new" year={year} initialName="" initialAmount="" />;
  }

  // Anything else must name a source that exists. A deleted source or a bad link gets a
  // message, not an "Add Income · NaN" form that would save a source with no year.
  const id = parseIdParam(params.id);
  const existing = sources.find((s) => s.id === id);
  if (!existing) return <Missing message="This income source no longer exists." />;
  return <Form key={existing.id} id={existing.id} year={existing.year} initialName={existing.name} initialAmount={String(existing.amount)} />;
}

function Missing({ message }: { message: string }) {
  return (
    <>
      <Stack.Screen options={{ title: 'Income' }} />
      <SheetCloseButton />
      <View style={styles.missing}>
        <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>{message}</Text>
      </View>
    </>
  );
}

function Form({ id, year, initialName, initialAmount }: { id?: number; year: number; initialName: string; initialAmount: string }) {
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
    const parsed = parseMoney(amount);
    if (!parsed.ok) return addToast(parsed.error, 'error');
    if (!name.trim()) return addToast('Please enter a source name', 'error');
    save.mutate(
      { id, year, name, amount: parsed.value },
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
      <Stack.Screen options={{ title: id ? 'Edit Income Source' : `Add Income Source — ${year}` }} />
      <FormSheetToolbar
        dirty={dirty}
        busy={busy}
        onSave={onSave}
        tint={accents.finances}
        onDelete={id ? onDelete : undefined}
        deleteLabel="Delete income source"
      />
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentInset={{ bottom: keyboardInset }}
        scrollIndicatorInsets={{ bottom: keyboardInset }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }]}>
        <FormSection>
          <FormTextField label="Source" value={name} onChangeText={setName} placeholder="e.g. Base Salary" editable={!busy} />
          <FormTextField label="Amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" editable={!busy} />
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
