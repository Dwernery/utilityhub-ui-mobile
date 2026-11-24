import { router, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { FormSection, FormValueRow } from '@/components/ui/form';
import { LoadError } from '@/components/ui/load-error';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { SkeletonListGroup } from '@/components/ui/skeleton';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useAccounts } from '@/lib/finance/hooks';
import type { Account } from '@/lib/finance/types';
import { groupAccounts } from '@/lib/finance/utils/accounts';

/**
 * Every account, archived ones in their own section; tap one to rename, retype or (un)archive it.
 * Mirrors the web's AccountsModal.
 */
export default function Accounts() {
  const { data, isPending, isError, error, refetch } = useAccounts();
  const groups = groupAccounts(data);

  const rows = (list: Account[], archived = false) =>
    list.length === 0 ? (
      <Text key="none" style={[type.body, styles.none]}>
        None yet
      </Text>
    ) : (
      list.map((a) => (
        <FormValueRow
          key={a.id}
          label={a.accountName}
          value={archived ? `${a.accountType} · ${a.category === 'ASSET' ? 'Asset' : 'Liability'}` : a.accountType}
          onPress={() => router.push({ pathname: '/finances/account/[id]', params: { id: String(a.id) } })}
        />
      ))
    );

  return (
    <>
      <Stack.Screen options={{ title: 'Accounts' }} />
      <SheetCloseButton />
      <ScreenScrollView sideInsets={false} contentContainerStyle={styles.content}>
        {isPending ? (
          <>
            <SkeletonListGroup rows={4} cover={false} />
            <SkeletonListGroup rows={2} cover={false} />
          </>
        ) : isError ? (
          <LoadError what="accounts" error={error} onRetry={() => refetch()} tint={accents.finances} />
        ) : (
          <>
            <FormSection title="Assets">{rows(groups.assets)}</FormSection>
            <FormSection title="Liabilities">{rows(groups.liabilities)}</FormSection>
            {groups.archived.length > 0 && (
              <FormSection title="Archived" footer="Not offered for new months. Past months keep their balances.">
                {rows(groups.archived, true)}
              </FormSection>
            )}
          </>
        )}
      </ScreenScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.xl },
  none: { color: colors.tertiaryLabel, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
