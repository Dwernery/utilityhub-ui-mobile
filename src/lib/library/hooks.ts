import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/context/toast';
import * as api from './api';
import { AUTHORS_KEY, BOOKS_KEY, SERIES_KEY } from './queryKeys';
import type { Book } from './types';
import { todayIso } from './utils/dateUtils';
import { uploadFileToS3, validateFile, type PickedFile } from './utils/s3Upload';

// ── Queries ────────────────────────────────────────────────────────────────

export function useBooks() {
  return useQuery({ queryKey: BOOKS_KEY, queryFn: api.getBooks });
}

export function useAuthors() {
  return useQuery({ queryKey: AUTHORS_KEY, queryFn: api.getAuthors });
}

export function useSeries() {
  return useQuery({ queryKey: SERIES_KEY, queryFn: api.getSeries });
}

/** Single book derived from the books cache, so sheets always reflect the latest server state. */
export function useBook(id: string | undefined) {
  const query = useBooks();
  return { ...query, data: id ? query.data?.find((b) => String(b.id) === String(id)) : undefined };
}

// ── Mutations ──────────────────────────────────────────────────────────────

function useInvalidatingMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, key: readonly string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export const useAddBook = () => useInvalidatingMutation(api.addBook, BOOKS_KEY);
export const useUpdateBook = () => useInvalidatingMutation(api.updateBook, BOOKS_KEY);
export const useDeleteBook = () => useInvalidatingMutation(api.deleteBook, BOOKS_KEY);
export const useCreateAuthor = () => useInvalidatingMutation(api.createAuthor, AUTHORS_KEY);
export const useCreateSeries = () => useInvalidatingMutation(api.createSeries, SERIES_KEY);

/**
 * Shared "start reading" mutation used by Randomize, StartReading and CurrentlyReading
 * so the payload shape and toast copy can't drift between call sites.
 */
export function useStartReading() {
  const updateBookMutation = useUpdateBook();
  const addToast = useToast();

  const startReading = (
    book: Pick<Book, 'id' | 'title'>,
    { onSuccess, onError }: { onSuccess?: () => void; onError?: (err: Error) => void } = {},
  ) => {
    updateBookMutation.mutate(
      { id: book.id, status: 'IN_PROGRESS', startDate: todayIso(), endDate: null, currentPage: 0 },
      {
        onSuccess: () => {
          addToast(`Started reading "${book.title}"`, 'success');
          onSuccess?.();
        },
        onError: (err) => {
          addToast(`Failed to start reading: ${err?.message || 'Unknown error'}`, 'error');
          onError?.(err);
        },
      },
    );
  };

  return { startReading, isPending: updateBookMutation.isPending };
}

/** Presigned URL → S3 PUT → attach to book → refetch books. */
export function useS3Upload() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ file, bookId, fileType = 'cover' }: { file: PickedFile; bookId: string; fileType?: string }) => {
      const validation = validateFile(file);
      if (!validation.valid) throw new Error(validation.error);

      setUploadProgress(0.05);
      const { presignedUrl, s3Key } = await api.getPresignedUploadUrl(file.name, file.mimeType);

      // The S3 PUT reports real progress; map it into the 5%–90% range.
      await uploadFileToS3(presignedUrl, file, (f) => setUploadProgress(0.05 + f * 0.85));

      const result = await api.attachFileToBook(bookId, s3Key, fileType);
      await queryClient.invalidateQueries({ queryKey: BOOKS_KEY });
      setUploadProgress(1);
      return result;
    },
    onError: () => setUploadProgress(0),
  });

  return {
    uploadFile: (file: PickedFile, bookId: string, fileType?: string) =>
      mutation.mutateAsync({ file, bookId, fileType }),
    isUploading: mutation.isPending,
    /** 0–1 */
    uploadProgress,
    error: mutation.error,
  };
}
