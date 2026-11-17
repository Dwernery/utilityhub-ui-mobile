export type BookStatus = 'UNREAD' | 'IN_PROGRESS' | 'READ';

// Mirrors the API's BookResponseDTO / AuthorResponseDTO / SeriesResponseDTO.
// Every field is always present in the JSON; "| null" marks the ones that can be empty.
export interface Book {
  id: number;
  title: string;
  authorName: string;
  seriesName: string | null;
  pages: number;
  currentPage: number | null;
  status: BookStatus;
  /** `YYYY-MM-DD` */
  startDate: string | null;
  /** `YYYY-MM-DD` */
  endDate: string | null;
  /** 1–5 */
  rating: number | null;
  /** Cover image URL */
  s3Url: string | null;
}

export interface Author {
  id: number;
  fullName: string;
}

export interface Series {
  id: number;
  name: string;
}

export interface NewBookInput {
  title: string;
  pages?: number | string | null;
  authorName: string;
  seriesName?: string | null;
}

/** PATCH payload — only defined fields are sent. */
export type BookUpdate = { id: number } & Partial<{
  title: string;
  authorName: string;
  seriesName: string | null;
  pages: number | string | null;
  currentPage: number | string | null;
  status: BookStatus;
  startDate: string | null;
  endDate: string | null;
  rating: number | string | null;
}>;

export interface PresignedUpload {
  presignedUrl: string;
  s3Key: string;
}

export type StatusFilter = 'ALL' | BookStatus;
