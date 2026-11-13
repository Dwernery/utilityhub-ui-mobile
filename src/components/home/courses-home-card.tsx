import { StyleSheet, Text, View } from 'react-native';

import { Card, CardHeader } from '@/components/ui/card';
import { colors, radius, spacing, type } from '@/constants/theme';

/**
 * Not tappable: the web links to `/courses`, which has no page.
 * `compact` = one-line strip (wide Home layout) instead of the dashed placeholder box.
 */
export function CoursesHomeCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Card>
        <CardHeader
          title="Courses"
          icon="graduationcap"
          tint={colors.secondaryLabel as string}
          accessory={
            <View style={styles.compactRight}>
              <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>Course data coming soon</Text>
              <Text style={[type.caption1, styles.badge]}>SOON</Text>
            </View>
          }
        />
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader
        title="Courses"
        icon="graduationcap"
        tint={colors.secondaryLabel as string}
        accessory={<Text style={[type.caption1, styles.badge]}>SOON</Text>}
      />
      <View style={styles.placeholder}>
        <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>Course data coming soon</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  compactRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    color: colors.secondaryLabel,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.tertiaryFill,
  },
  placeholder: {
    marginTop: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.separator,
  },
});
