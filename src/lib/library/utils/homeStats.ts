import type { Book } from '../types';
import { daysBetween, parseLocalDate, toIsoDate } from '@/lib/dates';

export interface ReadingStats {
  booksRead: number;
  pages: number;
  /** One-decimal string, or null when nothing is rated (matches the web). */
  avgRating: string | null;
}

function summarize(books: Book[]): ReadingStats {
  const rated = books.filter((b) => b.rating);
  return {
    booksRead: books.length,
    pages: books.reduce((sum, b) => sum + (b.pages || 0), 0),
    avgRating: rated.length > 0 ? (rated.reduce((s, b) => s + (b.rating || 0), 0) / rated.length).toFixed(1) : null,
  };
}

/** All-time and current-year reading stats for the Home card (mirrors the web's library/utils/homeStats.js). */
export function libraryHomeStats(books: Book[], year = new Date().getFullYear()) {
  const finished = books.filter((b) => b.status === 'READ' && b.endDate);
  const thisYear = finished.filter((b) => parseLocalDate(b.endDate)?.getFullYear() === year);
  return {
    allTime: summarize(finished),
    thisYear: summarize(thisYear),
    inProgress: books.filter((b) => b.status === 'IN_PROGRESS'),
  };
}

/** Percent through a book (0–100) and days since starting, for "currently reading" rows. */
export function readingProgress(book: Book, now = new Date()) {
  const raw = ((book.currentPage ?? 0) / (book.pages || 0)) * 100;
  const pct = Math.min(100, Math.max(0, Math.round(Number.isFinite(raw) ? raw : 0)));
  const days = book.startDate ? Math.max(0, daysBetween(book.startDate, toIsoDate(now))) : null;
  return { pct, days };
}
