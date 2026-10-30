# Translation guide — Nafaa web app (English, Urdu, Roman Urdu)

Nafaa is POS and shop-management software used daily by ~125 small shops in Pakistan
(kiryana/grocery, bakery, pharmacy, mobile shops...). Readers are shopkeepers and cashiers.
Every text must be simple everyday words a shopkeeper uses. Never literary, never formal.

Work files come from `pnpm i18n:todo`; check results with `node scripts/i18n/validate.mjs todo-N.json out-N.json`, then `pnpm i18n:import out-*.json`.

Each input item: `key` = the source text exactly as written in code (mostly Roman Urdu, some English),
`where` = file:line where it is used (open the file if the meaning is unclear).

## Output
Write ONE JSON object to the output path you were given:
```
{ "<key exactly>": { "en": "...", "ur": "...", "roman": "..." }, ... }
```
- `en` and `ur` are REQUIRED for every key.
- `roman` is OPTIONAL: include it ONLY when the Roman Urdu source should be reworded (rules below).
  Omit it when the key is fine as it is, and ALWAYS omit it when the key is English.
- Plurals: when the key has `{{count}}` you may give `"en": {"one": "1 item", "other": "{{count}} items"}`.
- Valid JSON only (escape `"` and `\`; keep `\n` as `\n`).

## Hard rules (all languages)
1. Keep every `{{placeholder}}` exactly (same names, same count). You may move them.
2. Keep leading/trailing spaces and leading separators exactly: a key like `" · pehle {{n}}"` must
   translate to something that also starts with `" · "`. Keys like `"{{value}}"` suffixes are fragments of a
   sentence; translate the fragment so it still joins correctly.
3. Keep unchanged in every language: brand and product names (Nafaa, JazzCash, Easypaisa, WhatsApp, Google,
   Shopify, Daraz, Foodpanda, Excel), keyboard keys (Enter, Esc, Tab, Ctrl, Alt, Shift, F2, F12, Ctrl+B),
   codes and acronyms (POS, SKU, IMEI, PIN, OTP, QR, GST, NTN, FBR, PDF, CSV, ID, URL, API, KOT),
   units (kg, g, pcs, L), currency "Rs"/"PKR", time zone ids (Asia/Karachi), example data (names, numbers,
   emails like ahmad@gmail.com, phone numbers like 03001234567).
4. Digits stay Latin (0-9) in Urdu too. Do not use Arabic-Indic digits.
5. Same meaning, same length or shorter. Buttons and titles: 1-3 words.
6. Symbols like →, ·, —, …, ( ) stay as they are.

## English (`en`)
Natural, short, plain English as used in Pakistani shops. Sentence case ("New product", not "New Product").
Glossary (use consistently):
- bill → Bill · Sale/Sales → Sale/Sales · Discount · Profit · Cost · Expense(s) · Purchase · Return
- udhaar → Credit (on a bill: "on credit") · khata → Customer credit (or "Credit book" when it is the book) ·
  baqi (amount left) → Due / Balance due · jama → Deposit/Paid in · wapas → Return/Back · galla → Cash drawer ·
  tijori → Safe · maal → Stock/Goods · kharab maal → Damaged stock · dukaan → Shop · malik → Owner ·
  hisaab → Accounts/Report (context) · din ka hisaab → Day report · gahak → Customer · supplier → Supplier
- Roman verbs: "karein/kijiye" → imperative ("Save", "Select"), "ho gaya" → done ("Saved").
- If the key is already English, `en` is the same text (fix only clear typos).

## Urdu (`ur`) — Urdu script
Simple spoken Urdu as a shopkeeper says it, written in Urdu script. Not literary, not Persianised.
Business and app words stay English, written in Urdu script, exactly like this:
- Sale → سیل · Sales → سیلز · Discount → ڈسکاؤنٹ · Profit → پرافٹ · Cost → کاسٹ · Expense → خرچہ is NOT allowed; use ایکسپینس
- Stock → اسٹاک · Product(s) → پروڈکٹ / پروڈکٹس · Bill → بل · Cash → کیش · Card → کارڈ · Report → رپورٹ
- Customer → کسٹمر · Supplier → سپلائر · Purchase → پرچیز · Return → ریٹرن · Payment → پیمنٹ · Branch → برانچ
- Settings → سیٹنگز · Dashboard → ڈیش بورڈ · Barcode → بارکوڈ · Category → کیٹیگری · Price → قیمت · Rate → ریٹ
- Save → محفوظ کریں is too formal; use "سیو کریں" · Edit → ایڈٹ · Delete → ڈیلیٹ · New → نیا · Add → شامل کریں / ایڈ کریں
- Everyday Urdu words people use are fine and preferred: ادھار، کھاتہ، حساب، مال، گلہ، تجوری، دکان، آج، کل، ہفتہ، مہینہ، باقی، واپس، جمع
- Never: چھوٹ، منافع، لاگت، خریداری، قسم، تعداد، مقدار، مخصوص، بذریعہ، ادائیگی (use پیمنٹ), اطلاع (use نوٹیفکیشن or بتائیں)
- Keep sentences short. Polite imperative "کریں" (not "کیجیے").
- Latin parts (brand names, codes, numbers, placeholders) stay in Latin letters inside the Urdu sentence.

## Roman Urdu (`roman`) — only when rewording is needed
The key is already Roman Urdu. Give `roman` only if the key breaks one of these owner rules:
- Buttons and page titles use the plain English word: "New" (not "Naya banayein"/"Naya bana"), "Save" (not "Mehfooz karein"),
  "Edit", "Delete", "Add", "Back", "Products", "Search", "Cancel", "Close".
- Business words in English: Discount (never "chhoot"/"riyayat"), Sale (not "bikri"), Profit (not "munafa"), Cost (not "lagat"),
  Expense (not "kharcha"), Purchase (not "kharidari"), Amount (not "raqam"), Type (not "qism"), Quantity (not "miqdar"/"tadaad"),
  Payment (not "adaigi"), Period (not "muddat").
- Hard/literary words → easy ones: mutawaqqa→expected, muaqool→theek, tadaad→kitne, hisse→parts, zariya→tareeqa,
  mehfooz→save/safe, baqi (as "remaining items")→bacha hua, mutafiq→agree, maloomat→details/info, huroof→letters,
  ijazat→permission, intikhab→chunein.
Keep counter words everyone uses: khata, udhaar, hisaab, maal, galla, tijori, jama, wapas, kharab, dukaan, bill.
If none of this applies, OMIT `roman`.
