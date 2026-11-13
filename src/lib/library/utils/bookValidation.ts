interface BookDraft {
  title?: string | null;
  authorName?: string | null;
  pages?: number | string | null;
  isbn13?: string | null;
}

export function isBookValid(book: BookDraft | null | undefined): boolean {
  return Boolean(
    book?.title?.trim() &&
      book?.authorName?.trim() &&
      book?.pages &&
      Number(book.pages) > 0 &&
      book?.isbn13?.trim(),
  );
}

export const BOOK_VALIDATION_MESSAGE = 'Title, author, pages, and ISBN are required';
