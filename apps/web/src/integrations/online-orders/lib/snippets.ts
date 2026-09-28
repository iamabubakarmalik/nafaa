/**
 * Developer ke liye tayyar code — copy karo aur website ke checkout ke
 * baad chala do. Key server par rehti hai (browser me nahi), is liye
 * har misaal server-side hai.
 */

export const SAMPLE_ORDER = {
  orderId: '1042',
  orderNumber: '1042',
  customer: {
    name: 'Ahmed Khan',
    phone: '03001234567',
    email: 'ahmed@example.com',
    address: 'House 12, Street 4, DHA Phase 5',
    city: 'Lahore',
  },
  items: [
    { sku: 'TSHIRT-BLK-M', name: 'Black T-Shirt', variant: 'M', quantity: 2, price: 1500 },
    { sku: 'CAP-01', name: 'Cap', quantity: 1, price: 800 },
  ],
  deliveryFee: 200,
  discount: 0,
  total: 4000,
  paymentMethod: 'cod',
  paymentStatus: 'pending',
  notes: 'Shaam 5 baje ke baad',
};

export function snippets(ordersUrl: string, apiKey: string, secret: string) {
  const json = JSON.stringify(SAMPLE_ORDER, null, 2);

  const php = `<?php
// Order save hone ke baad chalayein (checkout success)
$payload = json_encode([
  'orderId'   => $order->id,
  'orderNumber' => $order->number,
  'customer'  => [
    'name'    => $order->customer_name,
    'phone'   => $order->phone,
    'address' => $order->address,
    'city'    => $order->city,
  ],
  'items' => array_map(fn($i) => [
    'sku' => $i->sku, 'name' => $i->name,
    'quantity' => $i->qty, 'price' => $i->price,
  ], $order->items),
  'deliveryFee'   => $order->shipping,
  'discount'      => $order->discount,
  'total'         => $order->total,
  'paymentMethod' => $order->payment_method, // cod | card | jazzcash ...
]);

$ch = curl_init('${ordersUrl}');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 10,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'X-Nafaa-Key: ${apiKey}',
    'X-Nafaa-Signature: sha256=' . hash_hmac('sha256', $payload, '${secret}'),
  ],
]);
$response = curl_exec($ch);
curl_close($ch);`;

  const node = `// Node.js 18+ (Express, Next.js API route, etc.)
import crypto from 'crypto';

export async function sendToNafaa(order) {
  const body = JSON.stringify({
    orderId: order.id,
    orderNumber: order.number,
    customer: { name: order.name, phone: order.phone, address: order.address, city: order.city },
    items: order.items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.qty, price: i.price })),
    deliveryFee: order.shipping,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.paymentMethod, // 'cod' | 'card' | 'jazzcash' ...
  });

  const signature = 'sha256=' + crypto.createHmac('sha256', process.env.NAFAA_SECRET).update(body).digest('hex');

  const res = await fetch('${ordersUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nafaa-Key': process.env.NAFAA_KEY,   // ${apiKey.slice(0, 10)}…
      'X-Nafaa-Signature': signature,
    },
    body,
  });
  return res.json(); // { success: true, nafaaOrderId: '...' }
}`;

  const python = `# Python (Django / Flask)
import hmac, hashlib, json, requests

def send_to_nafaa(order):
    body = json.dumps({
        "orderId": str(order.id),
        "customer": {"name": order.name, "phone": order.phone,
                     "address": order.address, "city": order.city},
        "items": [{"sku": i.sku, "name": i.name, "quantity": i.qty, "price": float(i.price)}
                  for i in order.items],
        "deliveryFee": float(order.shipping),
        "total": float(order.total),
        "paymentMethod": order.payment_method,
    })
    sig = "sha256=" + hmac.new(b"${secret}", body.encode(), hashlib.sha256).hexdigest()
    return requests.post("${ordersUrl}", data=body, timeout=10, headers={
        "Content-Type": "application/json",
        "X-Nafaa-Key": "${apiKey}",
        "X-Nafaa-Signature": sig,
    }).json()`;

  const curl = `curl -X POST '${ordersUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Nafaa-Key: ${apiKey}' \\
  -d '${JSON.stringify(SAMPLE_ORDER)}'`;

  return { json, php, node, python, curl };
}

/** WhatsApp/email par developer ko bhejne wali mukammal guide */
export function developerGuide(urls: { orders: string; base: string; products: string; stock: string }, apiKey: string, secret: string, shopName: string) {
  return `*${shopName} — Nafaa POS se website jodne ki guide*

Jab bhi website par order ho, ye request bhejein (server se, browser se nahi):

POST ${urls.orders}
Header  X-Nafaa-Key: ${apiKey}
Header  Content-Type: application/json
(Optional) X-Nafaa-Signature: sha256=HMAC_SHA256(body, "${secret}")

Body (JSON):
${JSON.stringify(SAMPLE_ORDER, null, 2)}

Zaroori: orderId, customer.name, items[] (name, quantity, price). SKU bhejein to product khud match ho jata hai.

Aur APIs (same header):
• GET  ${urls.products}?page=1&limit=100 — Nafaa ke products + stock
• GET  ${urls.stock}?skus=SKU1,SKU2 — sirf stock
• POST ${urls.base}/orders/{orderId}/status — {"status":"cancelled"} ya {"paymentStatus":"paid"}
• POST ${urls.products} — {"products":[{name,sku,price,stock,category,images}]} website ke products Nafaa me
• GET  ${urls.base}/verify — key check

Nafaa status badalne par aap ke URL par POST bhej sakta hai (settings me "Status URL").`;
}
