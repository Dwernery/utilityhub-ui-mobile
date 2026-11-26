import { SymbolView } from 'expo-symbols';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ui/progress-bar';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import type { Course } from '@/lib/courses/types';
import { courseStatus, progressFraction } from '@/lib/courses/utils/stats';

import { CourseCover } from './course-cover';

interface CourseRowProps {
  course: Course;
  onPress: (course: Course) => void;
  /** −1 or +1 lesson done. */
  onStep: (course: Course, delta: number) => void;
  /** Position in an inset group, for rounded corners and separators. */
  last?: boolean;
}

const COVER = 56;

/** One course in an inset grouped list: cover, title, creator, progress, and −/+ (like the web's CourseRow). */
export const CourseRow = memo(function CourseRow({ course, onPress, onStep, last }: CourseRowProps) {
  const done = courseStatus(course) === 'DONE';

  return (
    <View style={[styles.row, last && styles.last]}>
      <Pressable
        onPress={() => onPress(course)}
        accessibilityRole="button"
        accessibilityLabel={`${course.title}, by ${course.creatorName}, ${course.completedLessons} of ${course.totalLessons} lessons${done ? ', finished' : ''}`}
        accessibilityHint="Opens course details"
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <CourseCover course={course} width={COVER} />
        <View style={styles.body}>
          <View style={styles.titleLine}>
            <Text style={[type.subheadline, styles.title, done && styles.doneTitle]} numberOfLines={2}>
              {course.title}
            </Text>
            {done && <SymbolView name="checkmark.circle.fill" size={14} tintColor={colors.positive} />}
          </View>
          <Text style={[type.caption1, styles.muted]} numberOfLines={1}>
            {course.creatorName}
          </Text>
          <View style={styles.progressLine}>
            <ProgressBar
              value={progressFraction(course.completedLessons, course.totalLessons)}
              tint={done ? colors.positive : accents.courses}
              height={4}
              style={styles.bar}
            />
            <Text style={[type.caption2, tabularNums, styles.muted]}>
              {course.completedLessons}/{course.totalLessons}
            </Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.stepper}>
        <StepButton
          icon="minus.circle"
          label={`One lesson fewer done in ${course.title}`}
          disabled={course.completedLessons <= 0}
          onPress={() => onStep(course, -1)}
        />
        <StepButton
          icon="plus.circle.fill"
          label={`One more lesson done in ${course.title}`}
          disabled={done}
          onPress={() => onStep(course, 1)}
        />
      </View>
      {!last && <View style={styles.separator} />}
    </View>
  );
});

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'minus.circle' | 'plus.circle.fill';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.step, pressed && { opacity: 0.5 }, disabled && { opacity: 0.25 }]}>
      <SymbolView name={icon} size={26} tintColor={icon === 'minus.circle' ? colors.secondaryLabel : accents.courses} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
    backgroundColor: colors.secondaryGroupedBackground,
  },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, borderCurve: 'continuous' },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: colors.fill },
  body: { flex: 1, minWidth: 0, gap: 2 },
  titleLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  title: { flexShrink: 1, color: colors.label, fontWeight: '500' },
  doneTitle: { color: colors.secondaryLabel },
  muted: { color: colors.secondaryLabel },
  progressLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  bar: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  separator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: spacing.lg + COVER + spacing.md,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
});
