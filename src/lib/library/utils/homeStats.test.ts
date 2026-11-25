import type { Book } from '../types';
import { libraryHomeStats } from './homeStats';

// Mirrors utility-hub-ui's domains/library/utils/homeStats.test.js.
const book = (id: number, status: string, endDate: string | null, pages: number, rating: number | null) =>
  ({ id, status, endDate, pages, rating }) as unknown as Book;

describe('libraryHomeStats', () => {
  const books = [
    book(1, 'READ', '2025-06-01', 300, 4),
    book(2, 'READ', '2026-02-10', 200, 5),
    book(3, 'READ', '2026-03-15', 100, null),
    book(4, 'READ', null, 999, 1), // finished without an end date: not counted
    book(5, 'IN_PROGRESS', null, 400, null),
    book(6, 'TO_READ', null, 250, null),
  ];

  it('counts finished books all-time and for the year', () => {
    const s = libraryHomeStats(books, 2026);
    expect(s.allTime).toEqual({ booksRead: 3, pages: 600, avgRating: '4.5' });
    expect(s.thisYear).toEqual({ booksRead: 2, pages: 300, avgRating: '5.0' });
  });

  it('lists the books in progress', () => {
    expect(libraryHomeStats(books, 2026).inProgress.map((b) => b.id)).toEqual([5]);
  });

  it('gives a null average when nothing is rated', () => {
    const s = libraryHomeStats([book(1, 'READ', '2026-01-05', 120, null)], 2026);
    expect(s.thisYear).toEqual({ booksRead: 1, pages: 120, avgRating: null });
    expect(libraryHomeStats([], 2026).allTime).toEqual({ booksRead: 0, pages: 0, avgRating: null });
  });
});
