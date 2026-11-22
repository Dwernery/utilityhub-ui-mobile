import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormButtonRow, FormSection, FormTextField } from '@/components/ui/form';
import { colors, spacing, type } from '@/constants/theme';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { haptics } from '@/lib/haptics';
import { login } from '@/lib/http';

/**
 * Password sign-in. The session it starts is kept in the Keychain behind Face ID /
 * Touch ID, so after this the app only asks for your face or finger when it starts.
 * Mirrors the web app's SignInScreen (which also offers Touch ID passkeys).
 */
export function SignInScreen() {
  const keyboardInset = useKeyboardInset();
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setChecking(true);
    setError(null);
    try {
      await login(password);
      haptics.success(); // the app replaces this screen
      return;
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
        <Text style={[type.subheadline, styles.subtitle]}>Sign in to continue.</Text>
      </View>

      <FormSection footer="After this, Face ID or Touch ID opens the app. You'll only need the password again if you sign out or don't use the app for 30 days.">
        <FormTextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Required"
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="go"
          onSubmitEditing={signIn}
          editable={!checking}
        />
      </FormSection>

      {error ? (
        <Text style={[type.footnote, styles.error]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <FormSection>
        <FormButtonRow title={checking ? 'Signing In…' : 'Sign In'} onPress={signIn} disabled={checking} />
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
