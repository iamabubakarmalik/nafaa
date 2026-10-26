/** Help articles: getting-started (/help/getting-started/...). */
import { helpShot, note, tip, warn, type HelpArticle } from '../_help';

const articles: HelpArticle[] = [
  {
    slug: 'create-account',
    title: 'How to create your Nafaa account',
    summary:
      'Sign up for Nafaa in two short parts: name your business and pick its type, then add your name, email and password. Verify the email with a 6-digit code and the 7-day free trial starts, with no card needed.',
    seoDescription: 'Create a Nafaa account step by step: business name and type, owner login, email code and the 7-day free trial. No card needed to start.',
    focusKeyword: 'nafaa sign up',
    intro: [
      'Your Nafaa account holds the business, its branches, products, customers and staff. The person who signs up becomes the owner (**Malik** in the app) and can do everything; staff get their own logins later.',
      '',
      'Sign-up has two parts on one page and takes a couple of minutes. The trial runs for 7 days and the sign-up page itself says no card is needed. You can also sign up with Google, in which case Nafaa only asks for the shop name after Google.',
    ].join('\n'),
    steps: {
      heading: 'Create the account',
      items: [
        ['Open the sign-up page', 'Click **Start free trial** on this site. The page opens with the heading **Apni dukaan banayein** (create your shop).'],
        ['Name your business', 'Type it in **Dukaan / business ka naam**. This name prints on bills and receipts, and you can change it later in Settings.'],
        ['Pick your business type', 'Under **Aap ka kaam kya hai?** (what is your business?) choose the closest match, or search for it. Nafaa uses it to switch on the screens your trade needs, such as batches for a pharmacy or tables for a restaurant.'],
        ['Continue', 'Click **Aage barhein** (continue).'],
        ['Add the owner login', 'Fill in **Aap ka naam**, **Email** and **Password** (at least 8 characters). **Mobile** is optional. If someone gave you a referral code, click **Referral code hai?** and enter it.'],
        ['Create the account', 'Click **Account banayein**. Nafaa sends a 6-digit code to your email.'],
        ['Verify your email', 'Type or paste the code on the **Email verify karein** screen and click **Verify karein**. The code is valid for 10 minutes. You can also click **Baad me verify karunga** and verify later.'],
      ],
    },
    more: [
      helpShot('create-account', 'The first part of sign-up: business name and business type.', {
        callouts: [
          { x: 72, y: 33, label: 'Business name, printed on bills' },
          { x: 72, y: 51, label: 'Pick the closest business type' },
          { x: 72, y: 67, label: 'Continue to the owner login' },
          { x: 72, y: 77, label: 'Or sign up with Google' },
        ],
      }),
      tip('The email you use here is the owner login. Use one you check often, because the verification code and password reset links go to it.'),
      note('After sign-up Nafaa opens a short setup with five steps. Only the first one is required. See [how to set up your shop](/help/getting-started/set-up-your-shop).'),
    ],
    faqs: [
      ['Do I need a card to start the trial?', 'No. The sign-up page states that the 7-day trial needs no card. You choose a plan in **Plan & billing** when you want to continue.'],
      ['I did not get the email code. What now?', 'Check the spam folder first. On the verify screen, click **naya code mangwaein** to send a new one once the short countdown ends.'],
      ['Can I change the business type later?', 'Yes. Open **Settings → Business type**. The same page turns individual features on or off.'],
    ],
    terms: ['cloud-pos', 'pos'],
    related: ['PRODUCT:pos', 'PAGE:set-up-your-shop', 'PAGE:add-staff-and-roles', 'PAGE:devices-and-login', 'PAGE:pricing'],
    evidence: [
      'apps/web/src/modules/auth/pages/RegisterPage.tsx',
      'apps/web/src/modules/auth/components/IndustryPicker.tsx',
      'apps/web/src/modules/auth/pages/EmailVerifyPage.tsx',
    ],
  },
  {
    slug: 'set-up-your-shop',
    title: 'How to set up your shop after sign-up',
    summary:
      'Finish the five-step shop setup: business details, first branch, first products, bill and payment settings, and staff. Only the first step is required. Everything else can be skipped and filled in later from Settings, where shop details save by themselves.',
    seoDescription: 'Set up your shop in Nafaa: business details, branch address and hours, first products, receipt size, payment methods and staff logins.',
    focusKeyword: 'nafaa shop setup',
    intro: [
      'Right after sign-up Nafaa opens **Dukaan setup**, a short wizard with five steps. The first step (your business) is needed to set the app up. The others have an **Abhi nahi** (not now) button, so you can skip them and come back later.',
      '',
      'Whatever you skip stays available in **Settings**. The setup also resumes where you stopped, on any device, the next time you open it.',
    ].join('\n'),
    steps: {
      heading: 'Finish the shop setup',
      items: [
        ['Aap ka business', 'Confirm what you sell, choose how big the business is (**Chhota kaam**, **Ek dukaan**, **Barhi dukaan** or **Kai branches**), add the **Shahar** (city) and, if you like, a WhatsApp number.'],
        ['Pehli branch', 'Your first branch already exists. Add the **Pata** (address) and **Ilaqa** (area), opening and closing time and working days. The address prints on bills. The NTN field is optional.'],
        ['Pehle products', 'Choose **Misaal wale products** (sample products), **Khud likhein** (type a few with name, price and stock) or **Excel / CSV file se**. Only name and price are required. Tap the categories you want.'],
        ['Bill aur payment', 'Pick the receipt size: **Chhoti parchi (58mm)**, **Bari parchi (80mm)**, **A4 saada** or **A4 logo ke saath**. Select the payment methods you accept, set tax if you charge it, and choose when to warn about low stock.'],
        ['Staff bulayein', 'Add a cashier or manager with their own login now, or skip and do it later from the Staff page.'],
        ['Open the shop', 'Click **Save karke aage** on each step (or press Ctrl + Enter). On the last screen check the summary and click **Dukaan kholein**.'],
      ],
    },
    more: [
      helpShot('set-up-your-shop', 'Settings → Business info → Store details: logo, store name, contact and address. A preview shows how the top of the bill will look.', {
        callouts: [
          { x: 34, y: 31, label: 'Upload the logo' },
          { x: 34, y: 59, label: 'Store name printed on bills' },
          { x: 87, y: 29, label: 'Live bill preview' },
        ],
      }),
      note('To leave the setup early, click **Baad me karunga** at the top. Nafaa takes you to the dashboard and keeps your progress.', 'Short on time?'),
      tip('Store details save automatically. Watch for **Sab save hai** (all saved) at the top of the settings page. New details apply to new bills only; old bills stay as they were printed.'),
    ],
    faqs: [
      ['Where do I change the shop name, logo or address later?', 'Open **Settings → Business info → Store details**. The logo, **Store ka naam**, phone, WhatsApp number and address there print on every new bill.'],
      ['I chose the wrong receipt size. Can I change it?', 'Yes. Open **Settings → Counter & POS → Receipt** to change the paper size and design. See [receipts and printers](/help/pos-counter/receipts-and-printers).'],
    ],
    terms: ['receipt', 'thermal-printer', 'opening-stock'],
    related: ['PRODUCT:pos', 'PAGE:create-account', 'PAGE:add-a-product', 'PAGE:bulk-import-products', 'PAGE:receipts-and-printers'],
    evidence: [
      'apps/web/src/modules/onboarding/constants/wizard-steps.ts',
      'apps/web/src/modules/onboarding/pages/OnboardingPage.tsx',
      'apps/web/src/modules/onboarding/steps/BusinessStep.tsx',
      'apps/web/src/modules/onboarding/steps/BranchStep.tsx',
      'apps/web/src/modules/onboarding/steps/ProductsStep.tsx',
      'apps/web/src/modules/onboarding/steps/ReceiptStep.tsx',
      'apps/web/src/modules/organization/settings/sections/BusinessProfileSection.tsx',
    ],
  },
  {
    slug: 'add-staff-and-roles',
    title: 'How to add staff and give them a login',
    summary:
      'Add each person who works for you, then give a login to those who use the app. Pick a role (Manager, Cashier or Staff), lock the login to one branch if needed, adjust permissions, and print the login slip with the first password.',
    seoDescription: 'Add staff in Nafaa and give each person their own login: Manager, Cashier or Staff role, one branch or all, permissions and a printed login slip.',
    focusKeyword: 'add staff login pos',
    intro: [
      'Every person on the payroll can have a record in Nafaa, with or without a login. Helpers and drivers usually only need the record, for salary and attendance. Anyone who bills at the counter, receives stock or reads reports needs their own login, so each sale and change is recorded under their name.',
      '',
      'Only the owner can create logins. Open **Staff → All staff** in the sidebar (also under **Settings → Users → People**).',
    ].join('\n'),
    steps: {
      heading: 'Add a staff member with a login',
      items: [
        ['Start a new record', 'On the Staff page click **Naya banda** (new person), or press **N**.'],
        ['Fill in the basics', 'Enter **Poora naam** (full name) and **Phone**. Under **Kaam**, add the **Kaam (designation)**, for example Cashier, and the **Joining** date. Set the salary type and amount if you will run payroll in Nafaa.'],
        ['Turn on the login', 'In the **App ka login** card switch on **Is bande ko login dein** (give this person a login).'],
        ['Set email and password', 'Enter a **Login email** that belongs to this person only and a **Pehla password** of at least 8 characters. The refresh icon creates a password for you.'],
        ['Choose the role', 'Pick **Manager** (runs the branch: sales, stock, expenses, reports), **Cashier** (sales at the counter, cash drawer and customers) or **Staff** (stock work, no counter). The role fills in its default permissions.'],
        ['Pick the branch', 'Keep **Sab branches** (all branches) or choose one branch. A login locked to a branch only sees and sells in that branch.'],
        ['Check permissions and save', 'Open **Permissions** to add or remove single permissions, then click **Banda aur login banayein** (or Ctrl + Enter). Print the login slip that appears: the password is shown only once.'],
      ],
    },
    more: [
      helpShot('add-staff-and-roles', 'The new staff form: basic details on the left, and the switch that gives this person a login on the right.', {
        callouts: [
          { x: 40, y: 30, label: 'Full name and phone' },
          { x: 95, y: 29, label: 'Give a login' },
          { x: 93, y: 93, label: 'Save' },
        ],
      }),
      helpShot('add-staff-and-roles-2', 'Staff → Roles aur permission: what each role gets by default, permission by permission.', {
        callouts: [
          { x: 32, y: 39, label: 'Switch to the roles tab' },
          { x: 78, y: 69, label: 'Default permissions per role' },
        ],
      }),
      tip('Changing a role later does not change the permissions already given. To reset them to the new role, open the person\'s profile, go to the Permissions tab and click **role wali** (the role\'s defaults).'),
    ],
    faqs: [
      ['A staff member forgot the password. How do I reset it?', 'Open their profile from the Staff page and click **Naya password**. The old password stops working straight away and they are logged out of every device. Print the new slip or send it on WhatsApp.'],
      ['Can a cashier see my cost and profit?', 'Only if their permissions allow it. Setting an owner PIN in **Settings → Users → Security & PIN** also hides cost and profit from anyone who does not know the PIN.'],
      ['Do helpers need a login for attendance and salary?', 'No. Leave the login switched off. The record still works for attendance and payroll.'],
    ],
    terms: ['galla', 'void', 'refund'],
    related: ['PRODUCT:staff', 'PAGE:create-account', 'PAGE:devices-and-login', 'PAGE:returns-and-refund-pin', 'PAGE:multi-branch-setup'],
    evidence: [
      'apps/web/src/modules/hr/staff/pages/StaffPage.tsx',
      'apps/web/src/modules/hr/staff/pages/StaffFormPage.tsx',
      'apps/web/src/modules/hr/staff/components/LoginFields.tsx',
      'apps/web/src/modules/hr/staff/components/meta.ts',
      'apps/web/src/modules/hr/staff/components/ProfileModals.tsx',
      'apps/web/src/modules/hr/staff/pages/StaffProfilePage.tsx',
    ],
  },
  {
    slug: 'devices-and-login',
    title: 'Devices, login and counter hardware',
    summary:
      'Nafaa runs in the browser on a computer, tablet or phone. Learn how to log in and keep a device remembered, connect a receipt printer, cash drawer, barcode scanner, scale or customer screen on each counter, and log out a lost device.',
    seoDescription: 'Use Nafaa on a computer, tablet or phone: login, remembered devices, receipt printer, cash drawer, barcode scanner, scale and logging out a device.',
    focusKeyword: 'pos devices printer scanner',
    intro: [
      'Nafaa opens in a web browser, so the counter can be a laptop, a desktop PC, a tablet or an Android phone. Each person logs in with their own email and password, and the same account works on every device at once.',
      '',
      'Counter hardware is set per device. A printer or scale connected on the front counter does not affect the back office laptop, because these settings are stored in that browser.',
    ].join('\n'),
    steps: {
      heading: 'Log in and set up a counter',
      items: [
        ['Log in', 'Enter your **Email** and password on the login screen. If you forgot the password, click **Password bhool gaye?** to get a reset link.'],
        ['Remember the counter device', 'Tick **Is device ko yaad rakhein** (remember this device) on your own counter. Next time the email is filled in, and you can log in even when the internet is down. Leave it off on a shared computer.'],
        ['Open the hardware page', 'Go to **Settings → Counter & POS → POS hardware**. Cards at the top show the state of the printer, cash drawer, barcode scanner, **Tarazu** (scale) and customer screen.'],
        ['Connect the receipt printer', 'Keep **Browser print** to print through the normal print window, or choose **Direct (tez)** to print without a dialog over USB, Serial or Bluetooth. Click **Test bill** to check the paper width.'],
        ['Check the scanner and drawer', 'A USB or wireless barcode scanner works like a keyboard with no setup; scan into the test box to confirm. The cash drawer plugs into the printer and opens when the printer is set to Direct.'],
        ['Use Chrome or Edge for direct hardware', 'Direct printing and the scale need Google Chrome or Microsoft Edge on the computer. Other browsers keep using browser print and the scanner as normal.'],
      ],
    },
    more: [
      helpShot('devices-and-login', 'Settings → Counter & POS → POS hardware: printer, cash drawer, barcode scanner, scale and customer screen for this counter.', {
        callouts: [
          { x: 27, y: 22, label: 'Status of each device' },
          { x: 27, y: 41, label: 'Browser print or Direct' },
          { x: 82, y: 11, label: 'Print a test bill' },
        ],
      }),
      warn('If a phone or laptop with your login is lost, open **Settings → Users → Security & PIN** and use the logout button next to it under **Active devices**. It will need a fresh login.', 'Lost a device?'),
      tip('The customer display shows the bill on a second screen facing the customer, with your logo and the payment QR if you turn those on. Open it from the same hardware page with **Display kholein**.'),
    ],
    faqs: [
      ['Does Nafaa work on a phone?', 'Yes. It runs in the phone\'s browser. Small 58 mm Bluetooth printers can connect from the browser on Android when the printer is set to Direct.'],
      ['Why is my printer greyed out as USB or Serial?', 'That connection type is not supported by the browser you are using. Open Nafaa in Google Chrome or Microsoft Edge on the computer.'],
      ['How many devices can use one account?', 'Each staff member has their own login and can stay logged in on the devices they use. The **Active devices** list shows every device with a login.'],
    ],
    terms: ['thermal-printer', 'cash-drawer', 'barcode', 'customer-display', 'offline-pos'],
    related: ['PRODUCT:pos', 'PAGE:receipts-and-printers', 'PAGE:offline-billing', 'PAGE:add-staff-and-roles', 'PAGE:create-account'],
    evidence: [
      'apps/web/src/modules/auth/pages/LoginPage.tsx',
      'apps/web/src/core/hardware/HardwarePage.tsx',
      'apps/web/src/modules/organization/settings/sections/SecuritySection.tsx',
      'apps/web/src/app/shell/navigation/nav-config.ts',
    ],
    needsOwner: ['The Windows desktop app is not mentioned here: settings.ts O5 says the apps are not publicly downloadable yet. Add a step once it is.'],
  },
];

export default articles;
