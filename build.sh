#!/usr/bin/env bash
# Builds dist/42-eval-finder-chrome.zip and dist/42-eval-finder-firefox.zip
# Usage: ./build.sh            (version taken from manifests)
#        ./build.sh 2.2.0      (also sets this version in both manifests)
set -euo pipefail
cd "$(dirname "$0")"

if [ $# -ge 1 ]; then
  ver="${1#v}"
  for m in manifests/*.json; do
    sed -i.bak -E "s/\"version\": *\"[^\"]*\"/\"version\": \"$ver\"/" "$m" && rm -f "$m.bak"
  done
fi

rm -rf dist build
mkdir -p dist

for target in chrome firefox; do
  out="build/$target"
  mkdir -p "$out"
  cp src/* "$out/"
  cp "manifests/$target.json" "$out/manifest.json"
  cp README.md "$out/"
  (cd "$out" && zip -qr "../../dist/42-eval-finder-$target.zip" .)
  echo "built dist/42-eval-finder-$target.zip"
done

rm -rf build
