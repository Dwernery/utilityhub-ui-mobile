import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BookForm, FormSheetToolbar, type BookDraft } from '@/components/library/book-form';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { colors, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useBook, useS3Upload, useUpdateBook } from '@/lib/library/hooks';
import type { Book, BookUpdate } from '@/lib/library/types';
import { BOOK_VALIDATION_MESSAGE, isBookValid } from '@/lib/library/utils/bookValidation';
import type { PickedFile } from '@/lib/library/utils/s3Upload';

const toDraft = (b: Book): BookDraft => ({
  title: b.title ?? '',
  authorName: b.authorName ?? '',
  seriesName: b.seriesName ?? '',
  pages: b.pages != null ? String(b.pages) : '',
  isbn13: b.isbn13 ?? '',
  status: b.status,
  startDate: b.startDate ?? null,
  endDate: b.endDate ?? null,
});

/** Same normalization the web used to decide which fields changed. */
const normalize = (d: BookDraft) => ({
  title: d.title.trim(),
  pages: d.pages === '' ? null : Number(d.pages),
  authorName: d.authorName.trim(),
  seriesName: d.seriesName.trim() || null,
  isbn13: d.isbn13 || null,
  status: d.status,
  startDate: d.startDate || null,
  endDate: d.endDate || null,
});

export default function EditBook() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: book } = useBook(id);

  if (!book) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Book' }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>This book no longer exists.</Text>
        </View>
      </>
    );
  }
  // Keyed by id so the draft initializes from the book once, like the web's `useState(() => ({...selectedBook}))`.
  return <EditBookForm key={book.id} book={book} />;
}

function EditBookForm({ book }: { book: Book }) {
  const [original] = useState(() => toDraft(book));
  const [draft, setDraft] = useState<BookDraft>(original);
  const [file, setFile] = useState<PickedFile | null>(null);
  const updateBook = useUpdateBook();
  const s3 = useS3Upload();
  const addToast = useToast();

  const busy = updateBook.isPending || s3.isUploading;
  const current = normalize(draft);
  const before = normalize(original);
  const changed = (Object.keys(current) as (keyof typeof current)[]).filter((k) => current[k] !== before[k]);
  const dirty = changed.length > 0 || !!file;

  const save = async () => {
    if (!isBookValid(draft)) return addToast(BOOK_VALIDATION_MESSAGE, 'error');
    if (draft.status === 'IN_PROGRESS' && !draft.startDate)
      return addToast('Start date is required when status is In-Progress', 'error');
    if (draft.status === 'READ' && !draft.startDate) return addToast('Start date is required when status is Read', 'error');
    if (draft.status === 'READ' && !draft.endDate) return addToast('End date is required when status is Read', 'error');

    const payload: BookUpdate = { id: book.id };
    for (const k of changed) Object.assign(payload, { [k]: current[k] });
    const title = current.title;

    try {
      if (changed.length) await updateBook.mutateAsync(payload);

      if (file) {
        try {
          await s3.uploadFile(file, String(book.id), 'cover');
          addToast(`Book "${title}" updated and file uploaded`, 'success');
        } catch (e) {
          addToast(`Book updated, but file upload failed: ${(e as Error)?.message || 'Unknown error'}`, 'warning');
        }
      } else if (changed.length) {
        addToast(`Book "${title}" updated`, 'success');
      } else {
        addToast('No changes to save', 'info');
      }
      router.back();
    } catch (e) {
      addToast(`Failed to update book: ${(e as Error)?.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Book' }} />
      <FormSheetToolbar dirty={dirty} busy={busy} onSave={save} saveLabel="Save changes" />
      <BookForm
        mode="edit"
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

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
