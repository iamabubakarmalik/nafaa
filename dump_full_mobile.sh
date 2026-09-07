#!/bin/bash
OUT="$HOME/Desktop/nafaa-mobile-dump/mobile_full_dump.txt"
> "$OUT"

dump_dir() {
  local dir="$1"
  find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.bak" | sort | while read -r f; do
    echo "" >> "$OUT"
    echo "═══════════════════════════════════════════════════════════" >> "$OUT"
    echo "FILE: $f" >> "$OUT"
    echo "═══════════════════════════════════════════════════════════" >> "$OUT"
    cat "$f" >> "$OUT"
  done
}

# ── FRONTEND: entire mobile industry folder ──
dump_dir "apps/web/src/industries/mobile"

# ── FRONTEND: shared POS + sales (used by mobile) ──
dump_dir "apps/web/src/modules/pos"
dump_dir "apps/web/src/modules/sales/sales"
dump_dir "apps/web/src/core/lib/offline"

# ── BACKEND: entire mobile industry module ──
dump_dir "apps/api/src/industries/mobile"

# ── BACKEND: sales module (shared, already patched) ──
dump_dir "apps/api/src/modules/sales/sales"

# ── PRISMA: relevant models ──
echo "" >> "$OUT"
echo "═══════════════════════════════════════════════════════════" >> "$OUT"
echo "PRISMA SCHEMA — Mobile-relevant models" >> "$OUT"
echo "═══════════════════════════════════════════════════════════" >> "$OUT"
awk '
  /^model (Sale|SaleItem|ProductImei|UsedPhone|UsedPhoneInspection|RepairTicket|RepairPart|RepairStatusLog|RepairPaymentRecord|EmiPlan|EmiInstallment|Product|ProductVariant|Customer) / { show=1 }
  show { print }
  show && /^}/ { print ""; show=0 }
' apps/api/prisma/schema.prisma >> "$OUT"

echo "Done. Total size:"
wc -l "$OUT"
