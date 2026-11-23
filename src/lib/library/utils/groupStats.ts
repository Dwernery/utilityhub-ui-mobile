import type { Book } from '../types';
import { bySeriesOrder } from './series';

const avgRatingOf = (books: Book[]) => {
  const rated = books.filter((b) => (b.rating ?? 0) > 0);
  return rated.length ? (rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length).toFixed(1) : null;
};

const pagesOf = (books: Book[]) => books.reduce((s, b) => s + (b.pages || 0), 0);

/** Stats for the author sheet (ported from AuthorDetailModal). */
export function authorStats(books: Book[], author: string) {
  const authorBooks = books.filter((b) => b.authorName === author);
  const readBooks = authorBooks.filter((b) => b.status === 'READ');
  return {
    books: authorBooks,
    /** Pages across all of the author's books, read or not. */
    totalPages: pagesOf(authorBooks),
    readCount: readBooks.length,
    pagesRead: pagesOf(readBooks),
    avgRating: avgRatingOf(readBooks),
  };
}

/** Stats for the series sheet (ported from SeriesDetailModal). */
export function seriesStats(books: Book[], series: string) {
  // In series order: by number, then any without one in the order they were added.
  const seriesBooks = books.filter((b) => b.seriesName === series).sort(bySeriesOrder);
  const readBooks = seriesBooks.filter((b) => b.status === 'READ');
  return {
    books: seriesBooks,
    totalPages: pagesOf(seriesBooks),
    readCount: readBooks.length,
    pagesRead: pagesOf(readBooks),
    avgRating: avgRatingOf(readBooks),
  };
}

export const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
