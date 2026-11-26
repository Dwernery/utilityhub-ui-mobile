import * as WebBrowser from 'expo-web-browser';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCover } from '@/components/courses/course-cover';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accentHex, accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useCourse, useDeleteCourse, useGroups, useSetProgress } from '@/lib/courses/hooks';
import { courseStatus, percentLabel, progressFraction } from '@/lib/courses/utils/stats';
import { haptics } from '@/lib/haptics';
import { parseIdParam } from '@/lib/routeParams';

/** One course: cover, progress ring, big −/+ and a link to the course. */
export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: course } = useCourse(parseIdParam(id));
  const { data: groups = [] } = useGroups();
  const setProgress = useSetProgress();
  const deleteCourse = useDeleteCourse();
  const addToast = useToast();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === 'dark';

  if (!course) {
    return (
      <>
        <Stack.Screen options={{ title: 'Course' }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>This course no longer exists.</Text>
        </View>
      </>
    );
  }

  const status = courseStatus(course);
  // The ring is SVG, so it needs a hex color: system green when done.
  const ringTint = status === 'DONE' ? accentHex.finances : accentHex.courses;
  const groupName = groups.find((g) => g.id === course.groupId)?.name ?? 'Ungrouped';

  const set = (next: number) => {
    const clamped = Math.min(course.totalLessons, Math.max(0, next));
    if (clamped === course.completedLessons) return;
    if (clamped === course.totalLessons) haptics.success();
    else haptics.tap();
    setProgress.mutate(
      { id: course.id, completedLessons: clamped },
      {
        onSuccess: () => {
          if (clamped === course.totalLessons) addToast(`Finished "${course.title}"`, 'success');
        },
        onError: (err) => addToast(err?.message || "Couldn't save progress", 'error'),
      },
    );
  };

  const typeCount = () =>
    Alert.prompt(
      'Lessons Done',
      `From 0 to ${course.totalLessons}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (text?: string) => {
            const n = Number((text ?? '').trim());
            if (!Number.isInteger(n) || n < 0 || n > course.totalLessons) {
              addToast(`Enter a whole number from 0 to ${course.totalLessons}`, 'error');
              return;
            }
            set(n);
          },
        },
      ],
      'plain-text',
      String(course.completedLessons),
      'number-pad',
    );

  const onDelete = () => {
    haptics.warning();
    Alert.alert(`Delete “${course.title}”?`, "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteCourse.mutate(course.id, {
            onSuccess: () => {
              addToast(`Deleted "${course.title}"`, 'success');
              router.back();
            },
            onError: (err) => addToast(err?.message || "Couldn't delete the course", 'error'),
          }),
      },
    ]);
  };

  return (
    <>
      {/* Solid header, so the content starts below it and the fitted height includes it. */}
      <Stack.Screen
        options={{
          title: 'Course',
          headerTransparent: false,
          headerShadowVisible: false,
          // The header takes only a plain color: iOS's grouped background in a sheet (light / dark),
          // so it matches the body below.
          headerStyle: { backgroundColor: dark ? '#1C1C1E' : '#F2F2F7' },
          contentStyle: { backgroundColor: colors.groupedBackground },
        }}
      />
      <SheetCloseButton />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="pencil"
          accessibilityLabel="Edit course"
          disabled={deleteCourse.isPending}
          onPress={() => router.push({ pathname: '/courses/course/[id]/edit', params: { id: String(course.id) } })}
        />
        <Stack.Toolbar.Button
          icon="trash"
          tintColor={colors.negative}
          accessibilityLabel="Delete course"
          disabled={deleteCourse.isPending}
          onPress={onDelete}
        />
      </Stack.Toolbar>

      {/* A plain View, not a ScrollView: the sheet fits its content, and only a View reports its height. */}
      {/* iOS adds the bottom safe area to a fitted sheet itself. */}
      <View style={[styles.content, { paddingBottom: spacing.md }]}>
        {/* On the folded iPhone Duo the sheet's buttons sit in a rail over the right edge: keep the text clear of it. */}
        <View style={[styles.hero, { paddingRight: insets.right }]}>
          <CourseCover course={course} width={112} />
          <View style={styles.heroText}>
            <Text style={[type.headline, { color: colors.label }]} numberOfLines={3} selectable>
              {course.title}
            </Text>
            <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>{course.creatorName}</Text>
            <View style={styles.meta}>
              <SymbolView name="folder" size={12} tintColor={colors.tertiaryLabel} />
              <Text style={[type.footnote, styles.metaText]} numberOfLines={1}>
                {groupName}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressCard}>
          {/* One short row (ring beside the controls), so −/+ stay on screen at the sheet's first height. */}
          <ProgressRing value={progressFraction(course.completedLessons, course.totalLessons)} tint={ringTint} size={84} strokeWidth={8}>
            <Text style={[type.headline, tabularNums, { color: colors.label }]}>
              {percentLabel(course.completedLessons, course.totalLessons)}
            </Text>
          </ProgressRing>
          <View style={styles.controls}>
            <Pressable
              onPress={typeCount}
              accessibilityRole="button"
              accessibilityLabel={`${course.completedLessons} of ${course.totalLessons} lessons done`}
              accessibilityHint="Type a number of lessons done"
              hitSlop={8}
              style={({ pressed }) => [styles.count, pressed && { opacity: 0.6 }]}>
              <Text style={[type.title3, tabularNums, { color: colors.label }]}>
                {course.completedLessons}
                <Text style={{ color: colors.secondaryLabel }}> / {course.totalLessons}</Text>
              </Text>
              <Text style={[type.caption1, { color: accents.courses }]}>lessons · tap to type</Text>
            </Pressable>
            <View style={styles.stepper}>
              <BigStep
                icon="minus"
                label="One lesson fewer done"
                disabled={course.completedLessons <= 0}
                onPress={() => set(course.completedLessons - 1)}
              />
              <BigStep
                icon="plus"
                label="One more lesson done"
                disabled={status === 'DONE'}
                onPress={() => set(course.completedLessons + 1)}
                prominent
              />
            </View>
          </View>
        </View>

        {course.url ? (
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(course.url!)}
            accessibilityRole="link"
            style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: colors.fill }]}>
            <SymbolView name="safari" size={18} tintColor={accents.courses} />
            <Text style={[type.body, { color: accents.courses, flex: 1 }]}>Open course</Text>
            <SymbolView name="arrow.up.right" size={12} weight="semibold" tintColor={colors.tertiaryLabel} />
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

function BigStep({
  icon,
  label,
  disabled,
  onPress,
  prominent = false,
}: {
  icon: 'minus' | 'plus';
  label: string;
  disabled: boolean;
  onPress: () => void;
  prominent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.bigStep,
        { backgroundColor: prominent ? accents.courses : colors.tertiaryFill },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.3 },
      ]}>
      <SymbolView name={icon} size={22} weight="bold" tintColor={prominent ? colors.white : colors.label} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg, gap: spacing.md },
  hero: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  heroText: { flex: 1, minWidth: 0, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs },
  metaText: { flexShrink: 1, color: colors.secondaryLabel },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.secondaryGroupedBackground,
  },
  controls: { flex: 1, minWidth: 0, gap: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bigStep: { width: 52, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  count: { alignSelf: 'flex-start' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.secondaryGroupedBackground,
  },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
