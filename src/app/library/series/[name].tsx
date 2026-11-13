import { useLocalSearchParams } from 'expo-router';

import { BookGroupSheet } from '@/components/library/book-group-sheet';
import { useBooks } from '@/lib/library/hooks';
import { plural, seriesStats } from '@/lib/library/utils/groupStats';

export default function SeriesDetail() {
  const { name = '' } = useLocalSearchParams<{ name: string }>();
  const { data: books = [] } = useBooks();
  const s = seriesStats(books, name);

  return (
    <BookGroupSheet
      title={name}
      subtitle={`${plural(s.books.length, 'book')} · ${plural(s.totalPages, 'page')}`}
      metrics={[
        { value: s.readCount, label: s.readCount === 1 ? 'Book Read' : 'Books Read' },
        { value: s.pagesRead.toLocaleString(), label: s.pagesRead === 1 ? 'Page Read' : 'Pages Read' },
        { value: s.avgRating ?? '—', label: 'Avg ★' },
      ]}
      books={s.books}
      secondary="author"
    />
  );
}
