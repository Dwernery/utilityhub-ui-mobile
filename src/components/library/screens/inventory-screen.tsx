import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookRow } from '@/components/library/book-row';
import { LibrarySwitcher } from '@/components/library/library-switcher';
import { SkeletonListGroup } from '@/components/ui/skeleton';
import { accents, colors, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useIsWide } from '@/hooks/use-is-wide';
import { useBooks } from '@/lib/library/hooks';
import type { Book, StatusFilter } from '@/lib/library/types';
import { filterBooks, groupBooks } from '@/lib/library/utils/metricUtils';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'IN_PROGRESS', label: 'Reading' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'READ', label: 'Read' },
];

const openBook = (book: Book) => router.push({ pathname: '/library/book/[id]', params: { id: String(book.id) } });
const openAuthor = (name: string) => router.push({ pathname: '/library/author/[name]', params: { name } });
const openSeries = (name: string) => router.push({ pathname: '/library/series/[name]', params: { name } });

export default function Inventory() {
  const insets = useSafeAreaInsets();
  const wide = useIsWide();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const { data: books = [], isPending, isError, error, refetch, isRefetching } = useBooks();

  const filtered = useMemo(() => filterBooks(books, search.trim().toLowerCase(), statusFilter), [books, search, statusFilter]);
  const sections = useMemo(
    () =>
      Object.entries(groupBooks(filtered)).map(([author, data]) => ({
        author,
        data,
        readCount: data.filter((b) => b.status === 'READ').length,
      })),
    [filtered],
  );

  const setFilter = useCallback((f: StatusFilter) => {
    haptics.selection();
    setStatusFilter(f);
  }, []);

  const filterLabel = FILTERS.find((f) => f.value === statusFilter)!.label;

  return (
    <>
      <Stack.SearchBar
        placeholder="Search title, author, series"
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearch('')}
        hideWhenScrolling={false}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon={statusFilter === 'ALL' ? 'line.3.horizontal.decrease.circle' : 'line.3.horizontal.decrease.circle.fill'}
          accessibilityLabel={`Filter, ${filterLabel}`}>
          <Stack.Toolbar.Menu inline title="Show">
            {FILTERS.map((f) => (
              <Stack.Toolbar.MenuAction key={f.value} isOn={statusFilter === f.value} onPress={() => setFilter(f.value)}>
                {f.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Add book" onPress={() => router.push('/library/add')} />
      </Stack.Toolbar>

      <SectionList
        sections={sections}
        keyExtractor={(b) => String(b.id)}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        style={styles.list}
        contentContainerStyle={[
          { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right, paddingBottom: spacing.xxl },
          // Wide: keep rows at a readable width instead of stretching edge to edge.
          wide && styles.readable,
        ]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        ListHeaderComponent={
          <View>
            <LibrarySwitcher current="Inventory" />
            {!isPending && !isError && (
              <Text style={[type.footnote, tabularNums, styles.count]}>
                {filtered.length} {filtered.length === 1 ? 'book' : 'books'}
                {statusFilter !== 'ALL' ? ` · ${filterLabel}` : ''}
              </Text>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Pressable
            onPress={() => openAuthor(section.author)}
            accessibilityRole="button"
            accessibilityLabel={`${section.author}, ${section.readCount} of ${section.data.length} read`}
            accessibilityHint="Opens author details"
            style={({ pressed }) => [styles.sectionHeader, pressed && { opacity: 0.6 }]}>
            <SymbolView name="person.fill" size={12} tintColor={colors.secondaryLabel} />
            <Text style={[type.subheadline, styles.sectionTitle]} numberOfLines={1}>
              {section.author}
            </Text>
            <Text style={[type.footnote, tabularNums, { color: colors.secondaryLabel }]}>
              {section.readCount} / {section.data.length} read
            </Text>
          </Pressable>
        )}
        renderItem={({ item, index, section }) => (
          <BookRow
            book={item}
            onPress={openBook}
            onSeriesPress={openSeries}
            first={index === 0}
            last={index === section.data.length - 1}
          />
        )}
        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        ListEmptyComponent={
          isPending ? (
            <View style={styles.skeleton} accessibilityLabel="Loading" accessibilityRole="progressbar">
              <SkeletonListGroup rows={4} />
              <SkeletonListGroup rows={2} />
            </View>
          ) : isError ? (
            <View style={styles.empty}>
              <Text style={[type.subheadline, { color: colors.negative, textAlign: 'center' }]}>
                Failed to load books: {error?.message || 'Unknown error'}
              </Text>
              <Pressable onPress={() => refetch()} accessibilityRole="button">
                <Text style={[type.headline, { color: accents.library }]}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <SymbolView name="magnifyingglass" size={32} tintColor={colors.tertiaryLabel} />
              <Text style={[type.headline, { color: colors.label }]}>No books found</Text>
              <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>Try a different search or filter.</Text>
              {statusFilter !== 'ALL' && (
                <Pressable onPress={() => setFilter('ALL')} accessibilityRole="button">
                  <Text style={[type.subheadline, { color: accents.library, fontWeight: '600' }]}>Show all books</Text>
                </Pressable>
              )}
            </View>
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.groupedBackground },
  readable: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  count: { color: colors.secondaryLabel, marginBottom: spacing.xs },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: { flex: 1, color: colors.label, fontWeight: '600' },
  skeleton: { gap: spacing.lg, paddingTop: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: 64 },
});
