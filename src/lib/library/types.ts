export type BookStatus = 'UNREAD' | 'IN_PROGRESS' | 'READ';

export interface Book {
  id: string;
  title: string;
  authorName: string;
  seriesName?: string | null;
  pages?: number | null;
  currentPage?: number | null;
  status: BookStatus;
  /** `YYYY-MM-DD` */
  startDate?: string | null;
  /** `YYYY-MM-DD` */
  endDate?: string | null;
  rating?: number | null;
  isbn13?: string | null;
  /** Cover image URL */
  s3Url?: string | null;
}

export interface Author {
  id: string;
  fullName: string;
}

export interface Series {
  id: string;
  name: string;
}

export interface NewBookInput {
  title: string;
  pages?: number | string | null;
  authorName: string;
  seriesName?: string | null;
  isbn13?: string | null;
}

/** PATCH payload — only defined fields are sent. */
export type BookUpdate = { id: string } & Partial<{
  title: string;
  authorName: string;
  seriesName: string | null;
  pages: number | string | null;
  currentPage: number | string | null;
  status: BookStatus;
  startDate: string | null;
  endDate: string | null;
  rating: number | string | null;
  isbn13: string | null;
}>;

export interface PresignedUpload {
  presignedUrl: string;
  s3Key: string;
}

export type StatusFilter = 'ALL' | BookStatus;
