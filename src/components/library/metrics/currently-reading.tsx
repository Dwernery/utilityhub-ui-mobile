import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BookCover } from '@/components/library/book-cover';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { haptics } from '@/lib/haptics';
import { useUpdateBook } from '@/lib/library/hooks';
import type { Book } from '@/lib/library/types';
import { todayIso } from '@/lib/library/utils/dateUtils';
import { readingProgress } from '@/lib/library/utils/homeStats';

function PillButton({ title, icon, tint, onPress, disabled }: {
  title: string;
  icon: 'checkmark' | 'xmark';
  tint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.6 }, disabled && { opacity: 0.4 }]}>
      <SymbolView name={icon} size={11} weight="bold" tintColor={tint} />
      <Text style={[type.footnote, { color: tint, fontWeight: '600' }]}>{title}</Text>
    </Pressable>
  );
}

function ReadingRow({ book }: { book: Book }) {
  const updateBook = useUpdateBook();
  const addToast = useToast();
  const [pageText, setPageText] = useState(String(book.currentPage ?? 0));
  const { pct, days } = readingProgress(book);
  const pending = updateBook.isPending;

  const mutate = (vars: Parameters<typeof updateBook.mutate>[0], ok: string, fail: string) =>
    updateBook.mutate(vars, {
      onSuccess: () => addToast(ok, 'success'),
      onError: (err) => addToast(`${fail}: ${err?.message || 'Unknown error'}`, 'error'),
    });

  const commitPage = () => {
    const next = Number(pageText) || 0;
    if (next === (book.currentPage ?? 0)) return;
    mutate({ id: book.id, currentPage: next }, `Updated progress for ${book.title}`, 'Failed to update progress');
  };

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <BookCover book={book} width={36} />
        <View style={styles.rowText}>
          <Text style={[type.subheadline, { color: colors.label, fontWeight: '600' }]} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={[type.footnote, { color: colors.secondaryLabel }]} numberOfLines={1}>
            {book.authorName}
            {days !== null ? ` · ${days}d` : ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <PillButton
            title="Done"
            icon="checkmark"
            tint={colors.positive as string}
            disabled={pending}
            onPress={() => {
              haptics.success();
              mutate(
                { id: book.id, status: 'READ', endDate: todayIso(), currentPage: book.pages ?? null },
                `Marked ${book.title} as read`,
                'Failed to mark book read',
              );
            }}
          />
          <PillButton
            title="Remove"
            icon="xmark"
            tint={colors.secondaryLabel as string}
            disabled={pending}
            onPress={() =>
              mutate(
                { id: book.id, status: 'UNREAD', startDate: null, endDate: null, currentPage: 0 },
                `Removed ${book.title} from progress`,
                'Failed to remove book from progress',
              )
            }
          />
        </View>
      </View>
      <View style={styles.progressLine}>
        <ProgressBar value={pct / 100} tint={accents.library} height={5} style={styles.flex} />
        <TextInput
          value={pageText}
          onChangeText={(t) => setPageText(t.replace(/[^0-9]/g, ''))}
          onEndEditing={commitPage}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
          editable={!pending}
          accessibilityLabel={`Current page of ${book.title}`}
          style={[type.footnote, tabularNums, styles.pageInput]}
        />
        <Text style={[type.footnote, tabularNums, { color: colors.secondaryLabel }]}>/{book.pages ?? '?'}</Text>
        <Text style={[type.footnote, tabularNums, styles.pct]}>{pct}%</Text>
      </View>
    </View>
  );
}

/** "Currently Reading" card (ported from the web Metrics page). */
export function CurrentlyReadingCard({ books }: { books: Book[] }) {
  const reading = books.filter((b) => b.status === 'IN_PROGRESS');
  return (
    <Card padded={false}>
      <View style={styles.header}>
        <Text style={[type.headline, { color: colors.label, flex: 1 }]}>Currently Reading</Text>
        <Pressable
          onPress={() => router.push('/library/start-reading')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.startButton, pressed && { opacity: 0.7 }]}>
          <SymbolView name="plus" size={12} weight="bold" tintColor={colors.white} />
          <Text style={[type.footnote, { color: colors.white, fontWeight: '600' }]}>Start Reading</Text>
        </Pressable>
      </View>
      {reading.length > 0 ? (
        reading.map((book) => (
          <View key={book.id}>
            <View style={styles.separator} />
            <ReadingRow key={`${book.id}-${book.currentPage}`} book={book} />
          </View>
        ))
      ) : (
        <Text style={[type.subheadline, styles.empty]}>No books in progress.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, width: undefined },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: accents.library,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: spacing.lg },
  row: { padding: spacing.lg, gap: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  actions: { gap: 6, alignItems: 'stretch' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.tertiaryFill,
  },
  progressLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pageInput: {
    minWidth: 48,
    textAlign: 'center',
    color: colors.label,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.tertiaryFill,
  },
  pct: { color: colors.secondaryLabel, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  empty: { color: colors.secondaryLabel, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
