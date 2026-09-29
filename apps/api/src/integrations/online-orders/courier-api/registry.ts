import { callCourierAdapter } from './callcourier.adapter';
import { leopardsAdapter } from './leopards.adapter';
import { mnpAdapter } from './mnp.adapter';
import { postexAdapter } from './postex.adapter';
import { tcsAdapter } from './tcs.adapter';
import { traxAdapter } from './trax.adapter';
import { CourierAdapter } from './types';

/** Connect form ka khana */
export interface CredentialField {
  key: string;
  label: string;
  placeholder?: string;
  /** Password jaisa chhupa hua */
  secret?: boolean;
  optional?: boolean;
  help?: string;
  /** Dropdown (jaise Live / Test) */
  options?: { value: string; label: string }[];
}

/** Courier settings ka khana — UI khud form banata hai */
export interface SettingField {
  key: string;
  label: string;
  help?: string;
  type: 'text' | 'number' | 'pickup' | 'origin-city' | 'service' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Iske bina booking nahi hoti */
  required?: boolean;
}

export interface CourierApiDef {
  adapter: CourierAdapter;
  credentials: CredentialField[];
  settings: SettingField[];
  /** Key kahan se milegi — dukandar ke liye qadam */
  portalUrl: string;
  steps: string[];
  /** none = label courier ke portal se */
  labelKind: 'pdf' | 'link' | 'none';
  features: { cancel: boolean; label: boolean; settlement: boolean };
  /** Dashboard par rang */
  color: string;
}

const TRAX_PRODUCT_TYPES = [
  { value: '1', label: 'Apparel' },
  { value: '2', label: 'Automotive Parts' },
  { value: '3', label: 'Accessories' },
  { value: '4', label: 'Personal Electronics (Mobile, Laptop)' },
  { value: '5', label: 'Electronics Accessories' },
  { value: '6', label: 'Gadgets' },
  { value: '7', label: 'Jewellery' },
  { value: '8', label: 'Cosmetics' },
  { value: '9', label: 'Stationery' },
  { value: '10', label: 'Handicrafts' },
  { value: '11', label: 'Home-made Items' },
  { value: '12', label: 'Footwear' },
  { value: '13', label: 'Watches' },
  { value: '14', label: 'Leather Items' },
  { value: '15', label: 'Organic and Health Products' },
  { value: '16', label: 'Appliances and Consumer Electronics' },
  { value: '17', label: 'Home Decor and Interior' },
  { value: '18', label: 'Toys' },
  { value: '19', label: 'Pet Supplies' },
  { value: '20', label: 'Athletics and Fitness' },
  { value: '21', label: 'Vouchers and Coupons' },
  { value: '22', label: 'Marketplace' },
  { value: '23', label: 'Documents and Letters' },
  { value: '24', label: 'Other' },
];

const COMMON_SETTINGS: SettingField[] = [
  { key: 'defaultWeightKg', label: 'Aam wazan (kg)', help: 'Har booking me pehle se bhara hoga', type: 'number', placeholder: '0.5' },
  { key: 'bookingNote', label: 'Har booking ka note', help: 'Jaise: Call karke aayein · Fragile', type: 'text' },
];

/**
 * Jin couriers ka API se "ek click" connect hai. Baqi couriers "manual" —
 * CN khud likho, tracking link Nafaa deta hai. Naya courier = adapter +
 * yahan ek entry; UI aur sync khud chal jate hain.
 */
export const COURIER_APIS: Record<string, CourierApiDef> = {
  POSTEX: {
    adapter: postexAdapter,
    credentials: [{ key: 'apiKey', label: 'API token', placeholder: 'PostEx portal se copy karein', secret: true }],
    settings: [
      { key: 'pickupAddressCode', label: 'Pickup address', help: 'PostEx rider parcel yahan se uthayega', type: 'pickup' },
      ...COMMON_SETTINGS,
    ],
    portalUrl: 'https://merchant.postex.pk',
    steps: [
      'PostEx merchant portal par login karein',
      'Settings me API / Integration wala hissa kholein (na mile to PostEx support se "API token" maangein)',
      'Token copy karke yahan paste karein — bas',
    ],
    labelKind: 'pdf',
    features: { cancel: true, label: true, settlement: true },
    color: '#f15a22',
  },
  LEOPARDS: {
    adapter: leopardsAdapter,
    credentials: [
      { key: 'apiKey', label: 'API key', placeholder: 'Leopards portal se', secret: true },
      { key: 'apiSecret', label: 'API password', placeholder: 'Leopards portal se', secret: true },
    ],
    settings: [
      { key: 'originCityId', label: 'Parcel kis shehar se jayega', help: 'Khali = Leopards account wala shehar', type: 'origin-city' },
      ...COMMON_SETTINGS,
    ],
    portalUrl: 'https://www.leopardscourier.com',
    steps: [
      'Leopards merchant portal par login karein',
      'API wala hissa kholein (na mile to Leopards account manager se "API key aur password" maangein)',
      'API key aur API password dono copy karke yahan paste karein',
    ],
    labelKind: 'link',
    features: { cancel: true, label: true, settlement: true },
    color: '#e11d48',
  },
  TRAX: {
    adapter: traxAdapter,
    credentials: [{ key: 'apiKey', label: 'API key', placeholder: 'Sonic portal → Profile → API key', secret: true }],
    settings: [
      { key: 'pickupAddressCode', label: 'Pickup address', help: 'Trax rider parcel yahan se uthayega', type: 'pickup', placeholder: 'Default wala' },
      { key: 'serviceType', label: 'Shipping mode', help: 'Rush = tez, Saver Plus = sasta', type: 'service', placeholder: 'Rush' },
      {
        key: 'chargesMode', label: 'Account ki qisam', help: 'Trax ne aap ka account kis tarah banaya', type: 'select', placeholder: 'Reimbursement (COD se charges kat-te hain)',
        options: [{ value: '4', label: 'Reimbursement (COD se charges kat-te hain)' }, { value: '3', label: 'Corporate invoicing (mahine ka bill)' }],
      },
      { key: 'productTypeId', label: 'Maal ki qisam', help: 'Trax ko batana hota hai parcel me kya hai', type: 'select', placeholder: 'Other', options: TRAX_PRODUCT_TYPES },
      ...COMMON_SETTINGS,
    ],
    portalUrl: 'https://sonic.pk',
    steps: [
      'sonic.pk par apne Trax account se login karein',
      'Upar Profile kholein — sab se neeche "API key" likhi hai',
      'Key copy karke yahan paste karein. (Pickup address pehle se portal par bana hona chahiye)',
    ],
    labelKind: 'pdf',
    features: { cancel: true, label: true, settlement: true },
    color: '#0f766e',
  },
  TCS: {
    adapter: tcsAdapter,
    credentials: [
      { key: 'apiKey', label: 'Client ID', placeholder: 'TCS se mila clientid', secret: true },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'TCS se mila clientsecret', secret: true },
      { key: 'username', label: 'Envio username', placeholder: 'envio.tcscourier.com wala' },
      { key: 'password', label: 'Envio password', secret: true },
      { key: 'accountNo', label: 'TCS account number', placeholder: 'Jaise 04011K1' },
      {
        key: 'environment', label: 'Kahan jorna hai', optional: true, help: 'TCS pehle Test (UAT) deta hai — pass hone par Live',
        options: [{ value: 'live', label: 'Live' }, { value: 'uat', label: 'Test (UAT)' }],
      },
    ],
    settings: [
      { key: 'pickupAddressCode', label: 'Cost center (pickup)', help: 'TCS rider parcel is cost center ke address se uthayega', type: 'pickup', placeholder: 'Pehla wala' },
      { key: 'serviceType', label: 'Service code', help: 'TCS account manager se pooch lein — aam taur par O (Overnight)', type: 'text', placeholder: 'O' },
      { key: 'shipperName', label: 'Label par bhejne wale ka naam', help: 'Khali = cost center ka naam', type: 'text' },
      ...COMMON_SETTINGS,
    ],
    portalUrl: 'https://envio.tcscourier.com',
    steps: [
      'TCS account manager se "OCI / Envio API access" maangein — woh Client ID, Client Secret, Envio username/password aur account number dete hain',
      'Pehle Test (UAT) keys milti hain — "Kahan jorna hai" me Test chunein aur ek booking karke dekhein',
      'TCS test pass karke Live keys deta hai (kam se kam 3 din) — phir Live chun kar dobara jorein',
    ],
    labelKind: 'pdf',
    features: { cancel: true, label: true, settlement: true },
    color: '#dc2626',
  },
  MNP: {
    adapter: mnpAdapter,
    credentials: [
      { key: 'apiKey', label: 'Username', placeholder: 'M&P se mila API username' },
      { key: 'password', label: 'Password', secret: true },
      { key: 'accountNo', label: 'Account number', placeholder: 'Jaise 4T154' },
      { key: 'returnLocation', label: 'Return location', optional: true, help: 'M&P ne diya ho to — warna pickup location hi' },
      { key: 'subAccountId', label: 'Sub account ID', optional: true, placeholder: '0' },
      { key: 'insertType', label: 'Insert type', optional: true, help: 'M&P ne bataya ho to (jaise 19)' },
    ],
    settings: [
      { key: 'pickupAddressCode', label: 'Pickup location', help: 'M&P parcel is location se uthayega', type: 'pickup', placeholder: 'Pehli wali' },
      { key: 'serviceType', label: 'Service', type: 'service', placeholder: 'Overnight' },
      ...COMMON_SETTINGS,
    ],
    portalUrl: 'https://www.mulphilog.com',
    steps: [
      'M&P account manager se "COD API access" maangein',
      'Woh username, password, account number (aur kabhi return location / insert type) dete hain',
      'Sab yahan daal kar jorein — pickup location Nafaa khud M&P se le aata hai',
    ],
    labelKind: 'none',
    features: { cancel: true, label: false, settlement: false },
    color: '#1d4ed8',
  },
  CALL_COURIER: {
    adapter: callCourierAdapter,
    credentials: [{ key: 'apiKey', label: 'Login ID', placeholder: 'Jaise LHE-1234 (KAM se)' }],
    settings: [
      { required: true, key: 'originCityId', label: 'Aap ka shehar', help: 'Parcel kis shehar se jayega', type: 'origin-city' },
      { required: true, key: 'pickupAddressCode', label: 'Aap ka area', help: 'Pehle shehar chunein, phir area', type: 'pickup' },
      { required: true, key: 'shipperName', label: 'Bhejne wale ka naam', type: 'text' },
      { required: true, key: 'shipperPhone', label: 'Bhejne wale ka phone', type: 'text', placeholder: '03xxxxxxxxx' },
      { required: true, key: 'shipperAddress', label: 'Pickup address', type: 'text' },
      { key: 'shipperEmail', label: 'Email', type: 'text' },
      ...COMMON_SETTINGS,
    ],
    portalUrl: 'https://callcourier.com.pk',
    steps: [
      'Call Courier ke KAM (account manager) se apna "Login ID" lein — jaise LHE-1234',
      'Yahan Login ID daal kar jorein',
      'Settings me apna shehar, area, naam, phone aur address bhar dein — label par yahi chhapta hai',
    ],
    labelKind: 'none',
    features: { cancel: false, label: false, settlement: false },
    color: '#ea580c',
  },
};

export const courierApi = (code?: string | null) => (code ? COURIER_APIS[code.toUpperCase()] : undefined);
