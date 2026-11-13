import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BookCover } from '@/components/library/book-cover';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, radius, spacing, type } from '@/constants/theme';
import { useBooks, useStartReading } from '@/lib/library/hooks';
import type { Book } from '@/lib/library/types';

/** Pick an unread book to start (ported from StartReadingModal; opened from Metrics → Currently Reading). */
export default function StartReading() {
  const { data: books = [] } = useBooks();
  const { startReading, isPending } = useStartReading();
  const [search, setSearch] = useState('');

  const unread = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books
      .filter((b) => b.status === 'UNREAD')
      .filter((b) => !q || b.title.toLowerCase().includes(q) || b.authorName.toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [books, search]);

  const start = (book: Book) => startReading(book, { onSuccess: () => router.back() });

  return (
    <>
      <Stack.Screen options={{ title: 'Start Reading' }} />
      <SheetCloseButton />
      <Stack.SearchBar
        placeholder="Search title, author"
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearch('')}
        hideWhenScrolling={false}
      />
      <FlatList
        data={unread}
        keyExtractor={(b) => String(b.id)}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <Text style={[type.subheadline, styles.empty]}>
            {search ? 'No unread books match.' : 'No unread books.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => start(item)}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={`Start reading ${item.title} by ${item.authorName}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed, isPending && styles.disabled]}>
            <BookCover book={item} width={36} />
            <View style={styles.body}>
              <Text style={[type.subheadline, { color: colors.label, fontWeight: '500' }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[type.footnote, { color: colors.secondaryLabel }]} numberOfLines={1}>
                {item.authorName}
              </Text>
              {item.seriesName ? (
                <Text style={[type.footnote, { color: accents.library }]} numberOfLines={1}>
                  {item.seriesName}
                </Text>
              ) : null}
            </View>
            <SymbolView name="play.circle.fill" size={26} tintColor={accents.library} />
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.groupedBackground },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.secondaryGroupedBackground,
  },
  pressed: { backgroundColor: colors.fill },
  disabled: { opacity: 0.5 },
  body: { flex: 1, minWidth: 0, gap: 1 },
  empty: { color: colors.secondaryLabel, textAlign: 'center', paddingVertical: 48 },
});
