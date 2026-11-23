import { Alert, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ProgressRing } from '@/components/ui/progress-ring';
import { accentHex, accents, colors, spacing, tabularNums, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { haptics } from '@/lib/haptics';
import { useDeleteGoal, useGoals, useSetGoal } from '@/lib/library/hooks';
import { goalProgress } from '@/lib/library/utils/pace';

/**
 * Setting, editing and removing this year's goal (a number prompt), shared by the Metrics
 * toolbar's goal menu and a tap on the goal card. `ready` is false while goals load or if they
 * can't be loaded; then neither shows.
 */
export function useGoalEditor(year: number) {
  const { data: goals, isSuccess } = useGoals();
  const setGoal = useSetGoal();
  const deleteGoal = useDeleteGoal();
  const addToast = useToast();
  const goal = goals?.find((g) => g.year === year);
  const busy = setGoal.isPending || deleteGoal.isPending;

  const save = (text: string | undefined) => {
    const target = Number(text);
    if (!Number.isInteger(target) || target < 1 || target > 1000) {
      addToast('Enter a number of books from 1 to 1000', 'warning');
      return;
    }
    if (target === goal?.target) return;
    setGoal.mutate(
      { year, target },
      {
        onSuccess: () => {
          haptics.success();
          addToast(`${year} goal: ${target} books`, 'success');
        },
        onError: (err) => addToast(`Failed to save goal: ${err?.message || 'Unknown error'}`, 'error'),
      },
    );
  };

  const remove = () =>
    deleteGoal.mutate(year, {
      onSuccess: () => addToast(`Removed the ${year} goal`, 'success'),
      onError: (err) => addToast(`Failed to remove goal: ${err?.message || 'Unknown error'}`, 'error'),
    });

  const edit = () => {
    haptics.selection();
    Alert.prompt(
      `${year} reading goal`,
      'How many books do you want to finish this year?',
      [
        { text: 'Cancel', style: 'cancel' },
        ...(goal ? [{ text: 'Remove Goal', style: 'destructive' as const, onPress: remove }] : []),
        { text: 'Save', isPreferred: true, onPress: save },
      ],
      'plain-text',
      goal ? String(goal.target) : '',
      'number-pad',
    );
  };

  return { ready: isSuccess, goal, busy, edit, remove };
}

/**
 * This year's reading goal: "18 of 25 · 2 ahead of pace", or nothing until one is set (from the
 * toolbar's goal menu, which also edits it; the card itself isn't tappable). The web shows its
 * buttons in the card instead.
 */
export function GoalCard({ year, done, stacked = false, style }: {
  year: number;
  done: number;
  /** Beside Currently Reading (wide layouts): a short column instead of two rows. */
  stacked?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { ready, goal } = useGoalEditor(year);
  if (!ready || !goal) return null;

  const progress = goalProgress(done, goal.target, year);
  const good = progress.status === 'met' || progress.status === 'ahead' || progress.status === 'onPace';
  const statusColor = good ? colors.positive : colors.secondaryLabel;

  // Beside Currently Reading: "2026 Goal", then a ring with "18 / 25" inside and the status under it.
  if (stacked) {
    return (
      // The wrapper takes the row slot (`style`); the surface fills it, so heights match.
      <Card containerStyle={style} style={styles.fill}>
        <Text style={[type.headline, { color: colors.label }]}>{year} Goal</Text>
        {/* A ring fills the space under the title whatever height Currently Reading gives the row. */}
        <View style={styles.ringArea}>
          <ProgressRing value={progress.pct / 100} tint={accentHex.library}>
            <Text style={[type.title3, tabularNums, { color: colors.label, fontWeight: '700' }]}>
              {done}
              <Text style={[type.subheadline, { color: colors.secondaryLabel, fontWeight: '400' }]}> / {goal.target}</Text>
            </Text>
          </ProgressRing>
          <Text style={[type.footnote, tabularNums, { color: statusColor, textAlign: 'center' }]}>{progress.label}</Text>
        </View>
      </Card>
    );
  }

  // Stacked layouts: two rows, "2026 Goal  18 of 25 · 2 ahead of pace", then a thin bar.
  return (
    <Card style={style}>
      <View style={styles.row}>
        <Text style={[type.headline, { color: colors.label }]}>{year} Goal</Text>
        <Text style={[type.subheadline, tabularNums, styles.summary]} numberOfLines={1}>
          {done} of {goal.target} · <Text style={{ color: statusColor }}>{progress.label}</Text>
        </Text>
      </View>
      <ProgressBar value={progress.pct / 100} tint={accents.library} height={4} style={styles.bar} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summary: { flex: 1, minWidth: 0, color: colors.secondaryLabel },
  bar: { width: undefined, marginTop: spacing.sm },
  fill: { flex: 1 },
  ringArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.md },
});
