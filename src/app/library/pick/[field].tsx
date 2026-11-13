import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchPicker } from '@/components/ui/search-picker';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useLibrary, type PickField } from '@/lib/library/context';
import { useCreateAuthor, useCreateSeries } from '@/lib/library/hooks';

const COPY: Record<PickField, { title: string; add: string; noun: string }> = {
  author: { title: 'Author', add: 'Add author', noun: 'Author' },
  series: { title: 'Series', add: 'Add series', noun: 'Series' },
};

/** Searchable author/series chooser opened from the book forms (replaces SearchableDropdown). */
export default function PickSheet() {
  const { field } = useLocalSearchParams<{ field: PickField }>();
  const { pickRequest, authorOptions, seriesOptions } = useLibrary();
  const createAuthor = useCreateAuthor();
  const createSeries = useCreateSeries();
  const addToast = useToast();
  const insets = useSafeAreaInsets();

  const copy = COPY[field] ?? COPY.author;
  const create = field === 'series' ? createSeries : createAuthor;

  // Opened without a form (e.g. a cold deep link): nothing to hand the choice back to.
  if (!pickRequest || pickRequest.field !== field) {
    return (
      <>
        <Stack.Screen options={{ title: copy.title }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>Open this from a book form.</Text>
        </View>
      </>
    );
  }

  const choose = (value: string) => {
    pickRequest.onSelect(value);
    router.back();
  };

  const addNew = (name: string) => {
    create.mutate(name, {
      onSuccess: (data) => {
        const created = data?.name || name;
        addToast(`${copy.noun} "${created}" created`, 'success');
        choose(created);
      },
      onError: (err) => addToast(`Failed to create ${field}: ${err?.message || 'Unknown error'}`, 'error'),
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: copy.title, headerTransparent: false }} />
      <SheetCloseButton />
      {/* Series is optional: a "None" toolbar button clears it. */}
      {field === 'series' && pickRequest.value ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button accessibilityLabel="No series" onPress={() => choose('')}>
            None
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <SearchPicker
        title=""
        options={field === 'series' ? seriesOptions : authorOptions}
        value={pickRequest.value}
        onSelect={choose}
        onAddNew={addNew}
        addNewLabel={copy.add}
        isAddingNew={create.isPending}
        placeholder={`Search ${field === 'series' ? 'series' : 'authors'}`}
        tint={accents.library as string}
        sideInset={{ left: insets.left, right: insets.right }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
