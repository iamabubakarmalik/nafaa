# Print

One print module for the whole app. A page describes *what* to print as a
`PrintDoc` (title, meta, rows, tables, text); this module decides *how*.

| Format | Output |
| --- | --- |
| A4 | Browser print through a hidden iframe |
| PDF | File download, drawn with jsPDF (loaded on demand) |
| Thermal 80 / 58 mm | ESC/POS straight to the paired printer when Settings → POS hardware is on "Direct"; otherwise a narrow browser print |

```tsx
<PrintButton doc={() => ({ title: 'Kam stock', sections: [...] })} />
// or
const { print } = usePrinter();
print(doc, 'pdf');
```

Settings → Printing (`PrintSettingsPage`) holds the per-computer options.
The "Kaghaz aur copies" tab sets the bill paper for this computer, POS auto
print, the shop-wide bill paper / copies / auto print (settings.edit), and
the paper and copies of every other printed slip (`docPrefs.ts` lists the
print dialogs and the storage keys they remember their choices under). The
"Reports ka print" tab sets the default format, colour or black & white,
logo/address/phone, footer line, print stamp and thermal text size. Shop
name, address, phone and logo come from the business settings
(`useBusinessHeader`).

Columns marked `wideOnly` are dropped on thermal paper. POS sale receipts
still use `@modules/pos/lib/thermalReceipt` and `@core/hardware/print`.
