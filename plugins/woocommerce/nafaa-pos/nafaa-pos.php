<?php
/**
 * Plugin Name:       Nafaa POS for WooCommerce
 * Plugin URI:        https://nafaa.pk
 * Description:       Website ke orders seedha Nafaa POS me — ghanti, bill, receipt aur stock khud. Products aur stock dono taraf sync.
 * Version:           1.0.0
 * Author:            Nafaa
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * WC requires at least: 6.0
 * WC tested up to:   9.3
 * Text Domain:       nafaa-pos
 * License:           GPLv2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NAFAA_POS_VERSION', '1.0.0');
define('NAFAA_POS_FILE', __FILE__);
define('NAFAA_POS_DEFAULT_API', 'https://api.nafaa.pk/api');

require_once __DIR__ . '/includes/class-nafaa-api.php';
require_once __DIR__ . '/includes/class-nafaa-orders.php';
require_once __DIR__ . '/includes/class-nafaa-products.php';
require_once __DIR__ . '/includes/class-nafaa-admin.php';

// WooCommerce ke naye order tables (HPOS) ke saath chalta hai
add_action('before_woocommerce_init', function () {
    if (class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', NAFAA_POS_FILE, true);
    }
});

add_action('plugins_loaded', function () {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function () {
            echo '<div class="notice notice-error"><p><b>Nafaa POS:</b> pehle WooCommerce install aur activate karein.</p></div>';
        });
        return;
    }
    Nafaa_Orders::init();
    Nafaa_Products::init();
    Nafaa_Admin::init();
});

// Har 15 minute stock sync
add_filter('cron_schedules', function ($s) {
    $s['nafaa_15min'] = ['interval' => 15 * MINUTE_IN_SECONDS, 'display' => 'Every 15 minutes (Nafaa)'];
    return $s;
});

register_activation_hook(__FILE__, function () {
    if (!wp_next_scheduled('nafaa_sync_stock')) {
        wp_schedule_event(time() + 300, 'nafaa_15min', 'nafaa_sync_stock');
    }
});

register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook('nafaa_sync_stock');
});
