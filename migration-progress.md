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
- [x] `/library/metrics`: Currently Reading (Done, page input, and a pace line like "32 pages/day · Dec 3"; Done then opens the book's sheet with "Finished! How was it?" over the stars, where the web shows a small rating modal), this year's reading goal card (two rows, "2026 Goal  18 of 25 · 2 ahead of pace  Edit" plus a thin bar; at 700pt+ (web: md+) it sits beside Currently Reading, lined up with the stat tiles (Currently Reading 3 tiles wide, the goal 1, equal heights), as a short column: a ring with "18 / 25" inside and the status under it; hidden until a goal is set or if goals can't load; display-only, edited from the toolbar), then a hairline (separating "now" from history) and a period picker ("All time | 2026 | 2025 | …", web too) that drives everything below it: 4 stat tiles for the period (a year adds its change from the year before, green/red, always the whole year before, so the current year reads as "so far vs all of last year"; average pages is neutral grey), then for All time the per-year chart (Books/Pages/Ratings; tap a bar to pick that year), and for a year its monthly bars and finished books. The year comparison list is gone: its changes now sit on the tiles
- [x] `/library/start-reading`: unread books A–Z, native search, starts via `useStartReading`
- [x] `/library/randomize`: category tiles, shuffle "spin" with haptic ticks (skipped with Reduce Motion), series cover strip, start reading, eligible list. Counts checked against the API (1 / 3 / 0)

## Phase 4: MCU ✅
- [x] `/mcu/tracker`: dark theme, view segmented control synced with `?view=` (checked by deep link), overall progress + Movies/Specials/Episodes tiles, collapsible sagas → phases → snapping poster rows, categories render posters directly, pull-to-refresh. Overall 5% = 6 of 131
- [x] `/mcu/item/[globalId]`: movie/special (status segmented control in the phase color) and TV season (progress, total runtime, per-episode tri-state checkbox), synopsis, poster with art fallback

## Phase 5: Finances ✅
- [x] `/finances/dashboard`: Dashboard/Expenses/History segmented control, year segments, blue hero (net worth, YoY, expandable year stats), SVG net-worth chart, 12-month list (current month highlighted). Hero $289,042.71 / +$45,043.66 / +18.5% matches Home
- [x] `/finances/month/[key]`: derived live from the net-worth query (refetches after each change); tap an account for Edit Balance (decimal-pad prompt) or Remove; + lists accounts not yet in the month plus "New Account…" (name → type → balance)
- [x] `/finances/income-expenses` + `/finances/transaction/[id]`: 4 tiles, All/Paid/Unpaid filter, quick paid toggle per row, edit sheet (name/amount/paid switch), "Clear All Paid" in the header menu with confirmation. Totals checked against the API ($8,786 / $7,371 / $175 / $1,415)
- [x] `/finances/income-history` + `/finances/income/[id]`: year chips with "+ Year" prompt, sources, total, YoY (2026 vs 2025: -$90,000 / -81.8%, checked), add/edit/delete sheet; an "Income by year" bar chart (iPhone only; tap a bar to pick that year): under the sources on phones, beside them on wide layouts at the same height as the income card

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
- Sign-in (2026-11-22): both apps sign in with the owner password. The web also offers Touch ID with a passkey and keeps the session in an HttpOnly cookie. The app keeps its session token in the Keychain behind Face ID / Touch ID instead, asked once per cold launch (not on return from the background), and has no passkey sign-in (that would need Associated Domains). Signing out on the phone only forgets the token; it stays valid on the server until it expires.
- React Query now refetches stale data when the app returns to the foreground. The web app disabled `refetchOnWindowFocus`.
- GET errors now include the HTTP status in the message.
- MCU poster art is rendered with SVG gradient stops instead of CSS strings. The web's `rgb(...)FA` colors were invalid CSS, so its fallback art never showed; fixed on the web too (2026-11-22), where the art now also sits under the artwork instead of over it.
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
- MCU add/edit/delete: the tracker's "+" menu adds a Movie, Special or Show Season (`mcu/edit/item?kind=`). The detail sheet's "⋯" menu has Edit, Add Episode, Add Next Season and Delete. Long-pressing an episode offers Edit and Delete, because a tap still cycles its status. The web puts these as icon buttons in the detail modal's header and on each episode row.
- MCU forms (`mcu/edit/item`, `mcu/edit/episode`) use the system grouped-form look, not the always-dark tracker, so they share the form components with Library and Finances.
- MCU detail sheet: opened by `globalId` (one per season), not the display id `show:3-season1`, so it stays open when a season is renumbered.
- Finances: the web's "AI Assistant" tab (no route, 404) was left out.
- Finances Income & Expenses: add uses a "+" in each section header that opens the transaction sheet (`id=new&type=…`, with a Cash switch). Delete is the trash button in the edit sheet's toolbar. The web does both inline, with a form at the top of the column and a trash icon on each row.
- Finances month sheet: no local copy of the month. Everything is derived from the net-worth query and refetched after each change. The web hand-patched a `displayMonth` copy, which could drift.
- Finances: added a one-tap "paid" toggle on each transaction row. The web only had paid in the edit form.
- MCU status bar: light only while the MCU tab is focused (`useFocusEffect` + `setStatusBarStyle`). A `<StatusBar style="light">` leaked into other tabs, because native tabs keep every tab mounted.
- MCU status taps: the poster badge and episode rows toggle Watched ↔ Unwatched in one tap (web too, since 2026-11-22). In Progress is in the long-press menu: an action sheet on movie/special posters, and in each episode's existing long-press sheet alongside Edit and Delete. The web uses the movie modal's status buttons and an In Progress button on each episode row instead.
- Finances dashboard, wide layouts: the net worth card always shows its year stats (no Show details toggle), and the chart fills the space beside the 12-month list, so both columns end flush without measuring or animating (rotating/unfolding with the screen open used to leave the month list under the side chrome). The web keeps the toggle.
- Library series numbers (web too): books have an optional whole-number "Book #" in their series (form field shown once a series is picked; choosing a series suggests the next number). Shown as "Mistborn #2" in rows, the book sheet, author sheet and Start Reading; series sheets and Randomize use series order (number, then any without one in the order added), so a picked series starts at its lowest number. Inventory lists each author's series together (series A–Z, books in number order), then standalone books A–Z. Existing books were numbered once by the order they were added (API db script).
- Library Metrics actions: Start Reading (+) and the goal menu (Set / Edit / Remove) are toolbar buttons, as on Inventory; the web keeps a Start Reading button in Currently Reading and Set goal / Edit in the goal card.
- MCU search and filter (web too): like Library, the header search filters the tracker in place: only titles matching the title or an episode title stay, in the current view, and empty phases and sections drop out. Search, the view switch and the filter menu all apply together and stay usable. While searching, every section and phase with a match is open (toggles during a search last for that search; clearing it restores your layout), and a "N matches" line shows the count. With no matches here, the empty state names the view and, if the other view has matches, offers a "N matches in <other view>" link that switches views, or "Show all titles" when "Not Finished" hid only watched matches. The filter menu's "Not Finished" hides watched titles and empty phases. Percentages and progress always count the whole section and view.
- MCU summaries skip zero counts and pluralize ("1 movie · 2 specials"). The detail hero shows "Season 2 · 2023" for seasons, and runtime as "2h 14m".
- MCU parity pass (2026-11-22): web saga/category progress bars use the section color like mobile (were a fixed blue→violet gradient); the web's finished TV badge now shows a check like mobile; status toasts read "Marked In Progress" in both.
- MCU colors (both apps, 2026-11-22): Expanded Universe categories get their own color from a 6-color palette (all ≥ 5.3:1 on the cards) in `categoryColors`, instead of one dark red (#B91C1C, 2.3:1). Fox X-Men Universe, Sony Spider-Man Universe and The Defenders Saga are pinned; new categories take the least-used color. The Mutant Saga (teal, Phases 7–9, years TBD) is in `SAGAS`, hidden until it has content; the phase picker lists Phases 1–9.
