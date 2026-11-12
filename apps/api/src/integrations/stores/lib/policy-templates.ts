/**
 * Starting text for the store policies, in plain English (the storefront's
 * default language). {{placeholders}} are filled from the store when a
 * template is applied; the merchant edits the result freely.
 */
import { PolicyKind, POLICY_TITLES } from '../store-settings';

const TEMPLATES: Record<PolicyKind, string> = {
  refund: `<h2>Returns and exchanges</h2>
<p>We want you to be happy with your order. If something is not right, you can return or exchange it within <strong>{{return_days}} days</strong> of delivery.</p>
<h3>What can be returned</h3>
<ul><li>Items that are unused, unwashed and in their original packing with tags.</li><li>Items that arrived damaged, faulty or different from what you ordered.</li></ul>
<h3>What cannot be returned</h3>
<ul><li>Items used, washed or altered after delivery.</li><li>Personal care items once opened, and items marked "final sale".</li></ul>
<h3>How to return</h3>
<ol><li>Message us on WhatsApp at {{phone}} or email {{email}} with your order number and a photo of the item.</li><li>We confirm the return and share the pickup or drop-off details.</li><li>Once we receive and check the item, we send your exchange or refund.</li></ol>
<h3>Refunds</h3>
<p>Refunds are made to your bank account, JazzCash or Easypaisa within 7 working days after we receive the item. Delivery charges are not refunded unless the item was faulty or wrong.</p>`,
  privacy: `<h2>Privacy policy</h2>
<p>{{store_name}} respects your privacy. This policy explains what we collect when you shop with us and how we use it.</p>
<h3>What we collect</h3>
<ul><li>Your name, phone number, email and delivery address when you place an order.</li><li>Your order history, and basic visit data such as pages viewed and the device used.</li></ul>
<h3>How we use it</h3>
<ul><li>To deliver your order and keep you updated about it (by SMS, WhatsApp or email).</li><li>To answer your questions and handle returns.</li><li>To send offers, only if you agreed to receive them. You can stop them at any time.</li></ul>
<h3>Who we share it with</h3>
<p>Only with the courier company that delivers your order and the payment provider that processes your payment. We never sell your data.</p>
<h3>Contact</h3>
<p>For any privacy question, contact us at {{email}} or {{phone}}.</p>`,
  terms: `<h2>Terms of service</h2>
<p>By placing an order on {{store_name}}, you agree to these terms.</p>
<h3>Orders and prices</h3>
<ul><li>All prices are in Pakistani Rupees (PKR). We may change prices at any time, but your order keeps the price shown at checkout.</li><li>We may call or message you to confirm a cash on delivery order before sending it. Unconfirmed orders may be cancelled.</li><li>We may cancel an order if an item is out of stock or the price was shown wrongly; any payment made is refunded in full.</li></ul>
<h3>Delivery</h3>
<p>Delivery times are estimates. Please check the parcel at delivery and tell us within 48 hours if anything is wrong.</p>
<h3>Payments</h3>
<p>We accept cash on delivery and the online payment methods shown at checkout. For some orders we may ask for an advance payment before dispatch.</p>
<h3>Contact</h3>
<p>{{store_name}} · {{phone}} · {{email}}</p>`,
  shipping: `<h2>Shipping policy</h2>
<p>We deliver all over Pakistan through trusted courier companies.</p>
<ul><li><strong>Delivery time:</strong> usually {{delivery_eta}} after your order is confirmed.</li><li><strong>Delivery charges:</strong> shown at checkout before you place the order.{{free_shipping_line}}</li><li><strong>Cash on delivery:</strong> available in most cities. Please keep the exact amount ready.</li><li><strong>Tracking:</strong> once your parcel is sent, we share the tracking number by SMS or WhatsApp.</li></ul>
<p>If your parcel is late, contact us at {{phone}} and we will check with the courier.</p>`,
};

export interface PolicyFill { storeName: string; phone: string | null; email: string | null; returnDays?: number; deliveryEta?: string | null; freeShippingThreshold?: number | null }

export function policyTemplate(kind: PolicyKind, f: PolicyFill): { kind: PolicyKind; title: string; bodyHtml: string } {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const values: Record<string, string> = {
    store_name: esc(f.storeName),
    phone: esc(f.phone ?? 'our WhatsApp number'),
    email: esc(f.email ?? 'our email'),
    return_days: String(f.returnDays ?? 7),
    delivery_eta: esc(f.deliveryEta ?? '3-5 working days'),
    free_shipping_line: f.freeShippingThreshold ? ` Delivery is free on orders of Rs ${Math.round(f.freeShippingThreshold).toLocaleString('en-PK')} or more.` : '',
  };
  return { kind, title: POLICY_TITLES[kind], bodyHtml: TEMPLATES[kind].replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? '') };
}
