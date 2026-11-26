import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { accents, colors } from '@/constants/theme';
import type { Course } from '@/lib/courses/types';

/**
 * A course's cover at 16:9 (course thumbnails are landscape, unlike book covers), or a
 * placeholder glyph when there's none or it fails to load. Like the web's CourseCover.
 */
export function CourseCover({
  course,
  width = 64,
  style,
}: {
  course: Pick<Course, 's3Url' | 'title'> | { s3Url: string | null; title: string };
  /** Points; height follows 16:9. */
  width?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!course.s3Url && !failed;
  return (
    <View
      style={[styles.frame, { width, height: Math.round((width * 9) / 16), borderRadius: Math.max(4, width * 0.06) }, style]}
      accessibilityRole="image"
      accessibilityLabel={`Cover of ${course.title}`}>
      {showImage ? (
        <Image
          source={{ uri: course.s3Url! }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          onError={() => setFailed(true)}
        />
      ) : (
        <SymbolView name="graduationcap.fill" size={Math.max(12, width * 0.28)} tintColor={accents.courses} style={styles.glyph} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    backgroundColor: colors.tertiaryFill,
  },
  glyph: { opacity: 0.55 },
});
