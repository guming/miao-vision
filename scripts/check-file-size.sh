#!/bin/bash

echo "🔍 Checking file sizes in src/..."
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

has_errors=0
has_warnings=0

# Find all .ts and .svelte files
find src -name "*.ts" -o -name "*.svelte" | while read file; do
  lines=$(wc -l < "$file")

  if [ $lines -gt 500 ]; then
    echo -e "${RED}⚠️  EXCEEDS 500 lines:${NC} $file ($lines lines)"
    has_errors=$((has_errors + 1))
  elif [ $lines -gt 400 ]; then
    echo -e "${YELLOW}⚠️  WARNING (>400):${NC} $file ($lines lines)"
    has_warnings=$((has_warnings + 1))
  fi
done

echo ""
echo "✅ Check complete"

if [ $has_errors -gt 0 ]; then
  echo -e "${RED}Found $has_errors files exceeding 500 lines${NC}"
  exit 1
fi

if [ $has_warnings -gt 0 ]; then
  echo -e "${YELLOW}Found $has_warnings files approaching limit (>400 lines)${NC}"
fi
