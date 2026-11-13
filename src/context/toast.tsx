import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, type as typeScale } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, timeout?: number) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', timeout = 4000) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      if (type === 'success') haptics.success();
      else if (type === 'error') haptics.error();
      else if (type === 'warning') haptics.warning();
      if (timeout > 0) setTimeout(() => removeToast(id), timeout);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

/** Returns `addToast(message, type?, timeout?)` — same API as the web client. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx.addToast;
}

const TOAST_STYLE: Record<ToastType, { icon: SFSymbol; tint: string }> = {
  success: { icon: 'checkmark.circle.fill', tint: '#30d158' },
  warning: { icon: 'exclamationmark.triangle.fill', tint: '#ff9f0a' },
  error: { icon: 'xmark.octagon.fill', tint: '#ff453a' },
  info: { icon: 'info.circle.fill', tint: '#0a84ff' },
};

/** Glass banners that drop in from the top (the native place for transient status), with haptics. */
function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const glass = isLiquidGlassAvailable();

  return (
    <View pointerEvents="box-none" style={[styles.stack, { top: insets.top + spacing.sm }]}>
      {toasts.map((t) => {
        const { icon, tint } = TOAST_STYLE[t.type];
        const content = (
          <>
            <SymbolView name={icon} size={20} tintColor={tint} />
            <Text style={[typeScale.subheadline, styles.text]} numberOfLines={3}>
              {t.message}
            </Text>
          </>
        );
        return (
          <Animated.View
            key={t.id}
            entering={reduceMotion ? undefined : FadeInUp.springify().damping(18)}
            exiting={reduceMotion ? undefined : FadeOutUp.duration(180)}
            layout={reduceMotion ? undefined : LinearTransition.springify().damping(18)}
            style={styles.row}>
            <Pressable
              onPress={() => onDismiss(t.id)}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              accessibilityHint="Double-tap to dismiss">
              {glass ? (
                <GlassView style={styles.toast} isInteractive>
                  {content}
                </GlassView>
              ) : (
                <View style={[styles.toast, styles.fallback]}>{content}</View>
              )}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  row: { width: '100%', maxWidth: 480 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
  },
  fallback: {
    backgroundColor: colors.secondaryGroupedBackground,
    boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
  },
  text: { flex: 1, color: colors.label },
});
