import { useLocalSearchParams } from 'expo-router';

import { BookGroupSheet } from '@/components/library/book-group-sheet';
import { useBooks } from '@/lib/library/hooks';
import { authorStats, plural } from '@/lib/library/utils/groupStats';

export default function AuthorDetail() {
  const { name = '' } = useLocalSearchParams<{ name: string }>();
  const { data: books = [] } = useBooks();
  const s = authorStats(books, name);

  return (
    <BookGroupSheet
      title={name}
      subtitle={`${plural(s.books.length, 'book')} · ${s.readCount} read`}
      metrics={[
        { value: s.readCount, label: 'Read' },
        { value: s.pagesRead.toLocaleString(), label: 'Pages' },
        { value: s.avgRating ?? '—', label: 'Avg ★' },
      ]}
      books={s.books}
      secondary="series"
    />
  );
}
