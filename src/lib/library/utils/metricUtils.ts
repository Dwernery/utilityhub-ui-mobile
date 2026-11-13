import type { Book, StatusFilter } from '../types';
import { parseLocalDate } from './dateUtils';

export const filterBooks = (books: Book[], normalizedSearch: string, statusFilter: StatusFilter): Book[] =>
  books.filter((book) => {
    const title = String(book?.title ?? '').toLowerCase();
    const authorName = String(book?.authorName ?? '').toLowerCase();
    const series = String(book?.seriesName ?? '').toLowerCase();

    const matchesSearch =
      !normalizedSearch ||
      title.includes(normalizedSearch) ||
      authorName.includes(normalizedSearch) ||
      series.includes(normalizedSearch);

    const matchesStatus = statusFilter === 'ALL' || book.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

/** Group books by author, authors sorted alphabetically. */
export const groupBooks = (filteredBooks: Book[]): Record<string, Book[]> => {
  const groups: Record<string, Book[]> = {};
  for (const book of filteredBooks) {
    const authorName = book.authorName || 'Unknown';
    (groups[authorName] ??= []).push(book);
  }
  return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)));
};

export interface YearTotals {
  books: number;
  pages: number;
  rating: number;
  ratingCount: number;
}

export interface YearComparison extends YearTotals {
  year: number;
  booksDiff: number | null;
  pagesDiff: number | null;
  booksPercentChange: number | null;
  pagesPercentChange: number | null;
}

export interface LibraryMetrics {
  byYear: Record<number, YearTotals>;
  byMonth: Record<number, { books: number; pages: number }>;
  allTimeBooks: number;
  allTimePages: number;
  /** One-decimal string (e.g. "4.2"), or 0 when nothing is rated — matches the web client. */
  allTimeRating: string | 0;
  availableYears: number[];
  yearComparisons: YearComparison[];
}

export const calculateMetrics = (books: Book[], selectedReadingYear: number | null): LibraryMetrics => {
  const readBooks = books.filter((b) => b.status === 'READ' && b.endDate);
  const endYear = (b: Book) => parseLocalDate(b.endDate)!.getFullYear();

  const byYear: Record<number, YearTotals> = {};
  for (const b of readBooks) {
    const y = endYear(b);
    byYear[y] ??= { books: 0, pages: 0, rating: 0, ratingCount: 0 };
    byYear[y].books++;
    byYear[y].pages += b.pages || 0;
    if (b.rating) {
      byYear[y].rating += b.rating;
      byYear[y].ratingCount++;
    }
  }

  const allTimeBooks = readBooks.length;
  const allTimePages = readBooks.reduce((s, b) => s + (b.pages || 0), 0);
  const allTimeRatingSum = readBooks.reduce((s, b) => s + (b.rating || 0), 0);
  const allTimeRatingCount = readBooks.filter((b) => b.rating).length;
  const allTimeRating = allTimeRatingCount > 0 ? (allTimeRatingSum / allTimeRatingCount).toFixed(1) : 0;

  const availableYears = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  const yearComparisons: YearComparison[] = availableYears.map((year, i) => {
    const curr = byYear[year];
    const prevYear = availableYears[i + 1];
    const prev = prevYear ? byYear[prevYear] : null;
    const booksDiff = prev !== null ? curr.books - prev.books : null;
    const pagesDiff = prev !== null ? curr.pages - prev.pages : null;
    return {
      year,
      ...curr,
      booksDiff,
      pagesDiff,
      booksPercentChange: prev && prev.books > 0 ? (booksDiff! / prev.books) * 100 : null,
      pagesPercentChange: prev && prev.pages > 0 ? (pagesDiff! / prev.pages) * 100 : null,
    };
  });

  const byMonth: Record<number, { books: number; pages: number }> = {};
  const src = selectedReadingYear ? readBooks.filter((b) => endYear(b) === selectedReadingYear) : readBooks;
  for (const b of src) {
    const m = parseLocalDate(b.endDate)!.getMonth();
    byMonth[m] ??= { books: 0, pages: 0 };
    byMonth[m].books++;
    byMonth[m].pages += b.pages || 0;
  }

  return { byYear, byMonth, allTimeBooks, allTimePages, allTimeRating, availableYears, yearComparisons };
};
