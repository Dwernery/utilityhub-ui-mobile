import type { Book } from '../types';
import { compareIsoDates, daysBetween, isoYear } from '@/lib/dates';
import type { YearComparison } from './metricUtils';

export type GraphMetric = 'books' | 'pages' | 'rating';

/** Per-metric config for the "per year" chart (ported from BooksPerYearGraph). */
export const GRAPH_METRICS: Record<GraphMetric, { label: string; shortLabel: string; value: (y: YearComparison) => number; format: (n: number) => string }> = {
  books: { label: 'Books per year', shortLabel: 'Books', value: (y) => y.books, format: String },
  pages: { label: 'Pages per year', shortLabel: 'Pages', value: (y) => y.pages, format: (n) => n.toLocaleString() },
  rating: {
    label: 'Avg rating per year',
    shortLabel: 'Ratings',
    value: (y) => (y.ratingCount > 0 ? Number((y.rating / y.ratingCount).toFixed(1)) : 0),
    format: (n) => n.toFixed(1),
  },
};

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Books finished in `year`, newest first, with days-to-finish (ported from BooksPerYearDetails). */
export function finishedInYear(books: Book[], year: number) {
  return books
    .filter((b) => b.status === 'READ' && b.endDate && isoYear(b.endDate) === year)
    .sort((a, b) => compareIsoDates(b.endDate!, a.endDate!))
    .map((book) => ({
      book,
      days: book.startDate && book.endDate ? daysBetween(book.startDate, book.endDate) : null,
    }));
}

/** `+3` / `-2` / `0` and `+25` / `-10` for the trend pills. */
export const signed = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n)}`;
