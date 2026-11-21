#!/bin/zsh
# Builds the Release app and installs it on the iPhone (USB or Wi-Fi) with a
# freshly generated provisioning profile. A free Apple ID team's profile expires
# after 7 days, so a launchd agent (com.dwernery.projectshield-install) runs
# ~/Library/Scripts/projectshield-check.sh daily at 7 pm; when the installed
# profile has under 3 days left it opens projectshield-install.command in
# Terminal (Terminal, because background jobs cannot read ~/Documents).
#
#   ./scripts/install-device.sh                 # first paired iPhone, one attempt
#   DEVICE_ID=<udid> ./scripts/install-device.sh
#   ATTEMPTS=12 RETRY_DELAY=600 ./scripts/install-device.sh   # keep trying (phone away/locked)
set -uo pipefail

cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH" # launchd starts with a bare PATH

ATTEMPTS=${ATTEMPTS:-1}
RETRY_DELAY=${RETRY_DELAY:-600}
BUNDLE_ID=com.dwernery.projectshield
PROFILES_DIR="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
# Read by ~/Library/Scripts/projectshield-check.sh to decide when to renew.
EXPIRY_FILE="$HOME/Library/Application Support/ProjectSHIELD/profile-expiry"

# Prints the paths of this app's cached provisioning profiles.
app_profiles() {
  local f
  for f in "$PROFILES_DIR"/*.mobileprovision(N); do
    security cms -D -i "$f" 2>/dev/null \
      | plutil -extract Entitlements.application-identifier raw - 2>/dev/null \
      | grep -q "\.$BUNDLE_ID\$" && print -r -- "$f"
  done
}

# Xcode reuses a cached profile until it expires; removing it makes the build
# request a new one, so every install gets the full 7 days.
drop_cached_profiles() {
  app_profiles | while IFS= read -r f; do rm -f "$f"; done
}

record_expiry() {
  local f expiry=""
  for f in "${(@f)$(app_profiles)}"; do
    [[ -n "$f" ]] || continue
    expiry=$(security cms -D -i "$f" | plutil -extract ExpirationDate raw -)
  done
  [[ -n "$expiry" ]] || return 0
  mkdir -p "${EXPIRY_FILE:h}"
  print -r -- "$expiry" > "$EXPIRY_FILE"
  echo "Profile valid until $expiry"
}

notify() {
  osascript -e "display notification \"$1\" with title \"Project SHIELD\"" 2>/dev/null || true
}

find_device() {
  local json
  json=$(mktemp)
  xcrun devicectl list devices --json-output "$json" >/dev/null 2>&1 || { rm -f "$json"; return 1; }
  node -e '
    const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).result.devices.find(
      (d) => d.hardwareProperties?.reality === "physical" &&
             d.hardwareProperties?.platform === "iOS" &&
             d.connectionProperties?.pairingState === "paired");
    if (d) console.log(d.hardwareProperties.udid);' "$json"
  rm -f "$json"
}

attempt() {
  local device=${DEVICE_ID:-$(find_device)}
  if [[ -z "$device" ]]; then
    echo "No paired iPhone found (plug it in, or enable “Connect via network” in Xcode → Devices)." >&2
    return 1
  fi

  [[ -d ios ]] || npx expo prebuild --platform ios || return 1

  xcodebuild \
    -workspace ios/ProjectSHIELD.xcworkspace \
    -scheme ProjectSHIELD \
    -configuration Release \
    -destination "id=$device" \
    -derivedDataPath ios/build \
    -allowProvisioningUpdates \
    -allowProvisioningDeviceRegistration \
    -quiet \
    build || return 1

  xcrun devicectl device install app \
    --device "$device" \
    ios/build/Build/Products/Release-iphoneos/ProjectSHIELD.app || return 1

  echo "Installed ProjectSHIELD on $device"
  record_expiry
}

drop_cached_profiles
for i in $(seq 1 "$ATTEMPTS"); do
  if attempt; then
    notify "Reinstalled on your iPhone; signing renewed for 7 days."
    exit 0
  fi
  if (( i < ATTEMPTS )); then
    echo "Attempt $i/$ATTEMPTS failed; retrying in ${RETRY_DELAY}s." >&2
    sleep "$RETRY_DELAY"
  fi
done

notify "Weekly reinstall failed. Run npm run ios:device with the iPhone nearby."
exit 1
