import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchPicker } from '@/components/ui/search-picker';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useCoursesPicker, type CoursePickField } from '@/lib/courses/context';
import { useCreateCreator, useCreateGroup, useCreators, useGroups } from '@/lib/courses/hooks';

/** Searchable creator / group chooser opened from the course form; can add a new one too. */
export default function CoursePickSheet() {
  const { field } = useLocalSearchParams<{ field: CoursePickField }>();
  const { pickRequest } = useCoursesPicker();
  const { data: creators = [] } = useCreators();
  const { data: groups = [] } = useGroups();
  const createCreator = useCreateCreator();
  const createGroup = useCreateGroup();
  const addToast = useToast();
  const insets = useSafeAreaInsets();
  const isGroup = field === 'group';
  const title = isGroup ? 'Group' : 'Creator';

  // Opened without a form (e.g. a cold deep link): nothing to hand the choice back to.
  if (!pickRequest || pickRequest.field !== field) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>Open this from a course form.</Text>
        </View>
      </>
    );
  }

  const sortedGroups = [...groups].sort((a, b) => a.position - b.position);
  const options = isGroup ? sortedGroups.map((g) => g.name) : creators.map((c) => c.name);
  const current =
    pickRequest.field === 'group' ? (groups.find((g) => g.id === pickRequest.value)?.name ?? null) : pickRequest.value;

  const choose = (name: string) => {
    if (pickRequest.field === 'group') {
      pickRequest.onSelect(name === '' ? null : (groups.find((g) => g.name === name)?.id ?? null));
    } else {
      pickRequest.onSelect(name);
    }
    router.back();
  };

  const addNew = (name: string) => {
    const done = { onError: (err: Error) => addToast(err?.message || `Couldn't add the ${field}`, 'error') };
    if (pickRequest.field === 'group') {
      const onSelect = pickRequest.onSelect;
      createGroup.mutate(name, {
        ...done,
        onSuccess: (group) => {
          addToast(`Group "${group.name}" added`, 'success');
          onSelect(group.id);
          router.back();
        },
      });
    } else {
      const onSelect = pickRequest.onSelect;
      createCreator.mutate(name, {
        ...done,
        onSuccess: (creator) => {
          addToast(`Creator "${creator.name}" added`, 'success');
          onSelect(creator.name);
          router.back();
        },
      });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title, headerTransparent: false }} />
      <SheetCloseButton />
      {/* A group is optional: "None" takes the course out of its group. */}
      {isGroup && current ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button accessibilityLabel="No group" onPress={() => choose('')}>
            None
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <SearchPicker
        title=""
        options={options}
        value={current}
        onSelect={choose}
        onAddNew={addNew}
        addNewLabel={isGroup ? 'Add group' : 'Add creator'}
        isAddingNew={createCreator.isPending || createGroup.isPending}
        placeholder={isGroup ? 'Search groups' : 'Search creators'}
        tint={accents.courses as string}
        sideInset={{ left: insets.left, right: insets.right }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
