# Nafaa Meta ads guide (Facebook + Instagram)

This guide goes with the creatives in this folder. Every image shows real Nafaa screens from local demo shops, filled with demo data through the app's own API. Nothing in the images is mocked up or AI-made.

- Offer used everywhere: **7 din free trial**, no card needed. Paid plans **from Rs 1,500 a month**. Do not quote any other price.
- Contact used in copy: WhatsApp **+92 324 1772933**, sign-up **app.nafaa.pk/register**, site **nafaa.pk**.
- Do not mention FBR, tax or "FBR approved" in any ad. Many shops avoid FBR, and it turns the ad into a tax message.
- Nafaa runs in the phone's browser and on a computer. Do not promise a Play Store app in ads.

---

## 1. Why the last ad was weak, and what these fix

The last kiryana ad (shopkeeper photo, tablet with a dashboard, Urdu heading "نئے انداز سے") brought WhatsApp leads, so the offer and the audience work. The creative held it back:

| Problem in the old ad | What it did to the ad | What the new set does |
| --- | --- | --- |
| AI-made shopkeeper and shop. Hands, packaging and shelf labels were slightly wrong. | People notice. It reads as cheap or fake and lowers trust before they message. | No AI people at all. The product is the hero: real Nafaa screens in clean phone frames. |
| The dashboard on the tablet was blurry and invented ("Rs 7,EA,000"). | The one thing we sell was unreadable, and the numbers looked fake. | Real screens with real demo numbers. A zoomed crop of the key number sits on every dashboard ad so it reads on a phone. |
| No Nafaa logo. | Nobody remembered whose ad it was. Clicks went to "some app". | Logo top-left on every image, every carousel card and the Reels cover. |
| Heading said "with a new style" and nothing about the benefit. | No reason to stop scrolling. | One clear benefit per image: "Register chhorein. Hisaab phone pe." |
| Emoji pills (lightning, box, chart) along the bottom, cut off at the edge. | Busy and clipped. Looked like a template. | No emoji in artwork. At most one line of support text, and nothing touches the edges. |
| Primary text said "e-commerce" and "WooCommerce" while the picture was a kiryana store. | Mixed message; the wrong people clicked and the right people skipped. | Separate image and copy per industry, and the text matches the picture. |
| The CTA ("Start free trial") was English on an Urdu ad, placed over the photo. | Inconsistent, and it sat where Meta's own button and labels cover it. | The CTA appears inside the safe zone in the same language as the headline ("7 din free trial", "WhatsApp karein"). |
| One square image for every placement. | Stories and Reels cropped the heading and logo. | Each concept is built for 4:5, 9:16, 1:1 and 1.91:1, with Stories and Reels safe zones kept clear. |

Keep from the old ad: the WhatsApp destination, the kiryana focus, and Urdu script as a variant for the kiryana and general sets.

---

## 2. Which size goes where

Meta's current specs: JPG or PNG, at least 1080 px wide, under 30 MB, sRGB. All files here are PNG, between about 0.3 and 1.2 MB.

| Placement | Use this file | Notes |
| --- | --- | --- |
| Facebook Feed, Instagram Feed | `*-1080x1350.png` (4:5) | Main format. Takes the most screen height on a phone. |
| Facebook and Instagram Stories | `*-1080x1920.png` (9:16) | The top 14% (270 px) and bottom 20% (384 px) are kept free of text, logo and buttons. |
| Instagram and Facebook Reels (image ads) | `*-1080x1920.png` (9:16) | Meta's Reels overlays cover more of the bottom. Nothing important sits below y = 1536. |
| Reels cover (when you post an organic Reel) | `*-reels-cover-1080x1920.png` | Logo and title sit inside the centre square, so the profile grid crop keeps them. |
| Facebook Marketplace | `*-1080x1080.png` (1:1) or 4:5 | Marketplace shows square well. |
| Instagram Explore, Explore home | 4:5 or 1:1 | |
| Messenger inbox, Messenger Stories | 1:1 for inbox, 9:16 for Stories | |
| Facebook right column, Audience Network, link ads with a website destination | `*-1200x628.png` (1.91:1) | Small on screen, so it carries only a headline and the phone. |
| Carousel (Feed) | `carousel/*-carousel-1..5-1080x1080.png` | Upload the five cards in order. Card 1's phone continues onto card 2. |

In Ads Manager, use **placement asset customisation**: upload the 4:5 image for Feeds, the 9:16 image for Stories and Reels, and the 1.91:1 image for the right column. Turn off Advantage+ creative "enhancements" that add text, change the aspect ratio, or add music to images: they crop the screens.

---

## 3. Campaign setup

### Objective and destination

1. **Main campaign: Engagement or Leads objective, conversion location "Messaging apps", WhatsApp.** Performance goal: maximise number of conversations. Button: **Send WhatsApp message**. This is what worked before; keep it as the main campaign.
2. **Test campaign (after week 2): Leads objective with an Instant Form** (name, phone, business type, city). It is cheaper per lead but the quality is lower; call the leads within one hour.
3. **Later:** a Sales or Leads campaign to `app.nafaa.pk/register` once the Meta pixel and Conversions API send a "trial started" event. Until then, do not optimise for link clicks: link clicks bring cheap, low-intent traffic.

Connect the WhatsApp Business number (+92 324 1772933) to the Facebook Page before you start, and set the WhatsApp **greeting message** to the `/salam` reply below.

### Audience (Pakistan)

- **Locations:** Pakistan, with the main cities as separate ad sets once there is data: Lahore, Karachi, Islamabad and Rawalpindi, Faisalabad, Multan, Gujranwala, Sialkot, Peshawar, Hyderabad, Sargodha, Bahawalpur, Sukkur, Quetta. Use "People living in this location".
- **Age:** 22-55 for shop owners (bakery, pharmacy, wholesale: 25-55; e-commerce sellers: 20-40; salons: 22-45).
- **Gender:** all. Do not split by gender at the start.
- **Language:** leave empty. Pakistani users mostly have English or Urdu set, and filtering cuts reach.
- **Start with Advantage+ audience** and add the interests per industry below as suggestions. If cost per conversation is high after 3-4 days, try a separate ad set with the interests as fixed targeting.
- **Base interests and behaviours for all industries:** Small business, Entrepreneurship, Small business owners (behaviour), Business page admins (behaviour), Retail, Point of sale, Inventory, Cash register.
- **Exclude:** people who already messaged the Page in the last 30 days (custom audience), and existing customers if you upload a customer list.
- **Retargeting ad set (after week 1):** people who messaged but did not sign up, and Instagram/Facebook engagers of the last 30 days. Use the carousel here.

### Budget

Prioritise by what is already working (grocery is by far the largest user group, then bakery). Example at Rs 5,000 a day; scale every line with your real budget.

| Ad set | Share | At Rs 5,000/day |
| --- | --- | --- |
| Kiryana / retail (Roman Urdu + Urdu) | 35% | Rs 1,750 |
| General "every business" | 15% | Rs 750 |
| Bakery | 8% | Rs 400 |
| Garments | 7% | Rs 350 |
| Restaurant | 7% | Rs 350 |
| Pharmacy | 7% | Rs 350 |
| Mobile shop | 7% | Rs 350 |
| Wholesale / distribution | 7% | Rs 350 |
| E-commerce sellers | 7% | Rs 350 |

- Do not judge an ad set before it has spent about Rs 3,000 or had 7 days.
- After two weeks, move budget to the ad sets with the lowest **cost per trial started** (not per conversation). Keep at least Rs 300/day on each industry so it keeps learning.
- If the total budget is below Rs 2,000 a day, run only kiryana, general and bakery first.

### A/B test plan

Change one thing at a time. Each step runs 5-7 days.

| Week | Test | How | Keep the winner by |
| --- | --- | --- | --- |
| 1 | Concept a vs b vs c (4:5 + 9:16) | Three ads in the kiryana ad set, same primary text | Cost per conversation, then reply rate to the first quick reply |
| 2 | Roman Urdu vs Urdu script image | Winning concept, both languages, same audience | Cost per conversation and trials started |
| 3 | Single image vs carousel | Winner vs the carousel | Cost per trial started |
| 4 | Primary text: Roman Urdu vs English vs Urdu | Same image | Conversations per 1,000 impressions and trials |
| ongoing | Each other industry: a vs b vs c | Same as week 1 | Cost per trial started |

Use Ads Manager's **A/B test** tool for the language test (week 2) so audiences do not overlap. Inside one ad set, Meta will push spend to one ad quickly; that is fine for week 1 but note the spend per ad when you compare.

Track every lead in a sheet: date, industry, city, ad name, replied (yes/no), trial started, paid. Ad names follow the file names (for example `kiryana-a-problem-1080x1350`).

---

## 4. Copy per industry

Character counts: Meta shows about 125 characters of primary text before "See more", headlines are cut after about 40, descriptions after about 30. The first line of each primary text is the hook.

CTA button for WhatsApp campaigns: **Send WhatsApp message**. For website or form campaigns: **Sign up**.

### Kiryana and retail

Files: `kiryana/` (Roman Urdu and Urdu images), `kiryana/carousel/`, `kiryana/kiryana-reels-cover-1080x1920.png`.

**Primary text**

- Roman Urdu: Udhaar register me, hisaab dimagh me? Nafaa se bill banayein, stock dekhein aur har customer ka khata phone pe rakhein. Internet na ho tab bhi chalta hai. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein, setup hum karwa denge.
- English: Still keeping udhaar in a register? Nafaa gives your kiryana store fast billing, stock alerts and a digital khata on your phone, even without internet. Free for 7 days, then plans from Rs 1,500 a month. Message us on WhatsApp and we will set it up with you.
- Urdu: ادھار رجسٹر میں اور حساب ذہن میں؟ نفع سے بل بنائیں، اسٹاک دیکھیں اور ہر گاہک کا کھاتہ فون پر رکھیں۔ انٹرنیٹ نہ ہو تب بھی چلتا ہے۔ 7 دن فری ٹرائل، پھر 1,500 روپے ماہانہ سے۔ واٹس ایپ کریں، سیٹ اپ ہم کروا دیں گے۔

**Headlines:** Kiryana ka hisaab, ab phone pe · Bill, stock aur khata ek app me · 7 din free trial, card nahi chahiye · کریانہ کا حساب، اب فون پر

**Descriptions:** Rs 1,500/mahina se · Internet ke baghair bhi · Setup me madad free

**Interests:** Grocery store, Supermarket, Convenience store, Retail, Wholesale, FMCG, Small business owners, Business page admins. Age 22-55.

### Garments and clothing

Files: `garments/`.

- Roman Urdu: Har size, har rang ka stock alag. Nafaa se garments ka bill banayein, kaunsa suit kitna bacha hai foran dekhein, aur exchange pe purana bill ek second me nikalein. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.
- English: Know exactly which size and colour is left. Nafaa gives your clothing shop fast billing, stock by size and colour, and easy exchanges with the old bill one tap away. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.
- Urdu: ہر سائز اور ہر رنگ کا اسٹاک الگ۔ نفع سے بل بنائیں، کون سا سوٹ کتنا بچا ہے فوراً دیکھیں، اور ایکسچینج پر پرانا بل ایک سیکنڈ میں نکالیں۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔

**Headlines:** Har size, har rang ka hisaab · Garments shop ka pura hisaab · 7 din free trial, aaj shuru karein
**Descriptions:** Rs 1,500/mahina se · Size aur rang ka stock · Setup me madad free
**Interests:** Clothing, Fashion, Boutique, Fashion design, Lawn (fabric), Textile industry, Tailor, Retail, Small business owners. Age 22-50.

### Salon and beauty parlour

Files: `salon/`.

- Roman Urdu: Appointment diary me, commission calculator pe? Nafaa me aaj ki bookings, har stylist ka kaam aur commission, aur services ka bill, sab ek jagah. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.
- English: Bookings in a diary and commission on a calculator? Nafaa keeps today's appointments, each stylist's work and commission, and every service bill in one place. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.
- Urdu: اپوائنٹمنٹ ڈائری میں اور کمیشن کیلکولیٹر پر؟ نفع میں آج کی بکنگز، ہر اسٹائلسٹ کا کام اور کمیشن، اور سروسز کا بل، سب ایک جگہ۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔

**Headlines:** Salon ki bookings aur hisaab, asaan · Appointments, staff aur Sale ek jagah · 7 din free trial, aaj shuru karein
**Descriptions:** Rs 1,500/mahina se · Staff commission khud · Setup me madad free
**Interests:** Beauty salon, Hairdresser, Hair salon, Cosmetology, Bridal makeup, Spa, Nail salon, Barber, Small business owners. Age 22-45.

### Restaurant, cafe and dhaba

Files: `restaurant/`.

- Roman Urdu: Order kitchen tak ghalat, table ka bill late? Nafaa me har table ka live bill, kitchen ko seedha KOT, aur din ke end pe pura cash hisaab. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.
- English: Wrong orders in the kitchen and slow table bills? Nafaa gives every table a live bill, sends orders straight to the kitchen as KOT, and closes the day's cash in minutes. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.
- Urdu: کچن تک غلط آرڈر اور ٹیبل کا بل لیٹ؟ نفع میں ہر ٹیبل کا لائیو بل، کچن کو سیدھا KOT، اور دن کے آخر میں پورا کیش حساب۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔

**Headlines:** Order se bill tak, sab tez · Tables, KOT aur bill ek app me · 7 din free trial, aaj shuru karein
**Descriptions:** Rs 1,500/mahina se · Dine-in, takeaway, delivery · Setup me madad free
**Interests:** Restaurant, Restaurant management, Food industry, Fast food restaurant, Cafe, Catering, Food truck, Small business owners. Age 24-55.

### Pharmacy and medical store

Files: `pharmacy/`.

- Roman Urdu: Expiry wali dawai shelf pe reh gayi? Nafaa har batch ki expiry yaad rakhta hai, kam stock pe alert deta hai aur bill foran banata hai. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.
- English: Expired stock still on the shelf? Nafaa tracks every batch and its expiry, warns you before stock runs out, and makes the bill in seconds. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.
- Urdu: ایکسپائری والی دوا شیلف پر رہ گئی؟ نفع ہر بیچ کی ایکسپائری یاد رکھتا ہے، کم اسٹاک پر الرٹ دیتا ہے اور بل فوراً بناتا ہے۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔

**Headlines:** Expiry se pehle alert, har dawai ka · Medical store ka pura hisaab · 7 din free trial, aaj shuru karein
**Descriptions:** Rs 1,500/mahina se · Batch aur expiry record · Setup me madad free
**Interests:** Pharmacy, Pharmacist, Pharmaceutical industry, Drug store, Medical store, Healthcare, Small business owners. Age 25-55.
**Policy note:** the ad promotes software for pharmacies, not medicines. Keep it that way: no medicine names in the copy, no health claims. If Meta flags it as a pharmacy ad, request a review and explain that it is point-of-sale software for shop owners.

### Bakery and sweets

Files: `bakery/`.

- Roman Urdu: Cake ka order register me gum, advance kitna liya yaad nahi? Nafaa me cake orders delivery date ke saath, advance ka record, aur counter ki har sale ka hisaab. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.
- English: Lost a cake order or forgot the advance? Nafaa keeps cake orders with delivery dates and advances, and every counter sale in one place. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.
- Urdu: کیک کا آرڈر رجسٹر میں گم اور ایڈوانس کتنا لیا یاد نہیں؟ نفع میں کیک آرڈرز ڈیلیوری تاریخ کے ساتھ، ایڈوانس کا ریکارڈ، اور کاؤنٹر کی ہر سیل کا حساب۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔

**Headlines:** Cake orders aur roz ka hisaab · Bakery ka pura hisaab, ek app me · 7 din free trial, aaj shuru karein
**Descriptions:** Rs 1,500/mahina se · Advance aur delivery date · Setup me madad free
**Interests:** Bakery, Baking, Cake decorating, Pastry, Confectionery, Sweet shop, Dessert, Small business owners. Age 24-55.

### Mobile phone shop

Files: `mobile/`.

- Roman Urdu: Kaunsa set kis ko becha, IMEI copy me dhoondte hain? Nafaa har phone ka IMEI bill ke saath rakhta hai, accessories ka stock alag dikhata hai aur repair ka hisaab bhi. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.
- English: Searching a notebook for an IMEI? Nafaa saves every phone's IMEI with its bill, tracks accessories separately and keeps repair jobs in order. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.
- Urdu: کون سا سیٹ کس کو بیچا، IMEI کاپی میں ڈھونڈتے ہیں؟ نفع ہر فون کا IMEI بل کے ساتھ رکھتا ہے، ایکسیسریز کا اسٹاک الگ دکھاتا ہے اور ریپیئر کا حساب بھی۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔

**Headlines:** Har phone ka IMEI, har bill ka record · Mobile shop ka pura hisaab · 7 din free trial, aaj shuru karein
**Descriptions:** Rs 1,500/mahina se · IMEI, repair, accessories · Setup me madad free
**Interests:** Mobile phones, Smartphones, Mobile phone accessories, Mobile phone repair, Telecommunications, Electronics retail, Small business owners. Age 20-45.

### Wholesale and distribution

Files: `wholesale/`.

- Roman Urdu: Dukandaron ka udhaar laakhon me, recovery yaad se? Nafaa me har party ka khata, carton aur piece ka rate, aur aaj ki recovery, sab saaf. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.
- English: Lakhs owed by retailers and recovery tracked from memory? Nafaa keeps a ledger for every party, carton and piece rates, and today's recovery in one place. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.
- Urdu: دکانداروں کا ادھار لاکھوں میں اور ریکوری یاد سے؟ نفع میں ہر پارٹی کا کھاتہ، کارٹن اور پیس کا ریٹ، اور آج کی ریکوری، سب صاف۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔

**Headlines:** Har party ka khata, saaf · Wholesale ka hisaab, ek app me · 7 din free trial, aaj shuru karein
**Descriptions:** Rs 1,500/mahina se · Party khata aur recovery · Setup me madad free
**Interests:** Wholesale, Distribution (business), Supply chain, FMCG, Trade, Import/export, Small business owners, Business page admins. Age 25-55.

### E-commerce and online sellers

Files: `ecommerce/`.

- Roman Urdu: Orders website, WhatsApp aur dukaan me bikhre hue? Nafaa me website ke orders seedha POS me aate hain, stock ek hi rehta hai aur COD ka hisaab saaf. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.
- English: Orders scattered across your website, WhatsApp and the shop? With Nafaa, website orders land straight in your POS, stock stays in one place and every COD payment is tracked. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.
- Urdu: آرڈرز ویب سائٹ، واٹس ایپ اور دکان میں بکھرے ہوئے؟ نفع میں ویب سائٹ کے آرڈرز سیدھے POS میں آتے ہیں، اسٹاک ایک ہی رہتا ہے اور COD کا حساب صاف۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔

**Headlines:** Har online order, ek jagah · Website orders seedha POS me · 7 din free trial, aaj shuru karein
**Descriptions:** Rs 1,500/mahina se · Website, dukaan, ek stock · Setup me madad free
**Interests:** Online shopping, E-commerce, Online store, Shopify, WooCommerce, Dropshipping, Instagram shopping, Small business owners. Age 20-40.

### General: every business

Files: `general/` (Roman Urdu and Urdu images).

- Roman Urdu: Copy, calculator aur yaad-dasht se hisaab? Nafaa me bill, stock, khata aur roz ki report, sab ek app me, phone pe bhi. Har qisam ke business ke liye. 7 din free trial, phir Rs 1,500/mahina se. WhatsApp karein.
- English: Running your business from a notebook and a calculator? Nafaa puts billing, stock, khata and daily reports in one app, on your phone too. Built for every kind of shop. Free for 7 days, then from Rs 1,500 a month. Message us on WhatsApp.
- Urdu: کاپی، کیلکولیٹر اور یادداشت سے حساب؟ نفع میں بل، اسٹاک، کھاتہ اور روز کی رپورٹ، سب ایک ایپ میں، فون پر بھی۔ ہر قسم کے کاروبار کے لیے۔ 7 دن فری ٹرائل۔ واٹس ایپ کریں۔

**Headlines:** Dukaan ka pura hisaab, ek app me · Aapka business, aapke phone pe · 7 din free trial, card nahi chahiye · دکان کا پورا حساب، ایک ایپ میں
**Descriptions:** Rs 1,500/mahina se · Internet ke baghair bhi · Setup me madad free
**Interests:** Small business, Entrepreneurship, Small business owners, Business page admins, Retail, Point of sale. Age 22-55.

---

## 5. WhatsApp quick replies

Save these in WhatsApp Business (Business tools > Quick replies). Replace `[Naam]` before sending. Reply within 5 minutes during the day: speed matters more than any ad.

| Shortcut | Message |
| --- | --- |
| `/salam` | Assalam o alaikum! Nafaa me khush aamdeed. Aap ka business kis cheez ka hai (kiryana, garments, bakery, pharmacy...) aur kis sheher me hai? Main aap ko usi hisaab se dikhata hoon. |
| `/trial` | Yeh raha free trial ka link: app.nafaa.pk/register. 7 din bilkul free, koi card nahi chahiye. Sign up ke baad mujhe yahan "done" likh dein, main setup me madad karta hoon. |
| `/price` | Pehle 7 din free hain. Us ke baad plans Rs 1,500 mahina se shuru hote hain. Aap ki dukaan ke hisaab se sahi plan main bata deta hoon: kitne counter aur kitni branch hain? |
| `/demo` | Ji bilkul. Aap ko kab time theek lagta hai? 10-15 minute ki video call ya phone call pe main aap ki dukaan jaisa demo dikha deta hoon. |
| `/offline` | Ji, internet band ho tab bhi bill bante rehte hain. Internet wapas aate hi sab data khud sync ho jata hai. |
| `/phone` | Nafaa phone ke browser me bhi chalta hai aur computer ya laptop pe bhi. Ek hi account se dono jagah hisaab dekh sakte hain. |
| `/khata` | Har customer ka udhaar alag likha jata hai. Kis ne kitna dena hai aur kab se, ek nazar me dikhta hai, aur customer ko WhatsApp pe hisaab bhi bhej sakte hain. |
| `/printer` | Normal thermal printer (58mm ya 80mm) aur barcode scanner ke saath chalta hai. Aap ke paas jo printer hai us ka model bata dein, main check kar deta hoon. |
| `/data` | Purane products aur customers ki list Excel me ho to hum import karwa dete hain, dobara type nahi karna padta. |
| `/followup` | [Naam] sahab, Nafaa ka trial kaisa chal raha hai? Koi cheez samajh na aaye to yahan likh dein, main abhi madad kar deta hoon. |
| `/baad` | Shukriya! Hum abhi online nahi hain, subah 10 baje ke baad sab se pehle aap ko jawab denge. Tab tak free trial yahan se shuru kar sakte hain: app.nafaa.pk/register |

Before using `/printer` and `/data`, confirm with the team that the exact printer model and the Excel import are supported for that shop type.

---

## 6. Meta ad policy notes

- **No personal attributes.** Do not write copy that says or implies you know something about the person ("Aap ki dukaan ghaate me hai?", "Kya aap qarz me hain?"). Speak about the situation instead ("Udhaar register me?").
- **No misleading claims.** Do not claim "No. 1", "sab se sasta", user counts, awards, FBR approval or guaranteed profit. Everything in these ads is true today: 7-day trial, no card, plans from Rs 1,500, the features shown.
- **Screens are demo data.** All shop names say "Demo", phone numbers are 0300000xxxx placeholders, and customer names are made up. No real shop's data appears.
- **WhatsApp name and logo.** Writing "WhatsApp karein" is fine for click-to-WhatsApp ads. The images use a generic chat icon, not the WhatsApp logo; keep it that way.
- **Buttons drawn in the image.** The "7 din free trial" and "WhatsApp karein" pills are a clear offer, not fake controls. If an ad is ever rejected for "non-existent functionality", appeal first; if it is upheld, use the carousel or the 1.91:1 image for that placement.
- **Text in images.** Meta no longer has a 20% rule, but less text gets cheaper delivery. These images keep to one headline, one short line and the CTA.
- **Pharmacy:** see the note in the pharmacy section. No medicine names or health claims in copy.
- **Special ad category:** none applies (not credit, jobs, housing or politics). "Khata" and "udhaar" refer to the shop's own customer accounts, not a loan product; do not describe Nafaa as lending or finance.
- **Landing experience:** the WhatsApp number must answer. Ads that lead to an unanswered number get poor feedback scores and higher costs.

---

## 7. Launch checklist

1. WhatsApp Business number connected to the Facebook Page and Instagram account; greeting message set to `/salam`.
2. Quick replies saved.
3. Campaign: Engagement (or Leads) > Messaging apps > WhatsApp. Advantage+ audience, Pakistan, age per industry.
4. One ad set per industry. In each, ads a, b and c with placement customisation (4:5 Feeds, 9:16 Stories/Reels, 1.91:1 right column).
5. Primary text: Roman Urdu first. Add English and Urdu as text options only in week 4.
6. Advantage+ creative enhancements off (no auto text, no auto crop, no music).
7. Lead sheet ready; name every ad exactly as its file name.
