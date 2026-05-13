# 📦 Nafaa App — Complete Upload Guide

**For:** Khubaib Bhai
**From:** Abubakar Malik
**App:** Nafaa — Pakistan's POS for Shopkeepers
**Version:** 1.0.0
**Date:** May 12, 2026

---

## 📞 Contact for Issues
- **WhatsApp:** [Your Number]
- **Email:** abubakarmalikpersonal@gmail.com
- **Telegram:** [Your Username]

---

## ✅ Quick Summary

Aap ko sirf **2 kaam** karne hain:

1. **Android:** Play Store pe `nafaa-v1.0.0.aab` upload karna
2. **iOS:** App Store Connect pe `nafaa-v1.0.0.ipa` upload karna (jab build ho jaye)

Saari text content (description, keywords, etc.) `docs/` folder mein ready hai — bas copy-paste karna hai.

---

## 🤖 ANDROID — Play Store Upload Guide

### Pre-Requirements
- ✅ Google Play Console account ($25 one-time payment ho chuki hai)
- ✅ AAB file: `deployment-package/android/nafaa-v1.0.0.aab`
- ✅ All screenshots in `screenshots/android/`
- ✅ Marketing assets in `marketing/`

### Step-by-Step Upload Process

#### 1️⃣ Login to Play Console
URL: https://play.google.com/console


#### 2️⃣ Create New App
Click **"Create app"** button (top right) and fill:

| Field | Value |
|---|---|
| App name | **Nafaa** |
| Default language | **English (United States) – en-US** |
| App or game | **App** |
| Free or paid | **Free** |

✅ Check both declaration boxes → Click **"Create app"**

#### 3️⃣ Complete Dashboard Setup (Left Sidebar)

**A. App access**
- Select: "All functionality available without restrictions"
- Save

**B. Ads**
- Select: "No, my app does not contain ads"
- Save

**C. Content rating**
- Click "Start questionnaire"
- Email: `support@nafaa.pk`
- Category: **Business / Productivity**
- Answer all questions: **No** (no violence, no sexual content, no gambling, no controlled substances)
- Submit

**D. Target audience**
- Age groups: Check only **"18+"**
- Save

**E. News apps**
- Select: "My app is not a news app"
- Save

**F. COVID-19 contact tracing**
- Select: "My app is not a publicly available COVID-19 contact tracing or status app"
- Save

**G. Data safety**
- Open file: `docs/data-safety-form.md`
- Copy answers exactly as written
- Save and submit

**H. Government app**
- Select: "My app is not a government app"
- Save

**I. Financial features**
- Select: "My app does not provide any financial features"
- Save (Note: Nafaa is a POS tool, not a banking app)

**J. Health**
- Select: "My app does not provide health features"
- Save

#### 4️⃣ Main Store Listing

Left sidebar: **Grow → Store presence → Main store listing**

Open file: `docs/store-listing-android.md` and copy-paste:

| Section | Source |
|---|---|
| App name | Already filled: **Nafaa** |
| Short description (80 chars) | From `store-listing-android.md` |
| Full description (4000 chars) | From `store-listing-android.md` |
| App icon | Upload from: `marketing/app-icon-512x512.png` |
| Feature graphic | Upload from: `marketing/feature-graphic-1024x500.png` |
| Phone screenshots | Upload all 8 from: `screenshots/android/` |
| Video (optional) | Skip for v1.0.0 |
| App category | **Business** |
| Tags | Productivity, Tools, Business |
| Email | `support@nafaa.pk` |
| Phone | `[Optional - leave blank]` |
| Website | `https://nafaa.pk` |
| Privacy Policy | `https://nafaa.pk/privacy` |

Click **Save**

#### 5️⃣ Production Release

Left sidebar: **Release → Production → Create new release**

1. **App signing:** Click "Continue" (Google Play App Signing — default, recommended)

2. **App bundle:** Click **"Upload"** → Select `nafaa-v1.0.0.aab`
   - Wait for upload + processing (~2-5 min)
   - If error: contact Abubakar

3. **Release details:**
   - **Release name:** `1.0.0`
   - **Release notes (English – en-US):** Copy from `docs/release-notes-v1.0.0.md`

4. **Click "Next"** → Review release

5. **Click "Start rollout to production"** → Confirm

#### 6️⃣ Wait for Review
- **Typical review time:** 1-3 days
- **Email notification:** Aap ko aur Khubaib bhai dono ko email aayega
- **If rejected:** Read reason carefully, WhatsApp Abubakar

#### 7️⃣ After Approval
- App goes live on Play Store automatically
- Public URL will be: `https://play.google.com/store/apps/details?id=pk.nafaa.app`
- Share kar sakte hain anyone se

---

## 🍎 iOS — App Store Upload Guide

### Pre-Requirements
- ✅ Apple Developer Account ($99/year) — Mentor ka use ho raha hai
- ✅ IPA file: `deployment-package/ios/nafaa-v1.0.0.ipa` (will be added when build is ready)
- ✅ All screenshots in `screenshots/ios/`
- ✅ Mac with Transporter app installed (free from Mac App Store)

### Step-by-Step Upload Process

#### 1️⃣ Login to App Store Connect
URL: https://appstoreconnect.apple.com


#### 2️⃣ Create New App

Click **"My Apps"** → **"+"** (top left) → **"New App"**

Fill in:

| Field | Value |
|---|---|
| Platforms | ✅ iOS |
| Name | **Nafaa** |
| Primary language | **English (U.S.)** |
| Bundle ID | Select from dropdown: **pk.nafaa.app** |
| SKU | **NAFAA001** |
| User Access | **Full Access** |

Click **"Create"**

#### 3️⃣ Upload IPA via Transporter

1. Open **Transporter** app (download free from Mac App Store if not installed)
2. Sign in with Apple ID
3. Drag `deployment-package/ios/nafaa-v1.0.0.ipa` into Transporter window
4. Click **"Deliver"** (top right)
5. Wait for upload + Apple processing (~10-30 min)
6. Status: ✅ "Delivered" — IPA Apple ke saath hai

#### 4️⃣ Configure App Information

Back in App Store Connect → My Apps → **Nafaa** → **App Information** (left sidebar)

| Field | Value |
|---|---|
| Subtitle | `POS for Pakistani Shopkeepers` |
| Category - Primary | **Business** |
| Category - Secondary | **Productivity** |
| Content Rights | Check: "Does not contain third-party content" |
| Age Rating | Click "Edit" → Answer all "No" → Set rating: **4+** |

Save

#### 5️⃣ Pricing and Availability

Left sidebar: **Pricing and Availability**

| Field | Value |
|---|---|
| Price | **Free** |
| Availability | Select: **All countries and regions** (or just Pakistan if preferred) |

Save

#### 6️⃣ App Privacy

Left sidebar: **App Privacy**

- Privacy Policy URL: `https://nafaa.pk/privacy`
- Click **"Get Started"** for Data collection questionnaire
- Open file: `docs/ios-data-privacy.md` and answer exactly as written
- Save

#### 7️⃣ Prepare iOS Version Submission

Left sidebar: Click **"1.0 Prepare for Submission"**

**Screenshots** (REQUIRED — upload from `screenshots/ios/`):

| Device Size | Resolution | Source Folder |
|---|---|---|
| 6.7" iPhone (Pro Max) | 1290 × 2796 | `screenshots/ios/6.7-inch/` |
| 6.5" iPhone (XS Max) | 1242 × 2688 | `screenshots/ios/6.5-inch/` |
| 5.5" iPhone (8 Plus) | 1242 × 2208 | `screenshots/ios/5.5-inch/` |

Upload minimum 3 screenshots per size (we have 5-8 in each folder).

**Description & Keywords:**
Open `docs/store-listing-ios.md` and copy:
- Description (4000 chars max)
- Keywords (100 chars total, comma-separated)
- Promotional Text (170 chars)
- Support URL: `https://nafaa.pk/support`
- Marketing URL: `https://nafaa.pk`

**Build:**
- Scroll to "Build" section
- Click "Select a build before you submit your app"
- Select the build uploaded via Transporter (1.0.0 - Build 1)

**App Review Information:**
- Open `docs/demo-credentials.md`
- Copy demo email + password
- First name: Abubakar
- Last name: Malik
- Phone: [Your number]
- Email: abubakarmalikpersonal@gmail.com
- Notes: Copy from `docs/demo-credentials.md`

**Version Release:**
- Select: "Automatically release this version"

Save → Click **"Add for Review"** → **"Submit for Review"**

#### 8️⃣ Wait for Apple Review
- **Typical review time:** 24-48 hours (sometimes up to 7 days)
- **Email notifications:** Will be sent for every status change
- **If rejected:** Read message, fix issue, resubmit (we'll handle this together)

#### 9️⃣ After Approval
- App goes live on App Store automatically
- Public URL: `https://apps.apple.com/pk/app/nafaa/id[APP-ID]`
- Searchable as "Nafaa" on App Store

---

## 🆘 Troubleshooting

### Android Issues

| Problem | Solution |
|---|---|
| AAB upload fails | Check file size (~40 MB expected). Try Chrome browser. |
| "Version code already used" | Should not happen for v1.0.0. WhatsApp Abubakar. |
| App icon rejected | Re-export from `marketing/app-icon-512x512.png` |
| Screenshot too small | Each must be min 320 × 320 px |
| Content rating timeout | Just answer everything "No" and submit again |

### iOS Issues

| Problem | Solution |
|---|---|
| Transporter "Invalid binary" | IPA needs to be re-built. WhatsApp Abubakar. |
| Bundle ID not in dropdown | Mentor ke account mein `pk.nafaa.app` register karna hoga first |
| Screenshot wrong dimensions | Use exactly the size mentioned (resize if needed) |
| Demo account rejected | Apple wants real test access — use credentials from `demo-credentials.md` |
| Privacy details incomplete | Re-do "App Privacy" section, save again |

### General

- **WhatsApp Abubakar:** For any technical issue
- **Don't change** any setting that isn't in this guide
- **Don't delete** the app from console if rejected — just fix and resubmit

---

## 📁 Complete Package Contents
deployment-package/ ├── 📄 UPLOAD-INSTRUCTIONS-FOR-KHUBAIB.md ← This file (read first) │ ├── 📁 android/ │ └── nafaa-v1.0.0.aab ← Upload to Play Store │ ├── 📁 ios/ │ └── nafaa-v1.0.0.ipa ← Upload to App Store (when ready) │ ├── 📁 screenshots/ │ ├── android/ ← 8 screenshots for Play Store │ │ ├── 01-dashboard.png │ │ ├── 02-pos-sale.png │ │ ├── 03-products.png │ │ ├── 04-customers-khata.png │ │ ├── 05-reports.png │ │ ├── 06-dark-mode.png │ │ ├── 07-urdu-language.png │ │ └── 08-settings.png │ └── ios/ │ ├── 6.7-inch/ ← For iPhone Pro Max │ ├── 6.5-inch/ ← For iPhone XS Max │ └── 5.5-inch/ ← For iPhone 8 Plus │ ├── 📁 marketing/ │ ├── app-icon-512x512.png ← Play Store app icon │ ├── app-icon-1024x1024.png ← App Store app icon │ ├── feature-graphic-1024x500.png ← Play Store header banner │ └── promotional-video.mp4 ← Optional, can skip │ └── 📁 docs/ ├── store-listing-android.md ← Copy-paste text for Play Store ├── store-listing-ios.md ← Copy-paste text for App Store ├── data-safety-form.md ← Play Console answers ├── ios-data-privacy.md ← App Store privacy answers ├── release-notes-v1.0.0.md ← What's new in this version └── demo-credentials.md ← Test account for app review

---

## ✅ Final Checklist Before Upload

Before clicking "Submit", make sure:

**Android:**
- [ ] AAB file uploaded successfully
- [ ] All 8 screenshots uploaded
- [ ] Feature graphic uploaded
- [ ] App icon visible
- [ ] Description has no typos
- [ ] Privacy policy URL works: https://nafaa.pk/privacy
- [ ] Content rating completed
- [ ] Data safety form filled
- [ ] Release notes added

**iOS:**
- [ ] IPA uploaded via Transporter (status: Delivered)
- [ ] All 3 screenshot sizes uploaded (min 3 each)
- [ ] Description and keywords filled
- [ ] App Privacy section complete
- [ ] Demo credentials added
- [ ] Build selected from dropdown
- [ ] Privacy URL works
- [ ] Age rating set to 4+

---

🎉 **Mubarak ho!** Aap ne professionally Nafaa launch kar diya hai. Ab bas review wait karein aur production updates ke liye Abubakar se coordinate karein.

