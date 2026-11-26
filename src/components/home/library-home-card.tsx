import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card, CardHeader } from '@/components/ui/card';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useBooks } from '@/lib/library/hooks';
import { libraryHomeStats, readingProgress, type ReadingStats } from '@/lib/library/utils/homeStats';

import {
  CardDivider,
  CardError,
  CardSkeleton,
  EmptyLine,
  MetricRow,
  ProgressItemRow,
  RefreshNotice,
  SectionLabel,
} from './parts';

const statsMetrics = (s: ReadingStats) => [
  { value: s.booksRead, label: 'Books', icon: 'book.closed' as const },
  { value: s.pages.toLocaleString(), label: 'Pages', icon: 'book.pages' as const },
  { value: s.avgRating ?? '—', label: 'Avg Rating', icon: 'star' as const },
];

export function LibraryHomeCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { data: books = [], isPending, isLoadingError, isRefetchError, isFetching, error, refetch } = useBooks();
  const { allTime, thisYear, inProgress } = libraryHomeStats(books);

  return (
    <Card style={style}>
      <CardHeader title="Library" icon="books.vertical" tint={accents.library as string} />
      {isPending ? (
        <CardSkeleton />
      ) : isLoadingError ? (
        <CardError what="library" error={error} onRetry={refetch} />
      ) : (
        <View style={styles.body}>
          {isRefetchError && <RefreshNotice onRetry={refetch} retrying={isFetching} />}
          <SectionLabel icon="calendar">All-Time</SectionLabel>
          <MetricRow metrics={statsMetrics(allTime)} />
          <CardDivider />
          <SectionLabel icon="calendar">{new Date().getFullYear()}</SectionLabel>
          <MetricRow metrics={statsMetrics(thisYear)} />
          <CardDivider />
          <SectionLabel icon="book">Currently reading</SectionLabel>
          {inProgress.length > 0 ? (
            <View style={styles.list}>
              {inProgress.slice(0, 4).map((book) => {
                const { pct } = readingProgress(book);
                return (
                  <ProgressItemRow
                    key={book.id}
                    title={book.title}
                    coverUrl={book.s3Url}
                    progress={pct / 100}
                    // The page count sits under the bar, so the title gets the whole top line.
                    meta={`${book.currentPage || 0}/${book.pages ?? '?'} pages`}
                    metaTrailing={`${pct}%`}
                    tint={accents.library}
                  />
                );
              })}
              {inProgress.length > 4 && (
                <Text style={[type.caption1, { color: colors.secondaryLabel }]}>
                  +{inProgress.length - 4} more in progress
                </Text>
              )}
            </View>
          ) : (
            <EmptyLine>Nothing in progress right now.</EmptyLine>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.lg },
  list: { gap: spacing.md },
});
