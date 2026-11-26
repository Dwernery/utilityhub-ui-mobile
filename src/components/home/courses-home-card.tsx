import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { CourseCover } from '@/components/courses/course-cover';
import { Card, CardHeader } from '@/components/ui/card';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useCourses } from '@/lib/courses/hooks';
import { coursesHomeStats, percentLabel, progressFraction } from '@/lib/courses/utils/stats';

import {
  CardDivider,
  CardError,
  CardSkeleton,
  EmptyLine,
  MetricRow,
  ProgressItemRow,
  RefreshNotice,
  SectionLabel,
} from './parts';

/**
 * A Lessons row, a Courses row, then up to 4 in-progress courses: the same three rows as
 * the Library and MCU cards. Mirrors the web's CoursesHomeCard.
 */
export function CoursesHomeCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { data: courses = [], isPending, isLoadingError, isRefetchError, isFetching, error, refetch } = useCourses();
  const { overall, inProgress } = coursesHomeStats(courses);

  return (
    <Card style={style}>
      <CardHeader title="Courses" icon="graduationcap" tint={accents.courses as string} />
      {isPending ? (
        <CardSkeleton />
      ) : isLoadingError ? (
        <CardError what="courses" error={error} onRetry={refetch} />
      ) : (
        <View style={styles.body}>
          {isRefetchError && <RefreshNotice onRetry={refetch} retrying={isFetching} />}
          <SectionLabel icon="checklist">Lessons</SectionLabel>
          <MetricRow
            metrics={[
              { value: overall.completedLessons.toLocaleString(), label: 'Done', icon: 'checkmark.circle' },
              {
                value: (overall.totalLessons - overall.completedLessons).toLocaleString(),
                label: 'Left',
                icon: 'hourglass',
              },
              { value: percentLabel(overall.completedLessons, overall.totalLessons), label: 'Complete', icon: 'percent' },
            ]}
          />
          <CardDivider />
          <SectionLabel icon="graduationcap">Courses</SectionLabel>
          <MetricRow
            metrics={[
              { value: overall.coursesDone, label: 'Finished', icon: 'checkmark.circle' },
              { value: overall.coursesInProgress, label: 'In progress', icon: 'play.circle' },
              { value: overall.coursesNotStarted, label: 'In queue', icon: 'clock' },
            ]}
          />
          <CardDivider />
          <SectionLabel icon="book">In progress</SectionLabel>
          {inProgress.length > 0 ? (
            <View style={styles.list}>
              {inProgress.slice(0, 4).map((course) => {
                return (
                  <ProgressItemRow
                    key={course.id}
                    title={course.title}
                    cover={<CourseCover course={course} width={52} />}
                    trailing={`${course.completedLessons}/${course.totalLessons}`}
                    progress={progressFraction(course.completedLessons, course.totalLessons)}
                    meta={course.creatorName}
                    metaTrailing={percentLabel(course.completedLessons, course.totalLessons)}
                    tint={accents.courses}
                  />
                );
              })}
              {inProgress.length > 4 && (
                <Text style={[type.caption1, { color: colors.secondaryLabel }]}>+{inProgress.length - 4} more in progress</Text>
              )}
            </View>
          ) : (
            <EmptyLine>{courses.length === 0 ? 'No courses yet.' : 'Nothing in progress right now.'}</EmptyLine>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.lg },
  list: { gap: spacing.md },
});
