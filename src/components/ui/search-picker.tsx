import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

interface SearchPickerProps {
  title: string;
  options: string[];
  value?: string | null;
  onSelect: (value: string) => void;
  /** Enables the "Add …" row when the search text doesn't match an existing option. */
  onAddNew?: (value: string) => void;
  /** e.g. "Add author" → row reads `Add author "Brandon Sanderson"` */
  addNewLabel?: string;
  isAddingNew?: boolean;
  placeholder?: string;
  tint?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
  /** Extra horizontal inset (safe area) when shown in a full-height sheet. */
  sideInset?: { left: number; right: number };
}

/**
 * Full-height searchable list for sheet routes — the native replacement for the web's
 * click-to-open `SearchableDropdown` (which relied on document mousedown to close).
 */
export function SearchPicker({
  title,
  options,
  value,
  onSelect,
  onAddNew,
  addNewLabel = 'Add',
  isAddingNew = false,
  placeholder = 'Search',
  tint = colors.label as string,
  onCancel,
  autoFocus = true,
  sideInset = { left: 0, right: 0 },
}: SearchPickerProps) {
  const [search, setSearch] = useState('');
  const trimmed = search.trim();

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(trimmed.toLowerCase())),
    [options, trimmed],
  );
  const showAddNew = !!onAddNew && !!trimmed && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  const select = (v: string) => {
    haptics.selection();
    onSelect(v);
  };

  const addNew = () => {
    if (isAddingNew || !trimmed) return;
    onAddNew?.(trimmed);
  };

  return (
    <View style={[styles.container, { paddingLeft: sideInset.left, paddingRight: sideInset.right }]}>
      {(title || onCancel) && (
      <View style={styles.header}>
          <Text style={[type.headline, styles.title]}>{title}</Text>
          {onCancel && (
            <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
              <Text style={[type.body, { color: tint }]}>Cancel</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={[styles.searchField, !title && !onCancel && { marginTop: spacing.lg }]}>
        <SymbolView name="magnifyingglass" size={15} tintColor={colors.secondaryLabel} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={placeholder}
          placeholderTextColor={colors.tertiaryLabel}
          style={[type.body, styles.input]}
          autoFocus={autoFocus}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType={showAddNew ? 'done' : 'search'}
          onSubmitEditing={() => {
            if (filtered.length === 1) select(filtered[0]);
            else if (showAddNew) addNew();
          }}
          accessibilityLabel={`Search ${title.toLowerCase()}`}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(o) => o}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          showAddNew ? (
            <Pressable
              onPress={addNew}
              disabled={isAddingNew}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, styles.addRow, pressed && styles.rowPressed]}>
              {isAddingNew ? (
                <ActivityIndicator size="small" />
              ) : (
                <SymbolView name="plus.circle.fill" size={20} tintColor={tint} />
              )}
              <Text style={[type.body, { color: tint, flex: 1 }]} numberOfLines={1}>
                {isAddingNew ? `Adding “${trimmed}”…` : `${addNewLabel} “${trimmed}”`}
              </Text>
            </Pressable>
          ) : undefined
        }
        ListEmptyComponent={
          showAddNew ? undefined : (
            <Text style={[type.subheadline, styles.empty]}>{trimmed ? 'No matches' : 'Nothing here yet'}</Text>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const selected = item === value;
          return (
            <Pressable
              onPress={() => select(item)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <Text style={[type.body, styles.rowText]} numberOfLines={1}>
                {item}
              </Text>
              {selected && <SymbolView name="checkmark" size={16} weight="semibold" tintColor={tint} />}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.groupedBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: { color: colors.label },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.tertiaryFill,
  },
  input: { flex: 1, color: colors.label, paddingVertical: 0 },
  list: { flex: 1, marginTop: spacing.md },
  listContent: {
    marginHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.secondaryGroupedBackground,
  },
  addRow: { borderRadius: radius.md, borderCurve: 'continuous', marginBottom: spacing.md },
  rowPressed: { backgroundColor: colors.fill },
  rowText: { flex: 1, color: colors.label },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: spacing.lg },
  empty: { color: colors.secondaryLabel, textAlign: 'center', paddingVertical: spacing.xxl },
});
