import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { MetricRow, type Metric } from '@/components/ui/metric-row';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, radius, spacing, type } from '@/constants/theme';
import type { Book } from '@/lib/library/types';

import { BookRow } from './book-row';
import type { UseQueryResult } from '@tanstack/react-query';
import { LoadError } from '@/components/ui/load-error';
import { SkeletonListGroup } from '@/components/ui/skeleton';

interface BookGroupSheetProps {
  title: string;
  subtitle: string;
  metrics: Metric[];
  books: Book[];
  /** Second line of each row. */
  secondary: 'series' | 'author';
  /** The books query, so the sheet can show loading and error states instead of "0 books". */
  query: Pick<UseQueryResult<Book[]>, 'data' | 'isPending' | 'error' | 'refetch'>;
}

const openBook = (book: Book) => router.push({ pathname: '/library/book/[id]', params: { id: String(book.id) } });

/** Shared body for the author and series sheets: title, three stats, then the books. */
export function BookGroupSheet({ title, subtitle, metrics, books, secondary, query }: BookGroupSheetProps) {
  if (query.data === undefined) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <SheetCloseButton />
        <ScreenScrollView sideInsets={false} contentContainerStyle={styles.content}>
          {query.isPending ? (
            <View accessibilityLabel="Loading" accessibilityRole="progressbar">
              <SkeletonListGroup rows={3} />
            </View>
          ) : (
            <LoadError what="books" error={query.error} onRetry={() => query.refetch()} tint={accents.library} />
          )}
        </ScreenScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <SheetCloseButton />
      <ScreenScrollView sideInsets={false} contentContainerStyle={styles.content}>
        {/* The name is the sheet's header title; the body starts with the summary line. */}
        <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>{subtitle}</Text>
        <View style={styles.stats}>
          <MetricRow metrics={metrics} />
        </View>
        <View>
          {books.map((book, i) => (
            <BookRow
              key={book.id}
              book={book}
              onPress={openBook}
              secondary={secondary}
              first={i === 0}
              last={i === books.length - 1}
            />
          ))}
        </View>
        {books.length === 0 && (
          <Text style={[type.subheadline, styles.empty]}>No books here anymore.</Text>
        )}
      </ScreenScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  stats: {
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.secondaryGroupedBackground,
  },
  empty: { color: colors.secondaryLabel, textAlign: 'center' },
});
