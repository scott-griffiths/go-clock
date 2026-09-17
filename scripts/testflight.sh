#!/bin/sh
#
# Sends a build to TestFlight: bump, archive, upload.
#
#   scripts/testflight.sh            bump the build number, archive, upload
#   scripts/testflight.sh --dry-run  archive and export to a folder; no bump, no upload
#
# One command, because the steps are one act and the first is the one that
# gets forgotten. App Store Connect refuses a build whose number it has seen,
# so every upload needs a higher CURRENT_PROJECT_VERSION than the last — and a
# bump that is not committed is a bump that is lost, the next upload reusing
# the number and refused after a full archive. So the number goes up in the
# project file and that one file is committed, as its own commit, before
# anything is built. The tree is otherwise left exactly as found.
#
# Then the archive, and the export — which is the upload, since
# ios/ExportOptions.plist says `destination: upload`. -allowProvisioningUpdates
# on both makes the distribution certificate and profile itself. Ten minutes
# or so later the build is in App Store Connect's TestFlight tab, and from
# there it can be attached to a version and submitted for review.
#
# --dry-run does everything but talk to Apple's upload service: no bump, no
# commit, and the export goes to a folder instead, which is how to check the
# signing without spending a build number. (It still contacts the developer
# portal for a profile, so it needs the account signed in to Xcode.)

set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
project="$root/ios/GoClock.xcodeproj"
pbxproj="$project/project.pbxproj"
archive="${TMPDIR:-/tmp}/go-clock.xcarchive"
export_dir="${TMPDIR:-/tmp}/go-clock-export"
dry_run=false
[ "${1:-}" = "--dry-run" ] && dry_run=true

cd "$root"

marketing=$(sed -n 's/.*MARKETING_VERSION = \([^;]*\);.*/\1/p' "$pbxproj" | head -1)
current=$(sed -n 's/.*CURRENT_PROJECT_VERSION = \([0-9]*\);.*/\1/p' "$pbxproj" | sort -n | tail -1)
next=$((current + 1))

if $dry_run; then
    echo "Dry run: would upload $marketing ($next); building $marketing ($current) to a folder instead."
else
    # A dirty project file would be swept into the bump's commit.
    if [ -n "$(git status --porcelain -- "$pbxproj")" ]; then
        echo "ios/GoClock.xcodeproj/project.pbxproj has uncommitted changes; commit or stash them first." >&2
        exit 1
    fi
    # Every occurrence: the app and the UI test target each carry one per configuration.
    sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = $next;/g" "$pbxproj"
    git commit -q -m "Build $next" -- "$pbxproj"
    echo "Build $marketing ($next), committed."
fi

rm -rf "$archive"
echo
echo "> xcodebuild archive"
xcodebuild -project "$project" -scheme GoClock -destination 'generic/platform=iOS' \
    -archivePath "$archive" -allowProvisioningUpdates -quiet archive

echo
if $dry_run; then
    # The same options with the upload turned into a file.
    options="${TMPDIR:-/tmp}/go-clock-export-options.plist"
    sed 's|<string>upload</string>|<string>export</string>|' ios/ExportOptions.plist > "$options"
    rm -rf "$export_dir"
    echo "> xcodebuild -exportArchive (to $export_dir)"
    xcodebuild -exportArchive -archivePath "$archive" -exportPath "$export_dir" \
        -exportOptionsPlist "$options" -allowProvisioningUpdates
    echo
    echo "Exported to $export_dir; nothing uploaded."
else
    echo "> xcodebuild -exportArchive (upload)"
    xcodebuild -exportArchive -archivePath "$archive" -exportPath "$export_dir" \
        -exportOptionsPlist ios/ExportOptions.plist -allowProvisioningUpdates
    echo
    echo "Uploaded $marketing ($next). It appears in TestFlight once App Store Connect has processed it."
fi
