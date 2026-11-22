import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormButtonRow, FormSection } from '@/components/ui/form';
import { colors, spacing, type } from '@/constants/theme';
import { clearSession, loadSession } from '@/lib/session';

/**
 * A session is saved, but Face ID / Touch ID was cancelled or didn't recognize you.
 * Try again, or sign in with the password instead (which replaces the saved session).
 */
export function LockedScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.brand}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <Text style={[type.title1, styles.title]} accessibilityRole="header">
          Project SHIELD
        </Text>
        <SymbolView name="faceid" size={44} tintColor={colors.secondaryLabel} />
        <Text style={[type.subheadline, styles.subtitle]}>
          Project SHIELD is locked. Use Face ID or Touch ID to open it.
        </Text>
      </View>

      <FormSection>
        <FormButtonRow title="Unlock" onPress={() => void loadSession()} />
      </FormSection>
      <FormSection>
        <FormButtonRow title="Sign In with Password" onPress={() => void clearSession()} />
      </FormSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.groupedBackground },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl * 2,
    gap: spacing.lg,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brand: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  logo: { width: 72, height: 72 },
  title: { color: colors.label },
  subtitle: { color: colors.secondaryLabel, textAlign: 'center' },
});
