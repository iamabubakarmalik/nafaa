#!/bin/bash
files=(
  "src/industries/mobile/api/used-phones.api.ts"
  "src/industries/mobile/api/imei.api.ts"
  "src/industries/mobile/api/mobile-wizard.api.ts"
  "src/industries/mobile/api/mobile-reports.api.ts"
  "src/industries/mobile/api/repairs.api.ts"
  "src/industries/mobile/api/emi.api.ts"
  "src/modules/pos/hooks/useSharedPosCart.ts"
  "src/modules/pos/components/pos-types.ts"
  "src/modules/sales/sales/api/sales.api.ts"
  "src/core/lib/offline/offlineSales.ts"
  "src/core/lib/offline/offlineProducts.ts"
  "src/industries/mobile/pages/UsedPhonesPage.tsx"
  "src/industries/mobile/pages/MobilePosPage.tsx"
  "src/industries/mobile/pages/MobileReportsV2.tsx"
  "src/industries/mobile/pages/GlobalImeiInventoryPage.tsx"
  "src/industries/mobile/pages/ImeiInventoryPage.tsx"
  "src/industries/mobile/components/ImeiPickerModal.tsx"
  "src/industries/mobile/components/UsedPhoneTradeInModal.tsx"
  "src/industries/mobile/components/UsedPhoneDetailsModal.tsx"
  "src/industries/mobile/MobilePack.tsx"
  "src/modules/inventory/products/api/products.api.ts"
)

for f in "${files[@]}"; do
  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo "FILE: $f"
  echo "═══════════════════════════════════════════════════════════"
  if [ -f "$f" ]; then
    cat "$f"
  else
    echo "NOT FOUND: $f"
  fi
done
