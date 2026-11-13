import { SymbolView, type SFSymbol } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import type { Book, BookStatus } from '@/lib/library/types';

import { BookCover } from './book-cover';
import { StarRating } from './star-rating';

const STATUS_GLYPH: Record<BookStatus, { icon: SFSymbol; tint: string; label: string }> = {
  READ: { icon: 'checkmark.circle.fill', tint: colors.positive as string, label: 'Read' },
  IN_PROGRESS: { icon: 'smallcircle.filled.circle', tint: accents.library as string, label: 'Reading' },
  UNREAD: { icon: 'circle', tint: colors.tertiaryLabel as string, label: 'Unread' },
};

export function StatusGlyph({ status, size = 16 }: { status: BookStatus; size?: number }) {
  const g = STATUS_GLYPH[status] ?? STATUS_GLYPH.UNREAD;
  return <SymbolView name={g.icon} size={size} tintColor={g.tint} accessibilityLabel={g.label} />;
}

interface BookRowProps {
  book: Book;
  onPress: (book: Book) => void;
  /** Second line: series (tappable) for author-grouped lists, author for series lists. */
  secondary?: 'series' | 'author';
  onSeriesPress?: (series: string) => void;
  /** Position in an inset group, for rounded corners and separators. */
  first?: boolean;
  last?: boolean;
}

/** One book in an inset grouped list (inventory, author sheet, series sheet). */
export const BookRow = memo(function BookRow({
  book,
  onPress,
  secondary = 'series',
  onSeriesPress,
  first,
  last,
}: BookRowProps) {
  const status = STATUS_GLYPH[book.status] ?? STATUS_GLYPH.UNREAD;
  return (
    <Pressable
      onPress={() => onPress(book)}
      accessibilityRole="button"
      accessibilityLabel={[
        book.title,
        secondary === 'author' ? `by ${book.authorName}` : book.seriesName,
        status.label,
        book.rating ? `${book.rating} stars` : null,
        book.pages ? `${book.pages} pages` : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [
        styles.row,
        first && styles.first,
        last && styles.last,
        pressed && styles.pressed,
      ]}>
      <BookCover book={book} width={40} />
      <StatusGlyph status={book.status} />
      <View style={styles.body}>
        <Text style={[type.subheadline, styles.title]} numberOfLines={2}>
          {book.title}
        </Text>
        {secondary === 'series' && book.seriesName ? (
          <Pressable
            onPress={() => onSeriesPress?.(book.seriesName!)}
            disabled={!onSeriesPress}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="link">
            <Text style={[type.footnote, { color: accents.library }]} numberOfLines={1}>
              {book.seriesName}
            </Text>
          </Pressable>
        ) : secondary === 'author' ? (
          <Text style={[type.footnote, { color: colors.secondaryLabel }]} numberOfLines={1}>
            by {book.authorName}
          </Text>
        ) : null}
        {(book.rating ?? 0) > 0 && <StarRating value={book.rating} readonly size="sm" />}
      </View>
      {book.pages ? (
        <Text style={[type.caption1, tabularNums, styles.pages]}>{book.pages} pages</Text>
      ) : null}
      <SymbolView name="chevron.right" size={12} weight="semibold" tintColor={colors.tertiaryLabel} />
      {!last && <View style={styles.separator} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.secondaryGroupedBackground,
  },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderCurve: 'continuous' },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, borderCurve: 'continuous' },
  pressed: { backgroundColor: colors.fill },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { color: colors.label, fontWeight: '500' },
  pages: { color: colors.secondaryLabel },
  separator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: spacing.lg + 40 + spacing.md,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
});
