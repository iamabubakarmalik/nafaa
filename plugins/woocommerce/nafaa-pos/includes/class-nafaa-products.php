<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Products aur stock:
 *  • Stock sync (har 15 min): Nafaa ka asli stock → WooCommerce (SKU se)
 *  • "Products Nafaa se lao": Nafaa ke products → WooCommerce me ban jayen / update
 *  • "Products Nafaa me bhejo": WooCommerce ke products → Nafaa
 */
class Nafaa_Products
{
    public static function init()
    {
        add_action('nafaa_sync_stock', [__CLASS__, 'sync_stock']);
    }

    /** SKU wale sab products/variations ka stock Nafaa se */
    public static function sync_stock()
    {
        $s = Nafaa_Api::settings();
        if (!Nafaa_Api::is_ready() || empty($s['stock_sync'])) {
            return ['updated' => 0];
        }

        $ids = wc_get_products([
            'limit'  => -1,
            'return' => 'ids',
            'type'   => ['simple', 'variation', 'variable'],
            'status' => ['publish', 'private'],
        ]);
        $variation_ids = get_posts([
            'post_type'   => 'product_variation',
            'numberposts' => -1,
            'fields'      => 'ids',
            'post_status' => ['publish', 'private'],
        ]);
        $all = array_unique(array_merge($ids, $variation_ids));

        $by_sku = [];
        foreach ($all as $id) {
            $p = wc_get_product($id);
            if ($p && $p->get_sku() && !$p->is_type('variable')) {
                $by_sku[$p->get_sku()] = $p;
            }
        }

        $updated = 0;
        foreach (array_chunk(array_keys($by_sku), 200) as $chunk) {
            $res = Nafaa_Api::request('GET', '/stock?skus=' . rawurlencode(implode(',', $chunk)), null, 20);
            if (!$res['ok'] || empty($res['body']['stock'])) {
                continue;
            }
            foreach ($res['body']['stock'] as $sku => $qty) {
                if (!isset($by_sku[$sku])) {
                    continue;
                }
                $p = $by_sku[$sku];
                $qty = (int) floor((float) $qty);
                if (!$p->get_manage_stock()) {
                    $p->set_manage_stock(true);
                }
                if ((int) $p->get_stock_quantity() !== $qty) {
                    wc_update_product_stock($p, $qty, 'set');
                    $updated++;
                } else {
                    $p->save();
                }
            }
        }
        update_option('nafaa_pos_last_stock_sync', time(), false);
        if ($updated) {
            Nafaa_Api::log(true, "Stock sync: $updated products update");
        }
        return ['updated' => $updated];
    }

    /** Nafaa → WooCommerce */
    public static function pull_from_nafaa($with_images = true)
    {
        $created = 0;
        $updated = 0;
        $page = 1;
        do {
            $res = Nafaa_Api::request('GET', '/products?limit=100&page=' . $page, null, 30);
            if (!$res['ok']) {
                Nafaa_Api::log(false, 'Products lane me masla: ' . $res['error']);
                break;
            }
            $body = $res['body'];
            foreach (($body['products'] ?? []) as $np) {
                $r = self::upsert_from_nafaa($np, $with_images);
                if ($r === 'created') {
                    $created++;
                } elseif ($r === 'updated') {
                    $updated++;
                }
            }
            $page++;
        } while (!empty($body['hasMore']) && $page <= 50);

        Nafaa_Api::log(true, "Nafaa se products: $created naye, $updated update");
        return ['created' => $created, 'updated' => $updated];
    }

    private static function upsert_from_nafaa(array $np, $with_images)
    {
        $sku = !empty($np['sku']) ? (string) $np['sku'] : 'NF-' . substr((string) $np['id'], 0, 8);
        $existing_id = wc_get_product_id_by_sku($sku);
        $has_variants = !empty($np['variants']);

        if ($existing_id) {
            $p = wc_get_product($existing_id);
            if (!$p) {
                return null;
            }
            if (!$p->is_type('variable')) {
                $p->set_regular_price((string) $np['price']);
                $p->set_manage_stock(true);
                $p->set_stock_quantity((int) $np['stock']);
                $p->save();
            }
            update_post_meta($p->get_id(), '_nafaa_product_id', sanitize_text_field($np['id']));
            return 'updated';
        }

        $p = $has_variants ? new WC_Product_Variable() : new WC_Product_Simple();
        $p->set_name(sanitize_text_field($np['name']));
        $p->set_sku($sku);
        $p->set_status('publish');
        if (!empty($np['description'])) {
            $p->set_description(wp_kses_post($np['description']));
        }
        if (!empty($np['shortDescription'])) {
            $p->set_short_description(wp_kses_post($np['shortDescription']));
        }
        if (!empty($np['category'])) {
            $term = term_exists($np['category'], 'product_cat');
            if (!$term) {
                $term = wp_insert_term(sanitize_text_field($np['category']), 'product_cat');
            }
            if (!is_wp_error($term)) {
                $p->set_category_ids([(int) (is_array($term) ? $term['term_id'] : $term)]);
            }
        }

        if ($has_variants) {
            $attr = new WC_Product_Attribute();
            $attr->set_name('Option');
            $attr->set_options(array_map(function ($v) { return (string) $v['name']; }, $np['variants']));
            $attr->set_visible(true);
            $attr->set_variation(true);
            $p->set_attributes([$attr]);
        } else {
            $p->set_regular_price((string) $np['price']);
            $p->set_manage_stock(true);
            $p->set_stock_quantity((int) $np['stock']);
        }
        $pid = $p->save();
        update_post_meta($pid, '_nafaa_product_id', sanitize_text_field($np['id']));

        if ($has_variants) {
            foreach ($np['variants'] as $v) {
                $var = new WC_Product_Variation();
                $var->set_parent_id($pid);
                $var->set_attributes(['option' => (string) $v['name']]);
                if (!empty($v['sku'])) {
                    $var->set_sku((string) $v['sku']);
                }
                $var->set_regular_price((string) $v['price']);
                $var->set_manage_stock(true);
                $var->set_stock_quantity((int) $v['stock']);
                $var->save();
            }
        }

        if ($with_images && !empty($np['images'])) {
            self::attach_images($pid, array_slice($np['images'], 0, 4));
        }
        return 'created';
    }

    private static function attach_images($product_id, array $urls)
    {
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $ids = [];
        foreach ($urls as $url) {
            $id = media_sideload_image(esc_url_raw($url), $product_id, null, 'id');
            if (!is_wp_error($id)) {
                $ids[] = (int) $id;
            }
        }
        if ($ids) {
            $p = wc_get_product($product_id);
            $p->set_image_id(array_shift($ids));
            if ($ids) {
                $p->set_gallery_image_ids($ids);
            }
            $p->save();
        }
    }

    /** WooCommerce → Nafaa */
    public static function push_to_nafaa($update_price = false, $update_stock = false)
    {
        $totals = ['imported' => 0, 'updated' => 0, 'failed' => 0];
        $page = 1;
        do {
            $products = wc_get_products(['limit' => 100, 'page' => $page, 'status' => ['publish', 'private']]);
            $batch = [];
            foreach ($products as $p) {
                /** @var WC_Product $p */
                $cats = wp_get_post_terms($p->get_id(), 'product_cat', ['fields' => 'names']);
                $images = [];
                if ($p->get_image_id()) {
                    $images[] = wp_get_attachment_url($p->get_image_id());
                }
                foreach (array_slice($p->get_gallery_image_ids(), 0, 3) as $gid) {
                    $images[] = wp_get_attachment_url($gid);
                }
                $batch[] = [
                    'id'          => (string) $p->get_id(),
                    'name'        => $p->get_name(),
                    'sku'         => $p->get_sku(),
                    'price'       => (float) ($p->get_regular_price() ?: $p->get_price()),
                    'stock'       => $p->get_manage_stock() ? (float) $p->get_stock_quantity() : null,
                    'description' => wp_strip_all_tags($p->get_short_description() ?: $p->get_description()),
                    'category'    => is_array($cats) && $cats ? $cats[0] : null,
                    'images'      => array_values(array_filter($images)),
                ];
            }
            if ($batch) {
                $res = Nafaa_Api::request('POST', '/products', [
                    'products'    => $batch,
                    'updatePrice' => (bool) $update_price,
                    'updateStock' => (bool) $update_stock,
                ], 60);
                if ($res['ok']) {
                    foreach ($totals as $k => $v) {
                        $totals[$k] += (int) ($res['body'][$k] ?? 0);
                    }
                } else {
                    $totals['failed'] += count($batch);
                    Nafaa_Api::log(false, 'Products bhejne me masla: ' . $res['error']);
                }
            }
            $page++;
        } while (count($products) === 100 && $page <= 50);

        Nafaa_Api::log(true, "Nafaa me products: {$totals['imported']} naye, {$totals['updated']} update");
        return $totals;
    }
}
