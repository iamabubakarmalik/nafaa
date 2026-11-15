# Nafaa Market — Mukammal Map aur Plan

Tareekh: 26 Oct 2026, update 15 Nov 2026 · Branch: design/overhaul · Naam: Nafaa Market (26 Oct, pehle "Nafaa Bazaar") · Domain: market.nafaa.pk (purana bazaar.nafaa.pk is par redirect)

## 1. Maqsad

Pakistan ka sab se acha local marketplace. Har dukaan ka apna Nafaa POS uska online storefront chalaye:

- **Stock asli:** POS wala hi stock.
- **Order seedha POS me:** bill banta hai aur stock katta hai.
- **Hisaab hamesha sahi:** khata, profit aur reports sab sahi rehte hain.

Char log is ko istemal karenge, aur char-on ke liye "full best":

| Kaun | Kahan | Kya milega |
| --- | --- | --- |
| **Customer** | market.nafaa.pk (Next.js, Google par aaye) + **Nafaa Market mobile app** (Play/App Store) | Qareeb ki dukaanen, har category ka apna flow, asli stock, tracking, dobara mangwao, subscriptions, loyalty |
| **Dukaan ka malik** | POS ke andar "Market" section | Ek click me catalog online, orders POS ke Online Orders me, riders, reviews, offers, reports, sab settings se |
| **Nafaa admin** | apps/admin → "Market" | Dukaanon ki approval/verification, orders aur disputes, home page curation, categories, commission, settlements |
| **Rider** | Nafaa POS mobile app me "Rider" mode | Aaj ke orders, rasta, pickup/deliver, COD jama, live location |
| **Wholesaler** | Market ka "Wholesale" darwaza (business buyers) | Dukaanen thok maal mangwayen, order seedha wholesaler ke POS me, khata dono taraf |

## 2. Abhi kya haal hai (jaiza 26 Oct)

| Hissa | Haal |
| --- | --- |
| API (apps/api/src/marketplace, ~16k lines) | Shops, products, cart, checkout, orders, reviews, auth chalte hain |
| POS se link | **Nahi hai.** Market order se POS bill nahi banta aur stock nahi katta. "Stock" sirf ek manual switch hai |
| Category flows | **Nahi hain.** Restaurant modifiers, pharmacy nuskha, cake order, size/colour aur booking slots, kuch bhi nahi |
| Seller pages (apps/web/src/marketplace, 22 pages) | Sab purane design par, ek duplicate profile page, alag "industry-themes" system |
| Customer app (apps/marketplace, ~26k lines) | Asli API se chalta hai lekin apna purana design hai |
| Admin | Marketplace ka **kuch bhi nahi** |

Customer app ke masle:

- Icons/favicon gayab hain.
- Urdu adhoori hai.
- Kai jagah qeemat bina formatting ke hai ("PKR 1234.00").
- `.env.example` me ek private key pari hai.

Kaam ki cheezein jo pehle se bani hain, inhi par build karenge:

- **POS Online Orders pipeline:** naya design, accept → bill + stock, cancel → stock wapas, COD hisaab, couriers.
- **POS ke apne models:**
  - restaurant ModifierGroup/Option
  - ProductVariant (size/colour)
  - Prescription
  - BakeryBulkOrder
  - Booking aur salon appointments
  - ShopStock
- **Design system** (`apps/web/src/design-system`) aur **industry config pattern** (products page).

Bugs jo seedhe theek honge:

1. Customer aur seller notifications ka **route takrao** (`GET marketplace/notifications`).
2. Coupon checkout me lagta hi nahi (TODO).
3. Har payment method par paymentStatus PENDING (ternary ghalat).
4. Delivery slots dukaan ke auqaat nahi dekhte.
5. Rider app ke endpoints bina login ke hain.
6. Seller ka status change koi bhi status le leta hai: na history, na notification.
7. Shop ki category hamesha 'GROCERY' default hoti hai, POS industry se nahi aati.

## 3. Faislay (malik ne 26 Oct ko diye)

- **Migration:** additive migration ki ijazat hai. Sirf local par lagegi, prod par deploy malik ke kehne par.
- **Kam faida wale features v1 se hat jayenge:**
  - Hatne wale: auction, live shop, group buy, bargain, sales funnel, segmentation, AI recommendations, multi-shop, prayer mode, streaks, sustainability, try-before-buy, emergency delivery, split payment, voice search.
  - Pages aur nav se niklenge aur API modules band honge. **DB tables rahengi**, data nahi mitega.
- **Commission:** abhi 0%. Admin me commission % ki setting tayyar rahegi.

## 3b. Naye faislay (malik, 15 Nov)

- **PWA nahi, proper mobile apps.** Customer ke liye "Nafaa Market" Expo app (Play + App Store). Web bhi best.
- **Rider alag store app nahi.** Rider dukaan ka staff hai, is liye Nafaa POS mobile app (2.0, live) me "Rider" mode banega, bilkul booker/delivery-man ki tarah: login karte hi rider screen. Ek app kam, aur background GPS native milta hai.
- **Customer website Next.js par** (apps/storefront aur apps/site ki tarah), taake har dukaan aur product Google par aaye. Folder apps/marketplace rehta hai, Vercel project nafaa-marketplace ka framework Next ho jayega.
- **Har business type:** restaurants, gym, clinic, salon, hotel… sab 5 darwazon me (section 5). Wholesale ke liye 6th darwaza (section 5b).
- **Admin:** apps/admin me "Marketplace" workspace ka slot pehle se rakha hua hai (admin redesign 11 Nov). Wahin poora Market admin banega.
- **Teen zabanen:** har screen English / Urdu / Roman Urdu, simple aur natural alfaaz.
- **Payment gateways** (JazzCash/Easypaisa/card merchant): company (Orve Solutions) register hone ke baad. Shuru me COD + Nafaa Stores wale payment links/bank transfer.

## 4. Architecture (dil ka map)

```
 Customer (market.nafaa.pk)
      │  cart (kai dukaanen) → checkout
      ▼
 API marketplace/checkout ──► MarketplaceOrder (har dukaan ka alag)
      │
      └──► Online Orders pipeline (channel: NAFAA_MARKET)
                │  accept → SalesService.create → POS bill (source MARKETPLACE)
                │           stock katta, khata/loyalty/profit sahi
                │  status: CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
                │  cancel → bill void → stock wapas
                ▼
      status sync wapas MarketplaceOrder + OrderStatusHistory + customer notification
```

- **Market ek sales channel hai** (jaise Daraz/Shopify/Nafaa Store): har shamil dukaan ka `Integration(type NAFAA_MARKET, SALES_CHANNEL)`. Isi se:
  - **Online products hub** me "Nafaa Market" channel: product on/off, channel price rule, stock allocation (commerce chat ka bana hua system).
  - Checkout `OnlineOrdersService.receive()` se ChannelOrder banata hai (Nafaa Stores ka `store-checkout.service.ts` template). Auto-accept, risk, couriers, dispatch sab lagte hain.
  - Status wapas customer tak: `channelStatusEvents` / `orderEvents` sun kar MarketplaceOrder + OrderStatusHistory + push.
- **Ek orders system:** dukaan wala Market orders bhi POS ke **Online Orders** page me dekhega, Daraz/Shopify/website ke saath, "Market" filter ke saath. Alag purana orders page khatam.
- **Asli stock:** product availability `ShopStock` se aayegi. Manual switch sirf "online band" ke liye rahega.
- **Ek design:** customer app bhi POS wala design system istemal karega: tokens, components, dark mode, Urdu fonts aur industry colours. Is ke liye design system ko shared package banaya jayega, taake web, admin aur market teeno ek hi jagah se lein.
- **Category engine:** ek shared config (`packages/market-config`) jo API, POS aur customer app teeno parhte hain (neeche section 5).
- **Settings-driven:**
  - Dukaan ki har cheez POS Settings → Market se badle: delivery, auqaat, payments, min order, flows.
  - Platform ki har cheez admin se badle: categories, home sections, commission, launch cities.

## 5. Category engine

**Ek app, 5 darwaze, 3 qisam ke order** (malik ko 26 Oct samjhaya). Restaurants/cafes alag app nahi. Woh isi app me "Khana" darwaza hain jo food app jaisa chalta hai.

| Darwaza | Order ki qisam | POS industries |
| --- | --- | --- |
| Khana | Abhi delivery (30–60 min) | restaurant (cafe/fast food/dhaba sub-type filters), bakery |
| Grocery | Abhi delivery | retail, standard, dairy, meat |
| Pharmacy | Abhi delivery | pharmacy |
| Shopping | Aaj (rider) ya 2–3 din (courier, Pakistan-wide) | garments, shoe, jewelry, cosmetics, electronics, mobile, appliances, furniture, carpet, hardware, autoparts, bookstore, toystore, sports, petshop, florist, agri |
| Booking | Slot lo, khud jao | salon, clinic, optical, gym, gaming, hotel, services-biz |

Warehouse/godown market par nahi aate. Do kaam wali dukaan (masalan optical) dono darwazon me aa sakti hai; malik settings se chune.

Gym/club: membership plans online khareedna + class/slot booking (Booking darwaza). Hotel: room booking. Clinic: doctor ka appointment.

Neeche har category ka flow hai. Engine ek hi hai.

| Market category | POS industries | Customer flow | Dukaan side |
| --- | --- | --- | --- |
| **Khana / Restaurant** | restaurant, cafe, bakery (ready items) | Menu sections, add-ons/modifiers (POS ModifierGroup), delivery/pickup/dine-in, tayyari ka waqt | Accept → KOT kitchen me |
| **Grocery / Kiryana** | retail, standard, dairy, meat, agri | Jaldi basket, kg/dozen units, "na ho to badal dein?" (substitute), delivery slot, min order | Picking list, substitute mark |
| **Pharmacy** | pharmacy | OTC seedha. Rx dawa par **nuskha photo upload**, pharmacist confirm ke baad payment, salt ke mutabadil | Nuskha dekh kar accept/reject, Prescription record |
| **Bakery** | bakery | Ready items + **custom cake** (weight, flavour, message, tareekh) | BakeryBulkOrder banta hai |
| **Fashion** | garments, shoe, jewelry, cosmetics | **Size/colour** (ProductVariant), size guide, return policy | Variant ka asli stock |
| **Electronics / Mobile** | electronics, mobile, appliances | Specs, warranty, PTA status | IMEI bill par |
| **Ghar / Hardware** | hardware, furniture, carpet, autoparts, paint | Units (feet/meter), bulk qty, delivery charges size se | Normal |
| **Services / Booking** | salon, clinic, gym, optical, services-biz | **Booking slot** chuno, staff chuno, advance | Booking/Appointment POS me |
| **Kitaben / Toys / Sports / Pets / Florist** | bookstore, toystore, sports, petshop, florist | Default retail flow (florist: delivery tareekh + message) | Normal |

Har category config me ye cheezen hongi:

- naam (Roman Urdu/Urdu/English), icon/colour (industry identity se)
- product card ka style
- product page ke blocks
- cart rules (min order, slot zaroori?)
- checkout extra steps (nuskha, cake form, booking slot)
- order statuses ke labels

## 5b. Wholesale darwaza (B2B)

- Sirf business accounts ke liye (Nafaa POS wali dukaan login kare). Wholesalers/distributors apna catalog "Wholesale" me daalte hain: thok qeemat, carton/min qty, area.
- Mojooda **trade network** (`modules/trade-network`, 30 Oct live) par: order → wholesaler ke POS me sale, khareedne wale ke POS me khud purchase, khata dono taraf confirm.
- Market sirf "dhoondne ki jagah" banta hai (directory, search, categories, ratings). Order/khata trade network ka hi rehta hai.

## 6. Phases — kaam ki tarteeb

Har phase complete, typecheck aur khud test hone ke baad agla. Testing end me feature-by-feature malik ke saath.

### Phase 0 — Engine aur buniyad (API)

1. Migration (additive):
   - `IntegrationType.NAFAA_MARKET`
   - `MarketplaceOrder.attachments Json?` (nuskha/photos)
   - `MarketplaceOrderItem.options Json?` (cake form, booking slot)
   - `ShopMarketplaceProfile.category String?` + `flowSettings Json?`
   - `PlatformSetting` me commission/home curation (SystemSetting row, schema nahi)
2. Har published dukaan ka NAFAA_MARKET channel khud bane. Checkout ke baad order Online Orders pipeline me jaye. Auto-accept setting POS wali.
3. Status sync wapas: OrderStatusHistory, customer notification (push/SMS/WhatsApp jo on ho), rider info.
4. Asli stock: listing aur cart me `ShopStock` aur variant stock, checkout par dobara check.
5. Shop category POS industry se khud, malik badal sake.
6. `packages/market-config`: category engine.
7. Bugs 1–7 theek. Coupon (POS Promotions se), payment status, slots dukaan ke auqaat se, rider token auth.
8. Gimmick modules band, `.env.example` saaf.

### Phase 1 — Dukaan wale ka Market (POS ke andar)

Sidebar me ek **"Market"** group. Har page naye design par bane (PageShell/PageHero/KpiRow/FilterBar, keyboard-first, light/dark).

1. **Market Home:**
   - Aaj ke orders, sales, rating aur views.
   - Kya adhoora hai (photos nahi, auqaat nahi), aur "online jao" checklist.
2. **Dukaan profile:** mojooda MarketplaceSettingsPage ko pura karo (logo, cover, auqaat, chuttiyan, delivery zone map, payments). Purana ShopProfilePage mitao.
3. **Online products:**
   - POS catalog se bulk publish/unpublish, online qeemat, photos, category.
   - Stock POS se aata hai. Industry panels (menu modifiers, sizes, Rx flag).
4. **Orders:** POS Online Orders + "Market" channel filter, category ke extra blocks (nuskha photo, cake form, slot). Purana orders page mitao.
5. **Delivery aur riders:** apne riders, zones, delivery fee rules, live tracking.
6. **Reviews:** jawab, report.
7. **Offers:** coupons, sale (POS Promotions se jure hue).
8. **Customers aur messages:** Market customers, chat.
9. **Reports:** Market sales, top products, conversion.
10. **Settings → Market:** sab switches (auto-accept, min order, slots, substitutes, nuskha zaroori, cake orders, booking).

Purane 22 pages aur `industry-themes.ts` mitao.

### Phase 2 — Customer website (market.nafaa.pk) naye sire se, Next.js

Shared design tokens par (POS jaisa look). Light/dark, English/Roman Urdu/Urdu (RTL), mobile-first, keyboard bhi.

1. **Home:**
   - Location → qareeb ki dukaanen
   - Category tiles, "dobara mangwao", offers
   - Admin ke curated sections
2. **Category pages:** har category ka apna landing aur filters.
3. **Dukaan page:** category ke hisaab se (menu / basket / catalog / booking), auqaat, delivery info, reviews.
4. **Product page:** variants, modifiers, nuskha, cake form, slot.
5. **Search:** dukaan + product, filters.
6. **Cart:** kai dukaanen, har dukaan ka min order aur fee alag.
7. **Checkout:** address (map pin), slot, payment (COD, JazzCash, Easypaisa, card jab ready ho), coupon, loyalty.
8. **Order tracking:** live status, rider, call/WhatsApp, cancel, rate.
9. **Account:**
   - orders, addresses, wishlist, followed shops
   - subscriptions (doodh/anday/roti), loyalty/wallet, notifications
   - security, data export
10. **Login:** phone OTP, Google, guest checkout (phone se).
11. **Icons/OG:** brand/logo se, web push (nayi VAPID keys).
12. **SEO:** shop aur product pages indexable (prerender/SSR plan), sitemap, canonical market.nafaa.pk, bazaar.nafaa.pk → 301 redirect.

Purane pages/components mitao, kuch purana na rahe.

### Phase 3 — Nafaa Market mobile app (customer, Expo)

- Naya app `apps/market-app`, POS mobile 2.0 ka design kit aur release pipeline (EAS) istemal kare.
- Website ke saare features, native: location, push, camera (nuskha), maps, Google/phone login, 3 zabanen, dark mode, animated logo opening.
- iOS rules: Apple sign-in jab Google ho; koi ghalat payment rasta nahi.

### Phase 4 — Admin (apps/admin → Marketplace workspace)

1. **Overview:** orders, GMV, active dukaanen, cities.
2. **Dukaan approvals/verification:** CNIC/documents, verification level, pause/feature.
3. **Orders monitor:** stuck orders, disputes, refunds.
4. **Reviews/reports moderation.**
5. **Home aur categories curation:** banners, featured shops, sections, launch cities.
6. **Commission aur settlements:** % (abhi 0), har dukaan ka hisaab, payout record.
7. **Market customers aur support tickets.**
8. **Platform settings:** payment methods on/off, min app version, policies.

### Phase 5 — Rider mode + dukaan wala mobile par

- **Nafaa POS mobile app me "Rider" mode:** dukaan wala rider ko staff ki tarah add kare (role/permission). Rider login → seedha rider screen.
  - Aaj ke orders, pickup/deliver ke bare buttons, map/rasta, customer ko call, COD jama, apni kamai.
  - Background GPS (native), customer ko live tracking.
- **Dukaan wala mobile par:** Market orders, naye order ki ghanti (push), accept/reject, product on/off.
- Nafaa riders baad me, isi model par.

### Phase 6 — Rozana adat wale features

- Subscriptions (doodh, anday, roti): rozana/hafta, rok/chhutti, POS me khud order.
- Dobara mangwao, favourites, loyalty points (POS loyalty se jure).
- Push/WhatsApp updates, price-drop/restock alerts.

### Phase 7 — Wholesale darwaza (section 5b)

### Phase 8 — Launch

- Feature-by-feature testing malik ke saath.
- Prod backup → migration → deploy (API Railway, market Vercel nafaa-marketplace).
- Pehli cities aur pehli dukaanen onboard.


## 7. Malik se kya chahiye (end par list)

1. JazzCash aur Easypaisa ke **production merchant credentials** (company register hone ke baad).
2. Card gateway ka faisla (Stripe Pakistan me nahi; PayFast/Safepay/Paymob?).
3. Market ki policies: refund/return, cancellation, delivery terms (draft hum bana denge).
4. Launch cities aur pehli dukaanen.
5. Support phone/WhatsApp number for customers.
6. Push notifications ki nayi VAPID keys (purani `.env.example` me khul chuki hain).

## 8. Kaam ke usool

- Sirf marketplace paths me kaam: apps/marketplace, apps/web/src/marketplace (+ naya Market module), apps/api/src/marketplace, Market parts of apps/admin, packages/market-config. Website chat saath chal rahi hai.
- Commit sirf apne paths (`git add <paths>`), kabhi force-push nahi.
- Migration hamesha hand-written additive. Kabhi prisma diff/reset/push nahi.
- Code English me, UI text simple Roman Urdu. Business terms English me (Discount, Sale, Profit).
- Har agent: grep pehle, line ranges parho, ek typecheck end me. **Max 2–3 agents**, mechanical kaam sonnet par. Bara round se pehle patch snapshot.
- Har naya page: PageShell (no width override) + PageHero with 3–4 stats + Guide. Sidebar labels English.
- Deploy sirf "deploy karo" par, aur kai kaam ek saath.
- Commerce chat online-orders par kaam kar rahi hai: wahan sirf zaroori hook (NAFAA_MARKET mapping), baqi Market ka code apne folders me.
