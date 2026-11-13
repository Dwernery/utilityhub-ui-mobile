import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { BookForm, FormSheetToolbar, type BookDraft } from '@/components/library/book-form';
import { useToast } from '@/context/toast';
import { useAddBook, useS3Upload } from '@/lib/library/hooks';
import { BOOK_VALIDATION_MESSAGE, isBookValid } from '@/lib/library/utils/bookValidation';
import type { PickedFile } from '@/lib/library/utils/s3Upload';

const EMPTY: BookDraft = {
  title: '',
  authorName: '',
  seriesName: '',
  pages: '',
  isbn13: '',
  status: 'UNREAD',
  startDate: null,
  endDate: null,
};

export default function AddBook() {
  const [draft, setDraft] = useState<BookDraft>(EMPTY);
  const [file, setFile] = useState<PickedFile | null>(null);
  const addBook = useAddBook();
  const s3 = useS3Upload();
  const addToast = useToast();

  const busy = addBook.isPending || s3.isUploading;
  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY) || !!file;

  const save = async () => {
    if (!isBookValid(draft)) {
      addToast(BOOK_VALIDATION_MESSAGE, 'error');
      return;
    }
    const title = draft.title.trim();
    try {
      const created = await addBook.mutateAsync({
        title,
        authorName: draft.authorName.trim(),
        seriesName: draft.seriesName.trim(),
        pages: draft.pages,
        isbn13: draft.isbn13.trim(),
      });

      if (file && created?.id) {
        try {
          await s3.uploadFile(file, String(created.id), 'cover');
          addToast(`Book "${title}" saved and file uploaded`, 'success');
        } catch (e) {
          addToast(`Book saved, but file upload failed: ${(e as Error)?.message || 'Unknown error'}`, 'warning');
        }
      } else {
        addToast(`Book "${title}" saved`, 'success');
      }
      router.back();
    } catch (e) {
      addToast(`Failed to save book: ${(e as Error)?.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Book' }} />
      <FormSheetToolbar dirty={dirty} busy={busy} onSave={save} saveLabel="Save book" />
      <BookForm
        mode="add"
        draft={draft}
        setDraft={(fn) => setDraft(fn)}
        busy={busy}
        file={file}
        setFile={setFile}
        isUploading={s3.isUploading}
        uploadProgress={s3.uploadProgress}
      />
    </>
  );
}
