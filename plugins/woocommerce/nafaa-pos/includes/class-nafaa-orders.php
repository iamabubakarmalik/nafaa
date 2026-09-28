<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Orders: Website → Nafaa (naya order, cancel/refund, paisa aaya)
 *         Nafaa → Website (accept, raste me, deliver, cancel)
 *
 * Order checkout ke doran nahi bheja jata (customer ka waqt zaya na ho) —
 * Action Scheduler se foran background me jata hai, fail ho to 5 dafa
 * dobara koshish.
 */
class Nafaa_Orders
{
    const META_SENT = '_nafaa_sent';
    const META_TRIES = '_nafaa_tries';
    const MAX_TRIES = 5;

    /** Nafaa se aaya status lagate waqt wapas Nafaa ko na bhejein */
    private static $applying_from_nafaa = false;

    public static function init()
    {
        add_action('woocommerce_checkout_order_processed', [__CLASS__, 'queue'], 20, 1);
        add_action('woocommerce_store_api_checkout_order_processed', [__CLASS__, 'queue_obj'], 20, 1);
        add_action('woocommerce_thankyou', [__CLASS__, 'queue'], 20, 1);
        add_action('woocommerce_order_status_changed', [__CLASS__, 'on_status_changed'], 20, 3);
        add_action('nafaa_send_order', [__CLASS__, 'send'], 10, 1);
        add_action('rest_api_init', [__CLASS__, 'routes']);
    }

    public static function queue_obj($order)
    {
        if ($order instanceof WC_Order) {
            self::queue($order->get_id());
        }
    }

    public static function queue($order_id)
    {
        if (!$order_id || !Nafaa_Api::is_ready()) {
            return;
        }
        $order = wc_get_order($order_id);
        if (!$order || $order->get_meta(self::META_SENT)) {
            return;
        }
        // "pending" = online payment abhi nahi hui — us par bill/stock nahi.
        // Paisa aate hi order "processing" hota hai aur on_status_changed bhej deta hai.
        $allowed = (array) (Nafaa_Api::settings()['send_statuses'] ?? ['processing', 'on-hold']);
        if (!in_array($order->get_status(), $allowed, true)) {
            return;
        }
        if (function_exists('as_enqueue_async_action')) {
            if (!as_has_scheduled_action('nafaa_send_order', [$order_id], 'nafaa')) {
                as_enqueue_async_action('nafaa_send_order', [$order_id], 'nafaa');
            }
        } else {
            self::send($order_id);
        }
    }

    public static function send($order_id)
    {
        $order = wc_get_order($order_id);
        if (!$order || $order->get_meta(self::META_SENT)) {
            return;
        }
        if (in_array($order->get_status(), ['pending', 'failed', 'checkout-draft', 'trash', 'cancelled'], true)) {
            return;
        }

        $res = Nafaa_Api::request('POST', '/orders', self::payload($order));
        if ($res['ok']) {
            $order->update_meta_data(self::META_SENT, time());
            $order->save_meta_data();
            $order->add_order_note('✅ Nafaa POS me order chala gaya');
            Nafaa_Api::log(true, 'Order #' . $order->get_order_number() . ' Nafaa me bhej diya');
            return;
        }

        $tries = (int) $order->get_meta(self::META_TRIES) + 1;
        $order->update_meta_data(self::META_TRIES, $tries);
        $order->save_meta_data();
        Nafaa_Api::log(false, 'Order #' . $order->get_order_number() . ' nahi gaya (' . $res['error'] . ') — koshish ' . $tries);

        // Key ghalat ho (401) to dobara koshish bekaar hai
        if ($res['status'] !== 401 && $res['status'] !== 400 && $tries < self::MAX_TRIES && function_exists('as_schedule_single_action')) {
            as_schedule_single_action(time() + 120 * $tries, 'nafaa_send_order', [$order_id], 'nafaa');
        }
    }

    public static function payload(WC_Order $order)
    {
        $ship = $order->get_shipping_first_name() || $order->get_shipping_address_1();
        $first = $ship ? $order->get_shipping_first_name() : $order->get_billing_first_name();
        $last = $ship ? $order->get_shipping_last_name() : $order->get_billing_last_name();
        $addr = array_filter([
            $ship ? $order->get_shipping_address_1() : $order->get_billing_address_1(),
            $ship ? $order->get_shipping_address_2() : $order->get_billing_address_2(),
            $ship ? $order->get_shipping_state() : $order->get_billing_state(),
        ]);

        $items = [];
        foreach ($order->get_items() as $item) {
            /** @var WC_Order_Item_Product $item */
            $product = $item->get_product();
            $qty = max(1, (float) $item->get_quantity());
            $variant = [];
            foreach ($item->get_formatted_meta_data('_', true) as $meta) {
                $variant[] = wp_strip_all_tags($meta->display_value);
            }
            $image = '';
            if ($product && $product->get_image_id()) {
                $image = wp_get_attachment_image_url($product->get_image_id(), 'thumbnail') ?: '';
            }
            $items[] = [
                'name'      => $item->get_name(),
                'sku'       => $product ? $product->get_sku() : '',
                'productId' => (string) $item->get_product_id(),
                'variantId' => $item->get_variation_id() ? (string) $item->get_variation_id() : null,
                'variant'   => implode(' / ', $variant),
                'quantity'  => $qty,
                // Coupon se pehle ki qeemat (tax ke saath) — discount neeche alag jata hai
                'price'     => round(((float) $item->get_subtotal() + (float) $item->get_subtotal_tax()) / $qty, 2),
                'image'     => $image,
            ];
        }

        return [
            'orderId'       => (string) $order->get_id(),
            'orderNumber'   => (string) $order->get_order_number(),
            'customer'      => [
                'name'    => trim($first . ' ' . $last) ?: $order->get_billing_company(),
                'phone'   => $order->get_billing_phone() ?: $order->get_shipping_phone(),
                'email'   => $order->get_billing_email(),
                'address' => implode(', ', $addr),
                'city'    => $ship ? $order->get_shipping_city() : $order->get_billing_city(),
            ],
            'items'         => $items,
            'subtotal'      => (float) $order->get_subtotal(),
            'deliveryFee'   => (float) $order->get_shipping_total() + (float) $order->get_shipping_tax(),
            'discount'      => (float) $order->get_discount_total() + (float) $order->get_discount_tax(),
            'total'         => (float) $order->get_total(),
            'paymentMethod' => $order->get_payment_method(),
            'paymentTitle'  => $order->get_payment_method_title(),
            'paymentStatus' => $order->is_paid() ? 'paid' : 'pending',
            'shippingMethod'=> $order->get_shipping_method(),
            'notes'         => $order->get_customer_note(),
            'status'        => $order->get_status(),
            'source'        => 'woocommerce',
        ];
    }

    /** Website par cancel/refund hua, ya payment aa gayi → Nafaa ko batao */
    public static function on_status_changed($order_id, $from, $to)
    {
        if (self::$applying_from_nafaa || !Nafaa_Api::is_ready()) {
            return;
        }
        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        // Pehle nahi gaya tha (jaise bank transfer "on-hold" se "processing") → ab bhejo
        if (!$order->get_meta(self::META_SENT) && in_array($to, ['processing', 'on-hold', 'completed'], true)) {
            self::queue($order_id);
            return;
        }
        if (!$order->get_meta(self::META_SENT)) {
            return;
        }

        $body = [];
        if (in_array($to, ['cancelled', 'refunded', 'failed'], true)) {
            $body = ['status' => $to, 'reason' => 'Website par ' . wc_get_order_status_name($to)];
        } elseif ($to === 'processing' && $order->is_paid()) {
            $body = ['paymentStatus' => 'paid'];
        }
        if (!$body) {
            return;
        }
        $res = Nafaa_Api::request('POST', '/orders/' . rawurlencode((string) $order_id) . '/status', $body, 10);
        Nafaa_Api::log($res['ok'], 'Order #' . $order->get_order_number() . ' → ' . $to . ($res['ok'] ? '' : ' (' . $res['error'] . ')'));
    }

    // ═══════════════════════════════════════════════════════════
    // Nafaa → Website (status webhook)
    // ═══════════════════════════════════════════════════════════

    public static function routes()
    {
        register_rest_route('nafaa/v1', '/status', [
            'methods'             => 'POST',
            'callback'            => [__CLASS__, 'receive_status'],
            // Auth HMAC signature se — neeche check hota hai
            'permission_callback' => '__return_true',
        ]);
    }

    public static function receive_status(WP_REST_Request $req)
    {
        $raw = $req->get_body();
        if (!Nafaa_Api::verify_signature($raw, $req->get_header('x-nafaa-signature'))) {
            return new WP_REST_Response(['ok' => false, 'error' => 'bad signature'], 401);
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return new WP_REST_Response(['ok' => false], 400);
        }
        if (($data['event'] ?? '') === 'test') {
            return new WP_REST_Response(['ok' => true, 'message' => 'WordPress tak pahunch gaya']);
        }

        $order = wc_get_order((int) ($data['orderId'] ?? 0));
        if (!$order) {
            return new WP_REST_Response(['ok' => false, 'error' => 'order not found'], 404);
        }

        $labels = [
            'CONFIRMED'        => 'Nafaa: Order accept ho gaya, bill ban gaya',
            'PREPARING'        => 'Nafaa: Order pack ho raha hai',
            'READY'            => 'Nafaa: Order pack ho gaya',
            'OUT_FOR_DELIVERY' => 'Nafaa: Order raste me hai',
            'DELIVERED'        => 'Nafaa: Order deliver ho gaya',
            'CANCELLED'        => 'Nafaa: Order cancel',
            'REJECTED'         => 'Nafaa: Order reject',
        ];
        $status = (string) ($data['status'] ?? '');
        $note = $labels[$status] ?? ('Nafaa: ' . $status);
        if (!empty($data['courierName']) || !empty($data['trackingNumber'])) {
            $note .= ' — ' . trim(($data['courierName'] ?? '') . ' ' . ($data['trackingNumber'] ?? ''));
            $order->update_meta_data('_nafaa_courier', sanitize_text_field($data['courierName'] ?? ''));
            $order->update_meta_data('_nafaa_tracking', sanitize_text_field($data['trackingNumber'] ?? ''));
        }
        if (!empty($data['cancelReason'])) {
            $note .= ' (' . sanitize_text_field($data['cancelReason']) . ')';
        }

        $map = [
            'CONFIRMED' => 'processing',
            'DELIVERED' => 'completed',
            'CANCELLED' => 'cancelled',
            'REJECTED'  => 'cancelled',
        ];

        self::$applying_from_nafaa = true;
        // Customer ko bhi dikhe (My Account → Orders) — "raste me" ka note customer note
        $customer_note = in_array($status, ['OUT_FOR_DELIVERY', 'DELIVERED'], true);
        if (isset($map[$status]) && $order->get_status() !== $map[$status]) {
            $order->update_status($map[$status], $note, true);
        } else {
            $order->add_order_note($note, $customer_note ? 1 : 0);
        }
        if (($data['paymentStatus'] ?? '') === 'PAID' && !$order->is_paid()) {
            $order->set_date_paid(time());
        }
        $order->save();
        self::$applying_from_nafaa = false;

        return new WP_REST_Response(['ok' => true]);
    }
}
