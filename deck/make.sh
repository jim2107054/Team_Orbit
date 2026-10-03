#!/usr/bin/env bash
# Build -> embed the reference fonts -> validate -> render for visual QA.
set -euo pipefail

D="$(cd "$(dirname "$0")" && pwd)"
SKILL="/c/Users/ttawh/.claude/skills/synced/c1fa917e-569f-40ee-b177-36678a447997_27715043-f550-48b1-9648-00eaaa426701/pptx"
FINAL="${1:-D:/Team_Orbit/astha-deck.pptx}"

cd "$D"
echo "── build ──────────────────────────────────────────"
node build.js raw.pptx

echo "── embed reference fonts ──────────────────────────"
python embed_fonts.py raw.pptx Untitled_design.pptx final.pptx

echo "── validate ───────────────────────────────────────"
python "$SKILL/scripts/office/validate.py" final.pptx

echo "── render for QA ──────────────────────────────────"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File export.ps1 \
  -Pptx "$(cygpath -w "$D/final.pptx")" -OutDir "$(cygpath -w "$D/qa")" -Width 1500 | tail -2

cp final.pptx "$FINAL"
echo "── done ───────────────────────────────────────────"
echo "deck -> $FINAL"
