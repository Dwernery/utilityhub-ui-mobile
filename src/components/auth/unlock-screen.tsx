import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormButtonRow, FormSection, FormTextField } from '@/components/ui/form';
import { colors, spacing, type } from '@/constants/theme';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { setApiToken } from '@/lib/apiToken';
import { haptics } from '@/lib/haptics';
import { checkApiToken } from '@/lib/http';

/**
 * Asks for the access token (the API_TOKEN set on the server). It is checked
 * against the API before being saved, so a typo gets a clear message.
 * Mirrors the web app's UnlockScreen.
 */
export function UnlockScreen() {
  const keyboardInset = useKeyboardInset();
  const [token, setToken] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = async () => {
    const candidate = token.trim();
    if (!candidate) {
      setError('Enter your access token.');
      return;
    }

    setChecking(true);
    setError(null);
    try {
      if ((await checkApiToken(candidate)) === 'valid') {
        haptics.success();
        await setApiToken(candidate); // the app replaces this screen
        return;
      }
      setError("That token isn't right. Check it and try again.");
    } catch (err) {
      // fetch throws a TypeError when the server can't be reached at all.
      setError(
        err instanceof TypeError
          ? "Couldn't reach the server. Check your connection and try again."
          : (err as Error).message,
      );
    }
    haptics.error();
    setChecking(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: keyboardInset }}
      scrollIndicatorInsets={{ bottom: keyboardInset }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive">
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
        <Text style={[type.subheadline, styles.subtitle]}>Enter your access token to continue.</Text>
      </View>

      <FormSection footer="It's the API_TOKEN from the server's .env. It's kept in this device's Keychain.">
        <FormTextField
          label="Token"
          value={token}
          onChangeText={setToken}
          placeholder="Paste your token"
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="go"
          onSubmitEditing={unlock}
          editable={!checking}
        />
      </FormSection>

      {error ? (
        <Text style={[type.footnote, styles.error]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <FormSection>
        <FormButtonRow title={checking ? 'Checking…' : 'Unlock'} onPress={unlock} disabled={checking} />
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
  error: { color: colors.negative, marginHorizontal: spacing.lg, marginTop: -spacing.sm },
});
