import { router, Stack, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseRow } from '@/components/courses/course-row';
import { LoadError } from '@/components/ui/load-error';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SkeletonListGroup } from '@/components/ui/skeleton';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useIsWide } from '@/hooks/use-is-wide';
import { useCourses, useGroups, useSetProgress } from '@/lib/courses/hooks';
import type { Course } from '@/lib/courses/types';
import {
  courseOrder,
  courseSections,
  holdOrder,
  matchesSearch,
  percentLabel,
  progressFraction,
  sumStats,
  type CourseSection,
} from '@/lib/courses/utils/stats';
import { haptics } from '@/lib/haptics';

const sectionKey = (s: CourseSection) => String(s.group?.id ?? 'ungrouped');
const openCourse = (course: Course) =>
  router.push({ pathname: '/courses/course/[id]', params: { id: String(course.id) } });

/**
 * Courses by group, like the web's Courses page. A group opens and closes from its header;
 * only groups with a course in progress start open. Search shows just the matches.
 */
export default function Courses() {
  const insets = useSafeAreaInsets();
  const wide = useIsWide();
  const courses = useCourses();
  const groups = useGroups();
  const setProgress = useSetProgress();
  const addToast = useToast();
  const [search, setSearch] = useState('');
  // Decided once, when the data first arrives; after that only taps change it, so a group
  // never snaps shut under you (say, when you finish its last course in progress).
  const [openKeys, setOpenKeys] = useState<Map<string, boolean> | null>(null);

  // The order courses were in when you arrived. Held while you tap −/+, so a row doesn't jump
  // (a course you start would otherwise move up to the in-progress ones); null re-sorts.
  const [heldOrder, setHeldOrder] = useState<Map<number, number> | null>(null);
  // Only a pull shows the refresh spinner; a reload after −/+ happens quietly.
  const [pulling, setPulling] = useState(false);

  const sortedSections = useMemo(
    () => courseSections(courses.data ?? [], groups.data ?? []),
    [courses.data, groups.data],
  );
  const allSections = useMemo(
    () => (heldOrder ? holdOrder(sortedSections, heldOrder) : sortedSections),
    [sortedSections, heldOrder],
  );
  if (courses.data && groups.data) {
    if (openKeys === null) {
      setOpenKeys(new Map(sortedSections.map((s) => [sectionKey(s), s.stats.coursesInProgress > 0])));
    }
    if (heldOrder === null) setHeldOrder(courseOrder(sortedSections));
  }
  // Coming back to the tab re-sorts.
  useFocusEffect(useCallback(() => () => setHeldOrder(null), []));

  const searching = search.trim() !== '';
  const shownSections = useMemo(() => {
    if (!searching) return allSections;
    return allSections
      .map((s) => ({ ...s, courses: s.courses.filter((c) => matchesSearch(c, search)) }))
      .filter((s) => s.courses.length > 0);
  }, [allSections, search, searching]);

  // Searching opens every group with a match. A group made after the page loaded starts open.
  const isOpen = useCallback(
    (s: CourseSection) => searching || (openKeys?.get(sectionKey(s)) ?? true),
    [searching, openKeys],
  );
  const toggle = (s: CourseSection) => {
    haptics.selection();
    setOpenKeys((keys) => new Map(keys).set(sectionKey(s), !isOpen(s)));
  };

  const listSections = shownSections.map((s) => ({ section: s, key: sectionKey(s), data: isOpen(s) ? s.courses : [] }));
  const totals = sumStats(courses.data ?? []);

  const step = useCallback(
    (course: Course, delta: number) => {
      const next = Math.min(course.totalLessons, Math.max(0, course.completedLessons + delta));
      if (next === course.completedLessons) return;
      if (next === course.totalLessons) haptics.success();
      else haptics.tap();
      setProgress.mutate(
        { id: course.id, completedLessons: next },
        {
          onSuccess: () => {
            if (next === course.totalLessons) addToast(`Finished "${course.title}"`, 'success');
          },
          onError: (err) => addToast(err?.message || "Couldn't save progress", 'error'),
        },
      );
    },
    [setProgress, addToast],
  );

  const failed = courses.isLoadingError ? courses : groups.isLoadingError ? groups : null;
  const loading = courses.isPending || groups.isPending;
  const nothingYet = !loading && !failed && (courses.data ?? []).length === 0 && (groups.data ?? []).length === 0;

  return (
    <>
      <Stack.SearchBar
        placeholder="Search title or creator"
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearch('')}
        hideWhenScrolling={false}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="Manage">
          <Stack.Toolbar.MenuAction icon="folder" onPress={() => router.push('/courses/groups')}>
            Groups
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="person.2" onPress={() => router.push('/courses/creators')}>
            Creators
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Add course" onPress={() => router.push('/courses/add')} />
      </Stack.Toolbar>

      <SectionList
        sections={listSections}
        keyExtractor={(c) => String(c.id)}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        style={styles.list}
        contentContainerStyle={[
          { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right, paddingBottom: spacing.xxl },
          wide && styles.readable,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={async () => {
              setPulling(true);
              try {
                await Promise.all([courses.refetch(), groups.refetch()]);
              } finally {
                setHeldOrder(null); // a pull re-sorts
                setPulling(false);
              }
            }}
          />
        }
        ListHeaderComponent={
          totals.totalLessons > 0 && !searching ? (
            <View style={styles.summary} accessible accessibilityLabel={`${totals.completedLessons} of ${totals.totalLessons} lessons, ${percentLabel(totals.completedLessons, totals.totalLessons)}`}>
              <Text style={[type.footnote, tabularNums, styles.muted]}>
                {totals.completedLessons.toLocaleString()} / {totals.totalLessons.toLocaleString()} lessons
              </Text>
              <ProgressBar value={progressFraction(totals.completedLessons, totals.totalLessons)} tint={accents.courses} height={4} style={styles.summaryBar} />
              <Text style={[type.footnote, tabularNums, { color: accents.courses, fontWeight: '600' }]}>
                {percentLabel(totals.completedLessons, totals.totalLessons)}
              </Text>
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section: { section } }) => (
          <GroupHeader section={section} open={isOpen(section)} searching={searching} onToggle={() => toggle(section)} />
        )}
        renderItem={({ item, index, section }) => (
          <CourseRow course={item} onPress={openCourse} onStep={step} last={index === section.data.length - 1} />
        )}
        // Spacing goes after each group (a SectionSeparator would also sit between a header and its first row).
        renderSectionFooter={({ section: { section } }) => (
          <View style={styles.groupGap}>
            {isOpen(section) && section.courses.length === 0 ? (
              <View style={styles.emptyGroup}>
                <Text style={[type.subheadline, styles.muted]}>No courses yet.</Text>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeleton} accessibilityLabel="Loading" accessibilityRole="progressbar">
              <SkeletonListGroup rows={3} />
              <SkeletonListGroup rows={2} />
            </View>
          ) : failed ? (
            <LoadError
              what="courses"
              error={failed.error}
              onRetry={() => {
                void courses.refetch();
                void groups.refetch();
              }}
              tint={accents.courses}
            />
          ) : nothingYet ? (
            <View style={styles.empty}>
              <SymbolView name="graduationcap" size={36} tintColor={colors.tertiaryLabel} />
              <Text style={[type.headline, { color: colors.label }]}>No courses yet</Text>
              <Text style={[type.subheadline, styles.muted, { textAlign: 'center' }]}>
                Add a course to start tracking lessons. Groups are optional.
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <SymbolView name="magnifyingglass" size={32} tintColor={colors.tertiaryLabel} />
              <Text style={[type.headline, { color: colors.label }]}>No matches</Text>
              <Text style={[type.subheadline, styles.muted]}>No course title or creator contains “{search.trim()}”.</Text>
            </View>
          )
        }
      />
    </>
  );
}

/** A group's header: name, courses finished, lessons and a bar. Tapping it opens or closes the group. */
function GroupHeader({
  section,
  open,
  searching,
  onToggle,
}: {
  section: CourseSection;
  open: boolean;
  searching: boolean;
  onToggle: () => void;
}) {
  const { group, stats } = section;
  const name = group?.name ?? 'Ungrouped';
  return (
    <Pressable
      onPress={onToggle}
      // While searching, every group with a match stays open.
      disabled={searching}
      accessibilityRole="button"
      accessibilityState={{ expanded: open, disabled: searching }}
      accessibilityLabel={`${name}, ${stats.coursesDone} of ${stats.courseCount} courses finished, ${stats.completedLessons} of ${stats.totalLessons} lessons`}
      style={({ pressed }) => [
        styles.groupHeader,
        open ? styles.groupHeaderOpen : styles.groupHeaderClosed,
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name="chevron.right"
        size={12}
        weight="semibold"
        tintColor={searching ? colors.tertiaryLabel : colors.secondaryLabel}
        style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
      />
      <Text style={[type.subheadline, styles.groupName]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[type.caption1, tabularNums, styles.muted]}>
        {stats.coursesDone}/{stats.courseCount}
      </Text>
      <View style={styles.groupStats}>
        {stats.totalLessons > 0 && (
          <>
            <ProgressBar value={progressFraction(stats.completedLessons, stats.totalLessons)} tint={stats.pct >= 100 ? colors.positive : accents.courses} height={4} style={styles.groupBar} />
            <Text style={[type.caption1, tabularNums, styles.groupPct]}>
              {percentLabel(stats.completedLessons, stats.totalLessons)}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.groupedBackground },
  readable: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  muted: { color: colors.secondaryLabel },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs, paddingBottom: spacing.md },
  summaryBar: { flex: 1 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.secondaryGroupedBackground,
    borderCurve: 'continuous',
  },
  groupHeaderOpen: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  groupHeaderClosed: { borderRadius: radius.lg },
  pressed: { backgroundColor: colors.fill },
  groupName: { flexShrink: 1, color: colors.label, fontWeight: '600' },
  groupStats: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  groupBar: { width: 56 },
  groupPct: { color: colors.secondaryLabel, fontWeight: '600', minWidth: 34, textAlign: 'right' },
  emptyGroup: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.secondaryGroupedBackground,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderCurve: 'continuous',
  },
  groupGap: { paddingBottom: spacing.sm },
  skeleton: { gap: spacing.lg, paddingTop: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: 64, paddingHorizontal: spacing.lg },
});
