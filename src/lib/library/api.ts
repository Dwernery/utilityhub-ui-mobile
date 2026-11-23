import { requestJson, requestVoid } from '../http';
import type { Author, Book, BookUpdate, NewBookInput, PresignedUpload, ReadingGoal, Series } from './types';

export function getBooks() {
  return requestJson<Book[]>('/api/library/books', { errorMessage: 'Failed to fetch books' });
}

export function getAuthors() {
  return requestJson<Author[]>('/api/library/authors', { errorMessage: 'Failed to fetch authors' });
}

export function getSeries() {
  return requestJson<Series[]>('/api/library/series', { errorMessage: 'Failed to fetch series' });
}

export function getGoals() {
  return requestJson<ReadingGoal[]>('/api/library/goals', { errorMessage: 'Failed to fetch reading goals' });
}

export function setGoal({ year, target }: ReadingGoal) {
  return requestJson<ReadingGoal>(`/api/library/goals/${year}`, {
    method: 'PUT',
    body: { target },
    errorMessage: 'Failed to save reading goal',
  });
}

export async function deleteGoal(year: number) {
  await requestVoid(`/api/library/goals/${year}`, { method: 'DELETE', errorMessage: 'Failed to remove reading goal' });
}

/** Returns the saved name: an existing author's, if one matches ignoring case (the API doesn't duplicate). */
export async function createAuthor(authorName: string) {
  const author = await requestJson<Author>('/api/library/authors', {
    method: 'POST',
    body: { fullName: authorName },
    errorMessage: 'Failed to create author',
  });
  return { name: author.fullName };
}

/** Returns the saved name: an existing series', if one matches ignoring case (the API doesn't duplicate). */
export async function createSeries(seriesName: string) {
  const series = await requestJson<Series>('/api/library/series', {
    method: 'POST',
    body: { name: seriesName },
    errorMessage: 'Failed to create series',
  });
  return { name: series.name };
}

export function addBook({ title, pages, authorName, seriesName }: NewBookInput) {
  return requestJson<Book>('/api/library/books', {
    method: 'POST',
    body: {
      title,
      pages: pages === '' || pages === null || pages === undefined ? null : Number(pages),
      authorName,
      seriesName: seriesName || null,
    },
    errorMessage: 'Failed to create book',
    includeErrorDetail: true,
  });
}

export async function updateBook(data: BookUpdate) {
  const { id, ...fields } = data;
  if (!id) throw new Error('Missing book id for update');

  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    // Skip undefined fields so PATCH only sends things the caller intended to change
    if (value === undefined) continue;

    switch (key) {
      case 'pages':
      case 'rating':
        payload[key] = value === '' || value === null ? null : Number(value);
        break;
      case 'currentPage':
        payload[key] = value === '' || value === null ? 0 : Number(value);
        break;
      case 'seriesName':
        payload[key] = value || null;
        break;
      default:
        // Dates: callers may explicitly pass null to clear a date
        payload[key] = value;
    }
  }

  await requestVoid(`/api/library/books/${id}`, {
    method: 'PATCH',
    body: payload,
    errorMessage: 'Failed to update book',
    includeErrorDetail: true,
  });
  return 'Success' as const;
}

/** Get a presigned URL for uploading a file to S3. */
export function getPresignedUploadUrl(fileName: string, fileType: string) {
  const params = new URLSearchParams({ fileName, fileType });
  return requestJson<PresignedUpload>(`/api/library/books/upload-url?${params}`, {
    errorMessage: 'Failed to get upload URL',
    includeErrorDetail: true,
  });
}

/** Associate an uploaded S3 object with a book. */
export function attachFileToBook(bookId: number, s3Key: string, fileType = 'cover') {
  return requestJson<unknown>(`/api/library/books/${bookId}/attach-file`, {
    method: 'POST',
    body: { s3Key, fileType },
    errorMessage: 'Failed to attach file to book',
    includeErrorDetail: true,
  });
}

// NOTE: rating updates are handled via `updateBook({ id, rating })` (PATCH).

export async function deleteBook(id: number) {
  await requestVoid(`/api/library/books/${id}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete book',
    includeErrorDetail: true,
  });
  return 'Success' as const;
}
