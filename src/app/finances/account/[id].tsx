import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormControlRow, FormSection, FormTextField, FormValueRow } from '@/components/ui/form';
import { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { haptics } from '@/lib/haptics';
import { useAccounts, useUpdateAccount } from '@/lib/finance/hooks';
import type { Account } from '@/lib/finance/types';
import { assetTypeOptions } from '@/lib/finance/utils/accounts';
import { parseIdParam } from '@/lib/routeParams';

/**
 * Rename, retype or (un)archive one account (the web's AccountEditForm). The category can't change:
 * asset ↔ liability would rewrite every past month's net worth.
 */
export default function AccountSheet() {
  const id = parseIdParam(useLocalSearchParams<{ id: string }>().id);
  const { data: accounts = [], isPending } = useAccounts();
  const account = accounts.find((a) => a.id === id);

  if (!account) {
    return (
      <>
        <Stack.Screen options={{ title: 'Account' }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>
            {isPending ? 'Loading account…' : 'This account no longer exists.'}
          </Text>
        </View>
      </>
    );
  }
  return <Form key={account.id} account={account} />;
}

function Form({ account }: { account: Account }) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const update = useUpdateAccount();
  const addToast = useToast();
  const [name, setName] = useState(account.accountName);
  const [accountType, setAccountType] = useState(account.accountType);
  const [archived, setArchived] = useState(account.archived);
  const isAsset = account.category === 'ASSET';
  const busy = update.isPending;
  const dirty = name !== account.accountName || accountType !== account.accountType || archived !== account.archived;

  const chooseType = () => {
    const options = assetTypeOptions(account.accountType);
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Account Type', options: [...options, 'Cancel'], cancelButtonIndex: options.length },
      (i) => {
        if (i < options.length) {
          haptics.selection();
          setAccountType(options[i]);
        }
      },
    );
  };

  const save = () => {
    if (!name.trim()) return addToast('Please enter an account name', 'error');
    if (!accountType.trim()) return addToast('Please enter an account type', 'error');
    update.mutate(
      { id: account.id, accountName: name.trim(), accountType: accountType.trim(), archived },
      {
        onSuccess: () => {
          haptics.success();
          // Same wording as the web, which archives with its own button.
          const onlyArchiveChanged =
            archived !== account.archived && name.trim() === account.accountName && accountType.trim() === account.accountType;
          addToast(
            onlyArchiveChanged
              ? archived
                ? `${account.accountName} archived. Past months keep its balances.`
                : `${account.accountName} unarchived`
              : 'Account updated',
            'success',
          );
          router.back();
        },
        onError: (e) => addToast(e.message || 'Failed to update account', 'error'),
      },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Account' }} />
      <FormSheetToolbar dirty={dirty} busy={busy} onSave={save} tint={accents.finances} />
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentInset={{ bottom: keyboardInset }}
        scrollIndicatorInsets={{ bottom: keyboardInset }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }]}>
        <FormSection footer="The new name and type show in every month. Balances don’t change.">
          <FormTextField label="Name" value={name} onChangeText={setName} maxLength={50} editable={!busy} />
          {isAsset ? (
            <FormValueRow label="Type" value={accountType} disabled={busy} onPress={chooseType} />
          ) : (
            <FormTextField
              label="Type"
              value={accountType}
              onChangeText={setAccountType}
              placeholder="e.g. Credit Card, Mortgage"
              maxLength={50}
              editable={!busy}
            />
          )}
        </FormSection>
        <FormSection footer="Archived accounts aren’t offered for new months. Past months keep their balances.">
          <FormControlRow label="Archived">
            <Switch value={archived} onValueChange={setArchived} trackColor={{ true: accents.finances as string }} disabled={busy} />
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
