import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ManageButton, ManageRow } from '@/components/courses/manage-list';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { colors, spacing, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import {
  useCourses,
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useRenameGroup,
  useReorderGroups,
} from '@/lib/courses/hooks';
import type { CourseGroup } from '@/lib/courses/types';
import { haptics } from '@/lib/haptics';

/**
 * Every group in display order with its course count: add, rename, move up or down, or
 * delete (its courses move to Ungrouped). Like the web's Groups window.
 */
export default function Groups() {
  const { data: groups = [] } = useGroups();
  const { data: courses = [] } = useCourses();
  const createGroup = useCreateGroup();
  const renameGroup = useRenameGroup();
  const deleteGroup = useDeleteGroup();
  const reorderGroups = useReorderGroups();
  const addToast = useToast();
  const insets = useSafeAreaInsets();
  const busy = createGroup.isPending || renameGroup.isPending || deleteGroup.isPending;

  const sorted = useMemo(() => [...groups].sort((a, b) => a.position - b.position || a.id - b.id), [groups]);
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of courses) if (c.groupId != null) m.set(c.groupId, (m.get(c.groupId) ?? 0) + 1);
    return m;
  }, [courses]);

  const add = () =>
    Alert.prompt('New Group', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add',
        onPress: (text?: string) => {
          const name = (text ?? '').trim();
          if (!name) return;
          const existed = groups.some((g) => g.name.toLowerCase() === name.toLowerCase());
          createGroup.mutate(name, {
            onSuccess: (group) =>
              addToast(existed ? `"${group.name}" already exists` : `Group "${group.name}" added`, 'success'),
            onError: (err) => addToast(err?.message || "Couldn't add the group", 'error'),
          });
        },
      },
    ]);

  const rename = (group: CourseGroup) =>
    Alert.prompt(
      'Rename Group',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (text?: string) => {
            const name = (text ?? '').trim();
            if (!name || name === group.name) return;
            renameGroup.mutate(
              { id: group.id, name },
              {
                onSuccess: () => addToast(`Renamed to "${name}"`, 'success'),
                onError: (err) => addToast(err?.message || "Couldn't rename the group", 'error'),
              },
            );
          },
        },
      ],
      'plain-text',
      group.name,
    );

  const move = (index: number, delta: number) => {
    haptics.selection();
    const ids = sorted.map((g) => g.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    reorderGroups.mutate(ids, {
      onError: (err) => addToast(err?.message || "Couldn't reorder groups", 'error'),
    });
  };

  const remove = (group: CourseGroup) => {
    haptics.warning();
    const count = counts.get(group.id) ?? 0;
    Alert.alert(
      `Delete “${group.name}”?`,
      count === 0 ? undefined : `Its ${count === 1 ? 'course' : `${count} courses`} will move to Ungrouped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteGroup.mutate(group.id, {
              onSuccess: () => addToast(`Deleted "${group.name}"`, 'success'),
              onError: (err) => addToast(err?.message || "Couldn't delete the group", 'error'),
            }),
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Groups' }} />
      <SheetCloseButton />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Add group" disabled={busy} onPress={add} />
      </Stack.Toolbar>
      <ScreenScrollView sideInsets={false} contentContainerStyle={styles.content}>
        {/* On the folded iPhone Duo the sheet's + sits in a rail over the right edge, on top of
            the first row's buttons: start the list below it. */}
        {insets.right > 0 && <View style={styles.railClearance} />}
        {sorted.length === 0 ? (
          <Text style={[type.subheadline, styles.muted]}>No groups yet. Courses without a group show under Ungrouped.</Text>
        ) : (
          <View>
            {sorted.map((group, i) => (
              <ManageRow
                key={group.id}
                name={group.name}
                count={counts.get(group.id) ?? 0}
                first={i === 0}
                last={i === sorted.length - 1}>
                <ManageButton icon="chevron.up" label={`Move ${group.name} up`} disabled={busy || i === 0} onPress={() => move(i, -1)} />
                <ManageButton
                  icon="chevron.down"
                  label={`Move ${group.name} down`}
                  disabled={busy || i === sorted.length - 1}
                  onPress={() => move(i, 1)}
                />
                <ManageButton icon="pencil" label={`Rename ${group.name}`} disabled={busy} onPress={() => rename(group)} />
                <ManageButton icon="trash" label={`Delete ${group.name}`} destructive disabled={busy} onPress={() => remove(group)} />
              </ManageRow>
            ))}
          </View>
        )}
        <Text style={[type.footnote, styles.muted, styles.footer]}>
          Deleting a group keeps its courses; they move to Ungrouped.
        </Text>
      </ScreenScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  railClearance: { height: 40 },
  muted: { color: colors.secondaryLabel },
  footer: { marginHorizontal: spacing.lg },
});
