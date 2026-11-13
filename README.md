# Project SHIELD (UtilityHub mobile)

Native iOS app for UtilityHub: Library, MCU tracker and Finances. It's a migration of the `utility-hub-ui` web app to Expo / React Native, built for personal installation (not the App Store).

- **Stack:** Expo SDK 58, Expo Router (native tabs with liquid glass), `@expo/ui` (SwiftUI controls and Swift Charts), TanStack Query, TypeScript.
- **Targets:** iPhone (including the foldable iPhone Duo, with wide layouts when unfolded) and iPad, iOS 27.

## Setup

```bash
npm install
cp .env.example .env              # EXPO_PUBLIC_API_URL for development
cp .env.example .env.production   # API URL used by release builds
```

The env files are git-ignored, since the API has no authentication.

## Run

```bash
npx expo run:ios                  # build the dev client and launch the simulator
npx expo start                    # start Metro for an installed dev build
```

## Install on an iPhone

```bash
npx expo run:ios --device --configuration Release
```

1. Sign in to your Apple ID in Xcode (Settings → Accounts).
2. Turn on Developer Mode on the phone.
3. Trust the developer profile on the phone (Settings → General → VPN & Device Management).

With a free Apple ID, the install expires after 7 days; run the command again to refresh it.

## Checks

```bash
npx tsc --noEmit && npx expo lint && npx expo-doctor
```

## Layout

- `src/app/`: routes (Expo Router)
- `src/components/`: UI
- `src/lib/`: API clients, hooks and pure logic per domain
- `src/constants/`: theme, icons and navigation presets

`migration-progress.md` records the migration and the deliberate differences from the web app.
