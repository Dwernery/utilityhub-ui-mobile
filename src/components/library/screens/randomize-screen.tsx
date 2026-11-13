import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { BookCover } from '@/components/library/book-cover';
import { LibrarySwitcher } from '@/components/library/library-switcher';
import { Card } from '@/components/ui/card';
import { SkeletonCard, SkeletonTiles } from '@/components/ui/skeleton';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useBooks, useStartReading } from '@/lib/library/hooks';
import {
  buildRandomPools,
  candidatesFor,
  pickRandom,
  type RandomCategory,
  type RandomPick,
} from '@/lib/library/utils/randomize';

const CATEGORIES: { id: RandomCategory; label: string; sub: string | null }[] = [
  { id: 'standalone', label: 'Standalones', sub: null },
  { id: 'short', label: 'Short series', sub: '2–3 books' },
  { id: 'long', label: 'Long series', sub: '4+ books' },
];

/** Shuffle "spin": flick through random candidates with selection ticks, then land with a thud. */
const SPIN_TICKS = 9;
const SPIN_INTERVAL = 65;

const pickBook = (p: RandomPick) => (p.type === 'book' ? p.book : p.group.firstBook);

export default function Randomize() {
  const { data: books = [], isPending } = useBooks();
  const { startReading, isPending: isStarting } = useStartReading();
  const reduceMotion = useReducedMotion();

  const [category, setCategory] = useState<RandomCategory>('standalone');
  const [pick, setPick] = useState<RandomPick | null>(null);
  const [spinning, setSpinning] = useState(false);
  const lastKey = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pools = useMemo(() => buildRandomPools(books), [books]);
  const candidates = useMemo(() => candidatesFor(pools, category), [pools, category]);

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stopTimer, []);

  const chooseCategory = (c: RandomCategory) => {
    if (c === category) return;
    haptics.selection();
    stopTimer();
    lastKey.current = null;
    setSpinning(false);
    setPick(null);
    setCategory(c);
  };

  const roll = () => {
    if (!candidates.length || spinning) return;
    stopTimer();
    const final = pickRandom(candidates, lastKey.current);
    if (!final) return;

    const land = () => {
      stopTimer();
      lastKey.current = final.key;
      setPick(final);
      setSpinning(false);
      haptics.thud();
    };

    if (reduceMotion || candidates.length === 1) return land();

    setSpinning(true);
    let ticks = 0;
    timer.current = setInterval(() => {
      ticks++;
      if (ticks >= SPIN_TICKS) return land();
      setPick(candidates[Math.floor(Math.random() * candidates.length)]);
      haptics.selection();
    }, SPIN_INTERVAL);
  };

  const start = () => {
    if (!pick) return;
    startReading(pickBook(pick), {
      onSuccess: () => {
        setPick(null);
        lastKey.current = null;
      },
    });
  };

  const unit = category === 'standalone' ? 'book' : 'series';
  const countText = `${candidates.length} ${unit}${candidates.length !== 1 && unit === 'book' ? 's' : ''} to choose from`;

  return (
    <ScreenScrollView contentContainerStyle={styles.content}>
      <LibrarySwitcher current="Randomize" />

      <View style={styles.categories}>
        {CATEGORIES.map(({ id, label, sub }) => {
          const active = id === category;
          return (
            <Pressable
              key={id}
              onPress={() => chooseCategory(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}${sub ? `, ${sub}` : ''}: ${pools.counts[id]}`}
              style={({ pressed }) => [styles.category, active && styles.categoryActive, pressed && { opacity: 0.7 }]}>
              <Text style={[type.title2, tabularNums, { color: active ? accents.library : colors.label }]}>
                {pools.counts[id]}
              </Text>
              <Text style={[type.footnote, { color: active ? accents.library : colors.secondaryLabel, fontWeight: '600' }]}>
                {label}
              </Text>
              {sub ? <Text style={[type.caption2, { color: colors.tertiaryLabel }]}>{sub}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {isPending ? (
        <View style={styles.skeleton} accessibilityLabel="Loading" accessibilityRole="progressbar">
          <SkeletonTiles count={3} perRow={3} />
          <SkeletonCard lines={2} tall={120} />
        </View>
      ) : candidates.length === 0 ? (
        <Card>
          <View style={styles.empty}>
            <SymbolView name="books.vertical" size={40} tintColor={colors.tertiaryLabel} />
            <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>No unread books in this category.</Text>
          </View>
        </Card>
      ) : (
        <>
          <Card>
            {!pick ? (
              <View style={styles.empty}>
                <SymbolView name="shuffle" size={40} tintColor={colors.tertiaryLabel} />
                <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>{countText}</Text>
                <Pressable
                  onPress={roll}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.primary, pressed && { opacity: 0.8 }]}>
                  <SymbolView name="shuffle" size={15} weight="semibold" tintColor={colors.white} />
                  <Text style={[type.headline, { color: colors.white }]}>Pick for me</Text>
                </Pressable>
              </View>
            ) : (
              <PickResult
                pick={pick}
                seriesSizes={pools.seriesSizes}
                spinning={spinning || isStarting}
                onStart={start}
                onReroll={roll}
              />
            )}
          </Card>

          <EligibleList candidates={candidates} selectedKey={spinning ? null : (pick?.key ?? null)} category={category} />
        </>
      )}
    </ScreenScrollView>
  );
}

function PickResult({ pick, seriesSizes, spinning, onStart, onReroll }: {
  pick: RandomPick;
  seriesSizes: Record<string, number>;
  spinning: boolean;
  onStart: () => void;
  onReroll: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const book = pickBook(pick);
  const title = pick.type === 'series' ? pick.group.series : book.title;
  const totalPages =
    pick.type === 'series' ? pick.group.books.reduce((s, b) => s + (b.pages || 0), 0) : Number(book.pages ?? 0);
  const seriesBooks = pick.type === 'series' ? pick.group.books : [];

  return (
    <Animated.View
      key={spinning ? undefined : pick.key}
      entering={spinning || reduceMotion ? undefined : FadeIn.duration(200)}
      style={[styles.result, spinning && { opacity: 0.55 }]}
      accessibilityLiveRegion="polite">
      <View style={styles.resultTop}>
        <BookCover book={book} width={84} />
        <View style={styles.resultText}>
          <Text style={[type.title3, { color: colors.label }]} numberOfLines={3}>
            {title}
          </Text>
          <Text style={[type.subheadline, { color: accents.library }]}>{book.authorName}</Text>
          {pick.type === 'series' && (
            <Text style={[type.footnote, { color: colors.secondaryLabel }]}>
              {seriesSizes[pick.group.series]} books in the series
            </Text>
          )}
          <View style={styles.inline}>
            <SymbolView name="book.pages" size={12} tintColor={colors.secondaryLabel} />
            <Text style={[type.footnote, tabularNums, { color: colors.secondaryLabel }]}>
              {totalPages.toLocaleString()} pages
            </Text>
          </View>
        </View>
      </View>

      {seriesBooks.length > 1 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[type.footnote, { color: colors.secondaryLabel, fontWeight: '600' }]}>Series books</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seriesStrip}>
            {seriesBooks.map((b, i) => (
              <View key={b.id} style={styles.seriesItem}>
                <BookCover book={b} width={64} />
                <Text style={[type.caption1, { color: colors.secondaryLabel, fontWeight: '600' }]}>{i + 1}</Text>
                <Text style={[type.caption2, { color: colors.secondaryLabel, textAlign: 'center' }]} numberOfLines={2}>
                  {b.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.buttons}>
        <Pressable
          onPress={onStart}
          disabled={spinning}
          accessibilityRole="button"
          accessibilityLabel={`Start reading ${book.title}`}
          style={({ pressed }) => [styles.primary, styles.flex, pressed && { opacity: 0.8 }, spinning && { opacity: 0.5 }]}>
          <SymbolView name="play.fill" size={13} tintColor={colors.white} />
          <Text style={[type.headline, { color: colors.white }]}>Start reading</Text>
        </Pressable>
        <Pressable
          onPress={onReroll}
          disabled={spinning}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }, spinning && { opacity: 0.5 }]}>
          <SymbolView name="arrow.counterclockwise" size={14} weight="semibold" tintColor={colors.label} />
          <Text style={[type.headline, { color: colors.label }]}>Reroll</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function EligibleList({ candidates, selectedKey, category }: {
  candidates: RandomPick[];
  selectedKey: string | null;
  category: RandomCategory;
}) {
  return (
    <Card padded={false}>
      <Text style={[type.footnote, styles.listTitle]}>
        {category === 'standalone' ? `All eligible books (${candidates.length})` : `All eligible series (${candidates.length})`}
      </Text>
      {candidates.map((c) => {
        const book = pickBook(c);
        const selected = c.key === selectedKey;
        return (
          <View key={c.key}>
            <View style={styles.separator} />
            <View style={[styles.eligibleRow, selected && { backgroundColor: colors.tertiaryFill }]}>
              <BookCover book={book} width={28} />
              <View style={styles.flex}>
                <Text
                  style={[type.subheadline, { color: selected ? accents.library : colors.label, fontWeight: '500' }]}
                  numberOfLines={1}>
                  {c.type === 'series' ? c.group.series : book.title}
                </Text>
                <Text style={[type.caption1, { color: colors.secondaryLabel }]} numberOfLines={1}>
                  {book.authorName}
                  {c.type === 'series' ? ` · ${c.group.totalInSeries} books` : ''}
                </Text>
              </View>
              {selected && <View style={styles.dot} />}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  categories: { flexDirection: 'row', gap: spacing.sm },
  category: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: colors.secondaryGroupedBackground,
  },
  categoryActive: { borderColor: accents.library },
  skeleton: { gap: spacing.lg },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
    backgroundColor: accents.library,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    backgroundColor: colors.tertiaryFill,
  },
  result: { gap: spacing.lg },
  resultTop: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  resultText: { flex: 1, minWidth: 0, gap: 3 },
  seriesStrip: { gap: spacing.md },
  seriesItem: { width: 72, alignItems: 'center', gap: 3 },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  listTitle: { color: colors.secondaryLabel, fontWeight: '600', padding: spacing.lg, paddingBottom: spacing.md },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: spacing.lg },
  eligibleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: accents.library },
});
