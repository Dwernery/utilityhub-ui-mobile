import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type CoursePickField = 'creator' | 'group';

/**
 * What the `/courses/pick/[field]` sheet needs from the form that opened it. A group is
 * handed back as its id (null for none); a creator as its name.
 */
export type CoursePickRequest =
  | { field: 'creator'; value: string; onSelect: (name: string) => void }
  | { field: 'group'; value: number | null; onSelect: (groupId: number | null) => void };

interface CoursesContextValue {
  pickRequest: CoursePickRequest | null;
  openPicker: (request: CoursePickRequest) => void;
}

const CoursesContext = createContext<CoursesContextValue | null>(null);

/** The hand-off between the course form and the picker sheet, like Library's author picker. */
export function CoursesProvider({ children }: { children: ReactNode }) {
  const [pickRequest, setPickRequest] = useState<CoursePickRequest | null>(null);
  const openPicker = useCallback((request: CoursePickRequest) => {
    setPickRequest(request);
    router.push({ pathname: '/courses/pick/[field]', params: { field: request.field } });
  }, []);
  const value = useMemo(() => ({ pickRequest, openPicker }), [pickRequest, openPicker]);
  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>;
}

export function useCoursesPicker() {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error('useCoursesPicker must be used within a CoursesProvider');
  return ctx;
}
