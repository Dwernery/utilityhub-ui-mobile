import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ManageButton, ManageRow } from '@/components/courses/manage-list';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { colors, spacing, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useCourses, useCreators, useDeleteCreator, useRenameCreator } from '@/lib/courses/hooks';
import type { CourseCreator } from '@/lib/courses/types';
import { haptics } from '@/lib/haptics';

/**
 * Every creator with how many courses they have: rename one (every course shows the new
 * name), or delete one that no course uses. Like the web's Creators window.
 */
export default function Creators() {
  const { data: creators = [] } = useCreators();
  const { data: courses = [] } = useCourses();
  const renameCreator = useRenameCreator();
  const deleteCreator = useDeleteCreator();
  const addToast = useToast();
  const busy = renameCreator.isPending || deleteCreator.isPending;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of courses) m.set(c.creatorName, (m.get(c.creatorName) ?? 0) + 1);
    return m;
  }, [courses]);

  const rename = (creator: CourseCreator) =>
    Alert.prompt(
      'Rename Creator',
      'Every course by them shows the new name.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (text?: string) => {
            const name = (text ?? '').trim();
            if (!name || name === creator.name) return;
            renameCreator.mutate(
              { id: creator.id, name },
              {
                onSuccess: () => addToast(`Renamed to "${name}"`, 'success'),
                onError: (err) => addToast(err?.message || "Couldn't rename the creator", 'error'),
              },
            );
          },
        },
      ],
      'plain-text',
      creator.name,
    );

  const remove = (creator: CourseCreator) => {
    haptics.warning();
    Alert.alert(`Delete “${creator.name}”?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteCreator.mutate(creator.id, {
            onSuccess: () => addToast(`Deleted "${creator.name}"`, 'success'),
            onError: (err) => addToast(err?.message || "Couldn't delete the creator", 'error'),
          }),
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Creators' }} />
      <SheetCloseButton />
      <ScreenScrollView sideInsets={false} contentContainerStyle={styles.content}>
        {creators.length === 0 ? (
          <Text style={[type.subheadline, styles.muted]}>No creators yet. Add one from a course&apos;s Creator field.</Text>
        ) : (
          <View>
            {creators.map((creator, i) => {
              const count = counts.get(creator.name) ?? 0;
              return (
                <ManageRow key={creator.id} name={creator.name} count={count} first={i === 0} last={i === creators.length - 1}>
                  <ManageButton icon="pencil" label={`Rename ${creator.name}`} disabled={busy} onPress={() => rename(creator)} />
                  <ManageButton
                    icon="trash"
                    label={count > 0 ? `${creator.name} has courses, so can't be deleted` : `Delete ${creator.name}`}
                    destructive
                    disabled={busy || count > 0}
                    onPress={() => remove(creator)}
                  />
                </ManageRow>
              );
            })}
          </View>
        )}
        <Text style={[type.footnote, styles.muted, styles.footer]}>
          A creator with courses can&apos;t be deleted. Give their courses another creator first.
        </Text>
      </ScreenScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  muted: { color: colors.secondaryLabel },
  footer: { marginHorizontal: spacing.lg },
});
