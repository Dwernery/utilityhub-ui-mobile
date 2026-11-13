import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { CoursesHomeCard } from '@/components/home/courses-home-card';
import { FinancesHomeCard } from '@/components/home/finances-home-card';
import { LibraryHomeCard } from '@/components/home/library-home-card';
import { McuHomeCard } from '@/components/home/mcu-home-card';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { colors, spacing, type } from '@/constants/theme';
import { useIsWide } from '@/hooks/use-is-wide';
import { haptics } from '@/lib/haptics';

export default function Home() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const twoColumn = useIsWide();

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.thud();
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScreenScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.brand}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Project SHIELD logo"
        />
        <Text style={[type.subheadline, styles.subtitle]}>Your personal command center</Text>
      </View>

      {twoColumn ? (
        // Wide: Library | MCU at equal height, Finances full width, Courses as a slim strip last.
        <>
          <View style={styles.columns}>
            <View style={styles.column}>
              <LibraryHomeCard style={styles.fill} />
            </View>
            <View style={styles.column}>
              <McuHomeCard style={styles.fill} />
            </View>
          </View>
          <FinancesHomeCard />
          <CoursesHomeCard compact />
        </>
      ) : (
        <>
          <LibraryHomeCard />
          <McuHomeCard />
          <CoursesHomeCard />
          <FinancesHomeCard />
        </>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xs, gap: spacing.lg, paddingBottom: spacing.xxl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.xs },
  logo: { width: 32, height: 32 },
  subtitle: { color: colors.secondaryLabel },
  columns: { flexDirection: 'row', gap: spacing.lg, alignItems: 'stretch' },
  column: { flex: 1, minWidth: 0 },
  fill: { flex: 1 },
});
