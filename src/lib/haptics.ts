import * as Haptics from 'expo-haptics';

/** Haptic vocabulary for the app — use these instead of calling expo-haptics directly so feedback stays consistent. */
export const haptics = {
  /** Picking a value: segmented control, star rating, picker row. */
  selection: () => void Haptics.selectionAsync(),
  /** A press that commits something small: toggling watched, checking "paid". */
  tap: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  /** A heavier physical moment: randomizer landing, pull-to-refresh trigger. */
  thud: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
