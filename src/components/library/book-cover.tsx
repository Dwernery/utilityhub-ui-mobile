import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';
import type { Book } from '@/lib/library/types';

interface BookCoverProps {
  book: Pick<Book, 's3Url' | 'title'>;
  /** Width in points; height follows the 2:3 book aspect ratio. */
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/** Cached cover image (expo-image) with a placeholder glyph when there's no cover or it fails to load. */
export function BookCover({ book, width = 56, style }: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!book.s3Url && !failed;

  return (
    <View
      style={[styles.frame, { width, height: width * 1.5, borderRadius: Math.max(4, width * 0.08) }, style]}
      accessibilityRole="image"
      accessibilityLabel={`Cover of ${book.title}`}>
      {showImage ? (
        <Image
          source={{ uri: book.s3Url! }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          recyclingKey={book.s3Url!}
          onError={() => setFailed(true)}
        />
      ) : (
        <SymbolView name="book.closed" size={Math.round(width * 0.4)} tintColor={colors.tertiaryLabel} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tertiaryFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
});
