import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BookCover } from '@/components/library/book-cover';
import { StatusGlyph } from '@/components/library/book-row';
import { StarRating } from '@/components/library/star-rating';
import { MetricRow } from '@/components/ui/metric-row';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { accents, colors, radius, spacing, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { haptics } from '@/lib/haptics';
import { useBook, useDeleteBook, useUpdateBook } from '@/lib/library/hooks';
import { formatDate } from '@/lib/dates';
import { seriesLabel } from '@/lib/library/utils/series';
import { parseIdParam } from '@/lib/routeParams';

const STATUS_TEXT = { READ: 'Finished', IN_PROGRESS: 'Reading', UNREAD: 'Unread' } as const;

export default function BookDetail() {
  const params = useLocalSearchParams<{ id: string; rate?: string }>();
  const id = parseIdParam(params.id);
  // Opened by "Done" in Currently Reading: ask for a rating over the stars until there is one.
  const askToRate = params.rate === '1';
  const { data: book, isPending } = useBook(id);
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();
  const addToast = useToast();
  // Optimistic rating while the PATCH is in flight (local, so it can't leak into another book).
  const [optimisticRating, setOptimisticRating] = useState<number | null>(null);

  if (!book) {
    return (
      <>
        <Stack.Screen options={{ title: 'Book' }} />
        <SheetCloseButton />
        {isPending ? (
          <View style={styles.loading} accessibilityLabel="Loading" accessibilityRole="progressbar">
            <View style={styles.hero}>
              <Skeleton width={104} height={156} r={8} />
              <View style={[styles.heroText, { gap: spacing.sm }]}>
                <Skeleton width="80%" height={22} />
                <Skeleton width="50%" />
                <Skeleton width="35%" />
              </View>
            </View>
            <SkeletonCard lines={0} tall={48} />
          </View>
        ) : (
          <View style={styles.missing}>
            <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>This book no longer exists.</Text>
          </View>
        )}
      </>
    );
  }

  const onRate = (rating: number) => {
    setOptimisticRating(rating);
    updateBook.mutate(
      { id: book.id, rating },
      {
        onSuccess: () => addToast(`Rated "${book.title}" ${rating}/5`, 'success'),
        onError: (err) => addToast(`Failed to save rating: ${err?.message || 'Unknown error'}`, 'error'),
        onSettled: () => setOptimisticRating(null),
      },
    );
  };

  const onDelete = () => {
    haptics.warning();
    Alert.alert(`Delete “${book.title}”?`, 'This removes it from your library.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteBook.mutate(book.id, {
            onSuccess: () => {
              addToast(`Deleted "${book.title}"`, 'success');
              router.back();
            },
            onError: (err) => addToast(`Failed to delete book: ${err?.message || 'Unknown error'}`, 'error'),
          }),
      },
    ]);
  };

  const canRate = book.status === 'READ' && !updateBook.isPending;

  return (
    <>
      <Stack.Screen options={{ title: 'Book Details' }} />
      <SheetCloseButton />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="pencil"
          accessibilityLabel="Edit book"
          disabled={deleteBook.isPending}
          onPress={() => router.push({ pathname: '/library/book/[id]/edit', params: { id: String(book.id) } })}
        />
        <Stack.Toolbar.Button
          icon="trash"
          tintColor={colors.negative}
          accessibilityLabel="Delete book"
          disabled={deleteBook.isPending}
          onPress={onDelete}
        />
      </Stack.Toolbar>

      <ScreenScrollView sideInsets={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <BookCover book={book} width={104} />
          <View style={styles.heroText}>
            <Text style={[type.title3, { color: colors.label }]} selectable>
              {book.title}
            </Text>
            <Pressable
              onPress={() => router.push({ pathname: '/library/author/[name]', params: { name: book.authorName } })}
              accessibilityRole="link"
              hitSlop={4}>
              <Text style={[type.body, { color: accents.library }]}>{book.authorName}</Text>
            </Pressable>
            {book.seriesName ? (
              <Pressable
                onPress={() => router.push({ pathname: '/library/series/[name]', params: { name: book.seriesName! } })}
                accessibilityRole="link"
                hitSlop={4}>
                <Text style={[type.subheadline, { color: accents.library }]}>{seriesLabel(book)}</Text>
              </Pressable>
            ) : null}
            <View style={styles.statusRow}>
              <StatusGlyph status={book.status} size={14} />
              <Text style={[type.footnote, { color: colors.secondaryLabel }]}>{STATUS_TEXT[book.status]}</Text>
            </View>
          </View>
        </View>

        <View style={styles.ratingRow}>
          {askToRate && book.status === 'READ' && !(optimisticRating ?? book.rating) ? (
            <Text style={[type.headline, { color: colors.label }]}>Finished! How was it?</Text>
          ) : null}
          <StarRating value={optimisticRating ?? book.rating ?? 0} onChange={canRate ? onRate : undefined} size="lg" />
          {book.status !== 'READ' && (
            <Text style={[type.caption1, { color: colors.tertiaryLabel }]}>Rate after finishing</Text>
          )}
        </View>

        <View style={styles.stats}>
          <MetricRow
            metrics={[
              { value: book.pages ?? '—', label: 'Pages' },
              { value: formatDate(book.startDate), label: 'Started' },
              { value: formatDate(book.endDate), label: 'Finished' },
            ]}
          />
        </View>
      </ScreenScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  hero: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  heroText: { flex: 1, minWidth: 0, gap: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs },
  ratingRow: { gap: spacing.xs },
  stats: {
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.secondaryGroupedBackground,
  },
  loading: { padding: spacing.lg, paddingTop: 72, gap: spacing.lg },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
