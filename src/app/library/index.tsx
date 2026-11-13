import { Stack, useLocalSearchParams } from 'expo-router';

import { SECTION_KEYS, type SectionKey } from '@/components/library/library-switcher';
import Inventory from '@/components/library/screens/inventory-screen';
import Metrics from '@/components/library/screens/metrics-screen';
import Randomize from '@/components/library/screens/randomize-screen';

const TITLES: Record<SectionKey, string> = { inventory: 'My Books', metrics: 'Metrics', randomize: 'Randomize' };

/**
 * Library root. Inventory / Metrics / Randomize are one screen whose content swaps on `?section=`
 * (set by the segmented control). As separate stacked routes, switching to the bottom one popped
 * the stack and animated like "Back".
 */
export default function Library() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const key: SectionKey = SECTION_KEYS.includes(section as SectionKey) ? (section as SectionKey) : 'inventory';

  return (
    <>
      <Stack.Screen options={{ title: TITLES[key] }} />
      {key === 'inventory' ? <Inventory /> : key === 'metrics' ? <Metrics /> : <Randomize />}
    </>
  );
}
