import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { accents, colors, spacing, type } from '@/constants/theme';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <SymbolView name="questionmark.folder" size={44} tintColor={colors.secondaryLabel} />
      <Text style={[type.title3, { color: colors.label }]}>This screen doesn’t exist</Text>
      <Link href="/" replace>
        <Text style={[type.headline, { color: accents.home }]}>Go to Home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});
