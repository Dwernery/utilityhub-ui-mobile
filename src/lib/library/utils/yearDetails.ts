import type { Book } from '../types';
import { parseLocalDate } from './dateUtils';
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
    .filter((b) => b.status === 'READ' && b.endDate && parseLocalDate(b.endDate)?.getFullYear() === year)
    .sort((a, b) => parseLocalDate(b.endDate)!.getTime() - parseLocalDate(a.endDate)!.getTime())
    .map((book) => {
      const start = parseLocalDate(book.startDate);
      const end = parseLocalDate(book.endDate);
      const days = start && end ? Math.ceil((end.getTime() - start.getTime()) / 86_400_000) : null;
      return { book, days };
    });
}

/** `+3` / `-2` / `0` and `+25` / `-10` for the trend pills. */
export const signed = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n)}`;
