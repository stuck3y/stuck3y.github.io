#!/bin/bash
# BarSnip build script.
#
#   ./build.sh            build BarSnip.app into ./build
#   ./build.sh install    build, copy to /Applications, and launch it
#
# Only requirement: Xcode Command Line Tools (xcode-select --install).
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="BarSnip"
BUILD_DIR="build"
APP="$BUILD_DIR/$APP_NAME.app"

if ! command -v swiftc >/dev/null 2>&1; then
  echo "✋ swiftc not found."
  echo "   Install the Xcode Command Line Tools first:"
  echo ""
  echo "     xcode-select --install"
  echo ""
  echo "   (a few minutes, one time) — then run ./build.sh again."
  exit 1
fi

echo "✂️  Building $APP_NAME…"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

swiftc -O Sources/main.swift -o "$APP/Contents/MacOS/$APP_NAME"
cp Sources/Info.plist "$APP/Contents/Info.plist"
printf 'APPL????' > "$APP/Contents/PkgInfo"

# App icon — nice to have, never fatal.
if swift Scripts/makeicon.swift "$BUILD_DIR/icon_1024.png" 2>/dev/null; then
  ICONSET="$BUILD_DIR/$APP_NAME.iconset"
  rm -rf "$ICONSET"
  mkdir -p "$ICONSET"
  for size in 16 32 128 256 512; do
    sips -z "$size" "$size" "$BUILD_DIR/icon_1024.png" \
      --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
    double=$((size * 2))
    sips -z "$double" "$double" "$BUILD_DIR/icon_1024.png" \
      --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/$APP_NAME.icns"
  echo "🎨 Icon baked."
else
  echo "🎨 Icon generation skipped (app works fine without it)."
fi

codesign --force --sign - "$APP" >/dev/null 2>&1 || true

echo "✅ Built $APP"

if [[ "${1:-}" == "install" ]]; then
  echo "📦 Installing to /Applications…"
  pkill -x "$APP_NAME" 2>/dev/null || true
  rm -rf "/Applications/$APP_NAME.app"
  ditto "$APP" "/Applications/$APP_NAME.app"
  open "/Applications/$APP_NAME.app"
  echo ""
  echo "🎉 Done! Look for the little scissors ✂ in your menu bar."
  echo "   Your snippets live in: ~/Library/Application Support/BarSnip/snippets.json"
else
  echo ""
  echo "   Try it now:      open $APP"
  echo "   Keep it forever: ./build.sh install"
fi
