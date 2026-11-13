# Web → Native migration progress

Source: the `utility-hub-ui` web app (Vite + React). Target: iOS-only Expo Router app, fully native, iOS 27 conventions.
Plan: `~/.claude/plans/inspect-the-web-application-noble-grove.md`

A route is ✅ when it matches the running web app's **content and behavior** on the same data. It should look more native than the web version, not identical to it.

## Phase 0: Foundation ✅
- [x] Logic ported to `src/lib/**` (TS): http, config, library / finance / mcu (api, types, queryKeys, hooks, utils, contexts)
- [x] `src/context/toast.tsx`: same `useToast()` API as the web, with a minimal renderer
- [x] `src/constants/{theme,icons,navigation}.ts`: semantic colors, SF Symbols map, stack/sheet presets
- [x] Root `_layout.tsx`: QueryClient + AppState focus, Toast, McuTracker, liquid-glass NativeTabs
- [x] Placeholder screen for every route, `+not-found`, route `ErrorBoundary`

## Phase 1: Shared components ✅
- [x] `ui/card.tsx`: Card (grouped + liquid-glass variant) and CardHeader
- [x] `ui/progress-bar.tsx` (animated, respects reduced motion) and `ui/stat-tile.tsx`
- [x] Toast renderer: glass banners from the top, Reanimated enter/exit, success/error haptics
- [x] `library/book-cover.tsx` (expo-image, falls back to a placeholder) and `library/star-rating.tsx` (haptics, VoiceOver adjustable)
- [x] `mcu/poster-card.tsx`: SVG generative art, progress ring, press spring
- [x] `ui/charts.tsx`: BarChart = Swift Charts (@expo/ui); LineChart = custom SVG (Y domain snapped to $10k, $k labels, touch-to-inspect)
- [x] `ui/search-picker.tsx` and `library/file-picker-button.tsx` (action sheet: Photo Library / Take Photo / Choose File)
- [x] `lib/haptics.ts` vocabulary

## Phase 2: Home ✅
- [x] `/(home)/index`: Library, MCU, Courses and Finances cards; pull-to-refresh; two columns when the usable width is 700pt or more
- [x] Stat logic in `lib/*/utils/{homeStats,inProgress,homeSummary}.ts`. Finance figures checked against an independent calculation from the API: net worth $289,043, +$45,044 / +18.5%, projected $287,945 / -$1,097 / -0.4%
- [x] Checked in light and dark mode on iPhone Duo
- [x] `ui/screen-scroll-view.tsx`: pads for left/right safe-area insets (the Duo reports an 84pt right inset for its side tab bar). Use it on every screen

## Phase 3: Library ✅
- [x] `/library/inventory`: header search, filter menu (All/Reading/Unread/Read), + button, segmented control, read-progress line, grouped by author, pull-to-refresh
- [x] `/library/book/[id]`: detail sheet with optimistic rating (finished books only), delete with confirmation, author/series links
- [x] `/library/book/[id]/edit`: grouped form, status segmented control, native date pickers, sends only the changed fields (as the web did), cover upload
- [x] `/library/add`: same form without status/dates; cover uploads after the book is created
- [x] `/library/pick/[field]`: searchable author/series picker with "Add …" (creates via API), "None" clears series; hands the choice back through `LibraryContext.openPicker`
- [x] `/library/author/[name]`: stats checked against the data (Blake Crouch: 3 read, 996 pages, 4.0)
- [x] `/library/series/[name]`
- [x] `/library/metrics`: Currently Reading (Done / Remove / page input), 4 stat tiles, per-year Swift Chart (Books/Pages/Ratings) with values listed under it, year comparison with trend pills; tapping a year expands its monthly bars and finished books in place
- [x] `/library/start-reading`: unread books A–Z, native search, starts via `useStartReading`
- [x] `/library/randomize`: category tiles, shuffle "spin" with haptic ticks (skipped with Reduce Motion), series cover strip, start reading, eligible list. Counts checked against the API (1 / 3 / 0)

## Phase 4: MCU ✅
- [x] `/mcu/tracker`: dark theme, view segmented control synced with `?view=` (checked by deep link), overall progress + Movies/Specials/Episodes tiles, collapsible sagas → phases → snapping poster rows, categories render posters directly, pull-to-refresh. Overall 5% = 6 of 131
- [x] `/mcu/item/[globalId]`: movie/special (status segmented control in the phase color) and TV season (progress, total runtime, per-episode tri-state checkbox), synopsis, poster with art fallback

## Phase 5: Finances ✅
- [x] `/finances/dashboard`: Dashboard/Expenses/History segmented control, year segments, blue hero (net worth, YoY, expandable year stats), SVG net-worth chart, 12-month list (current month highlighted). Hero $289,042.71 / +$45,043.66 / +18.5% matches Home
- [x] `/finances/month/[key]`: derived live from the net-worth query (refetches after each change); tap an account for Edit Balance (decimal-pad prompt) or Remove; + lists accounts not yet in the month plus "New Account…" (name → type → balance)
- [x] `/finances/income-expenses` + `/finances/transaction/[id]`: 4 tiles, All/Paid/Unpaid filter, quick paid toggle per row, edit sheet (name/amount/paid switch), "Clear All Paid" in the header menu with confirmation. Totals checked against the API ($8,786 / $7,371 / $175 / $1,415)
- [x] `/finances/income-history` + `/finances/income/[id]`: year chips with "+ Year" prompt, sources, total, YoY (2026 vs 2025: -$90,000 / -81.8%, checked), add/edit/delete sheet

## Phase 6: Polish & ship (personal install, not App Store)
- [x] App name "Project SHIELD", bundle ID `com.dwernery.projectshield`
- [x] Icon (logo flattened onto #0b1426 at 1024×1024, no alpha), splash (logo on white / dark navy), logo on Home
- [x] Dropped `android` / `web` config and `react-native-web` / `react-dom` / `react-native-chart-kit`; deleted the dev gallery
- [x] `expo-doctor` 20/20 (fixed the invalid `ios.supportsTabletMode` key → `supportsTablet`, Expo patch updates)
- [x] Tap-tested on the simulator (expo-mcp's XCUITest driver), see "Tap testing" below
- [ ] Install on iPhone: `npx expo run:ios --device --configuration Release` (needs an Apple ID team in Xcode; uses `.env.production`)

## Tap testing (simulator, 2026-11-12)
Passed: Library filter menu; Inventory/Metrics/Randomize switching; Start Reading → Remove (book restored to UNREAD); Randomize category, pick, reroll (series strip); author sheet → stacked book sheet; rating 4→5→4 (checked via API).
Bugs found and fixed: Add Book opened scrolled under the header (autoFocus); full-height `formSheet` shifted content under the header when a field was focused (forms are now page-sheet modals); RN `automaticallyAdjustKeyboardInsets` threw short forms upward (replaced with `useKeyboardInset`).
Not covered: typing (the iOS 27 simulator clipboard doesn't work, and the driver only supports taps), edit-book save, pickers, MCU and Finances interactions.

## Notes / deviations from the web app
- React Query now refetches stale data when the app returns to the foreground. The web app disabled `refetchOnWindowFocus`.
- GET errors now include the HTTP status in the message.
- MCU poster art is rendered with SVG gradient stops instead of CSS strings. This fixes the web's invalid `rgb(...)FA` colors.
- Cover upload progress is real: it comes from the `expo-file-system` `File.upload` callback, where the web app used fixed 25/50/75% steps.
- Charts: Swift Charts has no Y-domain or tooltip API, so the net-worth line chart is custom SVG. Bar charts use Swift Charts.
- Book covers: 2 of the 3 `s3Url` covers return HTTP 403 from S3 (`promised-land.webp`, `the-road.webp`). The app shows the placeholder for them. This is a bucket/data problem, not an app bug.
- Home: cards are display-only, since the tab bar handles navigation (your call). Dropped the web's "Live" pills and the `/courses` link, which 404s on the web.
- Home Finances card: no graph, whole-dollar amounts. This matches the web card at phone width.
- `MCUCurrentlyWatching` on the web keyed rows by `item.id`, which is undefined for movies. Native keys rows by `globalId`.
- Book forms: switching status to Reading/Read fills an empty start/end date with today. The web left them blank and then failed validation on save.
- Book forms: Save is a prominent checkmark and Cancel asks before discarding. Swipe-to-dismiss is blocked while there are unsaved edits.
- Sheets: detail sheets (60% detent) span the full width. Full-height form sheets keep the side safe-area inset, because on the iPhone Duo the status bar and the sheet toolbar sit over the right edge at that height.
- Library Metrics: Swift Charts can't be tapped, so years are selected from the comparison list, and the selected year's details expand inline under its row (the web showed them under the whole list). Per-year values are printed under the chart because Swift Charts doesn't draw bar labels.
- Randomize: the web's 300ms fade became a short shuffle through candidates with haptic ticks, ending on a thud. With Reduce Motion on it lands immediately.
- Library: Metrics and Randomize hide the back button and swipe-back, since they're siblings of Inventory switched by the segmented control.

- MCU: unfinished sagas and phases start expanded (web rule), but only once on load. The web recomputed it on every status change, which re-expanded sections you had collapsed.
- MCU: status changes go through one `useChangeStatus` hook (API → local `watched` → toast), shared by the poster badge and the detail sheet, the same order as the web.
- MCU detail sheet: no header title. The hero shows title, type and year, and iOS's light glass header muted a title on the dark sheet.
- MCU saga titles: dropped the web's text-shadow glow. On iOS it drew a dark box behind the text.
- Finances: the web's "AI Assistant" tab (no route, 404) and the non-functional "+"/trash buttons on Income & Expenses (no create/delete transaction API) were left out.
- Finances month sheet: no local copy of the month. Everything is derived from the net-worth query and refetched after each change. The web hand-patched a `displayMonth` copy, which could drift.
- Finances: added a one-tap "paid" toggle on each transaction row. The web only had paid in the edit form.
- MCU status bar: light only while the MCU tab is focused (`useFocusEffect` + `setStatusBarStyle`). A `<StatusBar style="light">` leaked into other tabs, because native tabs keep every tab mounted.
