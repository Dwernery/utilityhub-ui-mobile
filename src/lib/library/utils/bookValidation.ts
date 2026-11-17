interface BookDraft {
  title?: string | null;
  authorName?: string | null;
  pages?: number | string | null;
}

export function isBookValid(book: BookDraft | null | undefined): boolean {
  return Boolean(
    book?.title?.trim() &&
      book?.authorName?.trim() &&
      book?.pages &&
      Number(book.pages) > 0,
  );
}

export const BOOK_VALIDATION_MESSAGE = 'Title, author, and pages are required';
