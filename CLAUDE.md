@AGENTS.md

# Project SHIELD (UtilityHub mobile)

A personal iOS app (Library, MCU tracker, Finances) migrated from the `utility-hub-ui` web app (Vite + React). It is installed locally from Xcode / `expo run:ios`; it is **not** going to the App Store. `migration-progress.md` lists every deliberate difference from the web app; read it before changing behavior.

## Ground rules

- **iOS only, fully native.** No Android code paths, no web or DOM components. Use iOS idioms: SF Symbols (`expo-symbols`), `@expo/ui` (SwiftUI) controls, native tabs with liquid glass, form sheets.
- **Target:** iOS 27 on iPhone, including the foldable **iPhone Duo** (cover screen about 466 pt wide with an 84 pt right safe-area inset, unfolded 670–950 pt), and iPad.
- **Backend:** the existing REST API, reached through `EXPO_PUBLIC_API_URL` (`.env` for development, `.env.production` for release builds). It has **no auth**. Never commit env files or the server address, because the repo is public.
- **Before declaring a task done,** run `npx tsc --noEmit && npx expo lint`. The user does the hands-on simulator testing and reports back, so don't drive the simulator with tap automation. A screenshot (`xcrun simctl io <udid> screenshot`) to sanity-check is fine. When you hand off, list what to test.
- **Git:** one feature branch per change, then fast-forward into `main`. Pushing needs `git -c http.postBuffer=524288000 push`, because the default buffer causes HTTP 400.

## Layout

- `src/app/`: routes only. The tabs are `(home)`, `library`, `finances` and `mcu`, each with a Stack `_layout`.
  - `library/index` and `finances/index` are **one screen whose content swaps on `?section=`**, set by the segmented control with `router.setParams`. Don't turn the sections back into separate stacked routes: switching to the bottom one would pop the stack and animate like "Back".
  - Detail views (book, author, series, month, MCU item) and forms (add or edit, pickers, transaction, income) are sheet routes, using presets from `src/constants/navigation.ts`.
- `src/components/<domain>/`: UI. `src/components/<domain>/screens/` holds the section bodies.
- `src/components/ui/`: shared building blocks.
- `src/lib/<domain>/`: `api.ts`, `types.ts`, TanStack Query `hooks.ts`, and pure `utils/` (ported from the web; keep logic here, not in components).
- `src/constants/`: `theme.ts` (tokens), `icons.ts` (lucide → SF Symbol map), `navigation.ts` (stack and sheet presets).

## Conventions (reuse these)

- **Colors:** use `colors.*` and `accents.*` from `theme.ts` (iOS semantic `PlatformColor`, so dark mode works). Use `accentHex` only where a hex color is required (SVG, gradients). MCU is always dark (`mcuColors`).
- **Scrolling screens:** use `ScreenScrollView`, which adds side safe-area padding for the Duo. Pass `sideInsets={false}` inside detail sheets. Full-height forms pad by the safe area themselves.
- **Wide layouts:** `useIsWide()` (700 pt usable width) switches to multi-column layouts. `useIsWide(ROOMY_BREAKPOINT)` (600 pt) is the cutoff for showing full cents instead of whole dollars on the Home finance card.
- **Forms:** the `formSheet` preset is actually `presentation: 'modal'`, because a full-height iOS form sheet shifts content under the header when the keyboard opens. Use the `FormSection` and `FormTextField`/`FormValueRow` components from `form.tsx`, plus `FormSheetToolbar` (Cancel asks before discarding, prominent Save). Use `useKeyboardInset()` for the scroll inset, not `automaticallyAdjustKeyboardInsets`. Don't `autoFocus` the first field (it scrolls the form under the header).
- **Loading:** show skeletons from `ui/skeleton.tsx` shaped like the content, not spinners. Wrap dark screens in `SkeletonTheme dark`.
- **Charts:** `BarChart` (views: tappable, labelled) and `LineChart` (SVG: snapped Y axis, drag to inspect) in `ui/charts.tsx`. `@expo/ui` Swift Charts can't set a Y domain or handle taps.
- **Feedback:** use `haptics.*` from `src/lib/haptics.ts` and `useToast()` from `src/context/toast.tsx` (`'success' | 'error' | 'warning' | 'info'`). Respect `useReducedMotion()` for any animation.
- **Data:** mutations invalidate their query keys (see each domain's `hooks.ts`). MCU status changes go through `useChangeStatus`.
- **Animated values:** Reanimated shared values use `.get()`/`.set()`, which the React Compiler lint rule requires.
- **Expo APIs:** the SDK is **58**, and APIs change between SDK versions. Check the versioned docs or `node_modules` types before using an Expo API (for example, `headerLargeTitleEnabled` replaced the deprecated `headerLargeTitle`, and Stack `anchor` replaced `initialRouteName`).

## Commands

```bash
npx expo start                                       # Metro for the installed dev build
npx expo run:ios                                     # rebuild the dev client (after adding native modules or changing app.json)
npx expo run:ios --device --configuration Release    # install on the iPhone
npx tsc --noEmit && npx expo lint && npx expo-doctor # checks
```

Install new packages with `npx expo install <pkg>`. A package with native code needs a rebuild (`npx expo prebuild --platform ios --clean`, then `npx expo run:ios`).
