<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * WooCommerce → Nafaa POS safha. Sirf 2 cheezein paste karni hain: Key aur Secret.
 */
class Nafaa_Admin
{
    public static function init()
    {
        add_action('admin_menu', [__CLASS__, 'menu']);
        add_action('admin_post_nafaa_save', [__CLASS__, 'handle_save']);
        add_action('admin_post_nafaa_action', [__CLASS__, 'handle_action']);
        add_filter('plugin_action_links_' . plugin_basename(NAFAA_POS_FILE), function ($links) {
            array_unshift($links, '<a href="' . esc_url(admin_url('admin.php?page=nafaa-pos')) . '">Settings</a>');
            return $links;
        });
        add_action('admin_notices', [__CLASS__, 'notice']);
    }

    public static function menu()
    {
        add_submenu_page('woocommerce', 'Nafaa POS', 'Nafaa POS', 'manage_woocommerce', 'nafaa-pos', [__CLASS__, 'render']);
    }

    public static function notice()
    {
        if (Nafaa_Api::is_ready() || !current_user_can('manage_woocommerce')) {
            return;
        }
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        if ($screen && strpos((string) $screen->id, 'nafaa-pos') !== false) {
            return;
        }
        echo '<div class="notice notice-warning"><p><b>Nafaa POS:</b> connect nahi hai — <a href="' .
            esc_url(admin_url('admin.php?page=nafaa-pos')) . '">Key paste karein</a> taake orders POS me jayen.</p></div>';
    }

    public static function handle_save()
    {
        if (!current_user_can('manage_woocommerce')) {
            wp_die('Not allowed');
        }
        check_admin_referer('nafaa_save');

        $key = sanitize_text_field(wp_unslash($_POST['api_key'] ?? ''));
        $secret = sanitize_text_field(wp_unslash($_POST['secret'] ?? ''));
        $api = esc_url_raw(wp_unslash($_POST['api_url'] ?? NAFAA_POS_DEFAULT_API));
        $stock = !empty($_POST['stock_sync']);

        Nafaa_Api::save_settings([
            'api_key'    => $key,
            'secret'     => $secret,
            'api_url'    => $api ?: NAFAA_POS_DEFAULT_API,
            'stock_sync' => $stock,
            'connected'  => false,
        ]);

        $verify = Nafaa_Api::request('GET', '/verify', null, 15);
        if (!$verify['ok'] || empty($verify['body']['valid'])) {
            Nafaa_Api::log(false, 'Connect nahi hua: ' . ($verify['error'] ?: 'key ghalat'));
            self::back('error', 'Connect nahi hua — Key check karein. (' . ($verify['error'] ?: 'key ghalat') . ')');
        }

        // Nafaa ko batao status kahan bhejna hai
        $settings = Nafaa_Api::request('POST', '/settings', [
            'statusWebhookUrl' => rest_url('nafaa/v1/status'),
            'siteUrl'          => home_url(),
            'platform'         => 'woocommerce',
        ], 15);

        Nafaa_Api::save_settings([
            'connected' => true,
            'business'  => trim(($verify['body']['business'] ?? '') . ' ' . (!empty($verify['body']['branch']) ? '(' . $verify['body']['branch'] . ')' : '')),
        ]);
        if (!wp_next_scheduled('nafaa_sync_stock')) {
            wp_schedule_event(time() + 60, 'nafaa_15min', 'nafaa_sync_stock');
        }
        Nafaa_Api::log(true, 'Nafaa se jur gaya ✅');
        $msg = 'Jur gaya ✅ Ab website par order hoga to Nafaa me ghanti bajegi.';
        if (!$settings['ok']) {
            $msg .= ' (Status wapas aane wala URL set nahi hua: ' . $settings['error'] . ' — secret check karein)';
        }
        self::back('success', $msg);
    }

    public static function handle_action()
    {
        if (!current_user_can('manage_woocommerce')) {
            wp_die('Not allowed');
        }
        check_admin_referer('nafaa_action');
        $do = sanitize_key($_POST['do'] ?? '');
        @set_time_limit(300);

        if ($do === 'disconnect') {
            Nafaa_Api::save_settings(['connected' => false, 'api_key' => '', 'secret' => '']);
            self::back('success', 'Nafaa se connection hata diya.');
        }
        if (!Nafaa_Api::is_ready()) {
            self::back('error', 'Pehle connect karein.');
        }
        if ($do === 'stock') {
            $r = Nafaa_Products::sync_stock();
            self::back('success', 'Stock sync ho gaya — ' . (int) $r['updated'] . ' products update.');
        }
        if ($do === 'pull') {
            $r = Nafaa_Products::pull_from_nafaa(!empty($_POST['images']));
            self::back('success', "Nafaa se products: {$r['created']} naye, {$r['updated']} update.");
        }
        if ($do === 'push') {
            $r = Nafaa_Products::push_to_nafaa(!empty($_POST['update_price']), !empty($_POST['update_stock']));
            self::back('success', "Nafaa me products: {$r['imported']} naye, {$r['updated']} update, {$r['failed']} fail.");
        }
        if ($do === 'resend') {
            $orders = wc_get_orders([
                'limit'      => 20,
                'status'     => ['processing', 'on-hold'],
                'meta_query' => [['key' => Nafaa_Orders::META_SENT, 'compare' => 'NOT EXISTS']],
            ]);
            foreach ($orders as $o) {
                Nafaa_Orders::send($o->get_id());
            }
            self::back('success', count($orders) . ' reh jane wale orders dobara bheje.');
        }
        self::back('error', 'Ghalat action');
    }

    private static function back($type, $msg)
    {
        set_transient('nafaa_pos_flash_' . get_current_user_id(), ['type' => $type, 'msg' => $msg], 60);
        wp_safe_redirect(admin_url('admin.php?page=nafaa-pos'));
        exit;
    }

    public static function render()
    {
        $s = Nafaa_Api::settings();
        $log = get_option(Nafaa_Api::LOG, []);
        $flash = get_transient('nafaa_pos_flash_' . get_current_user_id());
        delete_transient('nafaa_pos_flash_' . get_current_user_id());
        $last_stock = (int) get_option('nafaa_pos_last_stock_sync', 0);
        ?>
        <div class="wrap">
            <h1 style="display:flex;align-items:center;gap:8px">🟢 Nafaa POS</h1>
            <p style="font-size:14px;max-width:720px">Website ke orders seedha Nafaa POS me jate hain — wahan ghanti bajti hai, ek click me bill aur receipt, aur stock khud kam. Nafaa me status badlo (raste me, deliver) to yahan order par bhi likha aata hai.</p>

            <?php if ($flash) : ?>
                <div class="notice notice-<?php echo esc_attr($flash['type']); ?> is-dismissible"><p><?php echo esc_html($flash['msg']); ?></p></div>
            <?php endif; ?>

            <div style="background:#fff;border:1px solid #dcdcde;border-radius:10px;padding:20px;max-width:720px;margin-top:16px">
                <h2 style="margin-top:0">
                    <?php echo $s['connected'] ? '✅ Jur gaya' : '1. Connect karein'; ?>
                    <?php if ($s['connected'] && $s['business']) : ?><span style="font-weight:400;color:#50575e"> — <?php echo esc_html($s['business']); ?></span><?php endif; ?>
                </h2>
                <p>Nafaa app → <b>Online Store → Website Connect</b> se <b>Key</b> aur <b>Secret</b> copy karke yahan daalein.</p>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <?php wp_nonce_field('nafaa_save'); ?>
                    <input type="hidden" name="action" value="nafaa_save">
                    <table class="form-table" role="presentation">
                        <tr><th><label for="nafaa_key">Nafaa Key</label></th>
                            <td><input id="nafaa_key" name="api_key" type="password" class="regular-text" value="<?php echo esc_attr($s['api_key']); ?>" autocomplete="off" required></td></tr>
                        <tr><th><label for="nafaa_secret">Secret</label></th>
                            <td><input id="nafaa_secret" name="secret" type="password" class="regular-text" value="<?php echo esc_attr($s['secret']); ?>" autocomplete="off" required></td></tr>
                        <tr><th>Stock sync</th>
                            <td><label><input type="checkbox" name="stock_sync" value="1" <?php checked($s['stock_sync']); ?>> Har 15 minute Nafaa ka stock website par lagao (SKU se)</label></td></tr>
                        <tr><th><label for="nafaa_api">API URL</label></th>
                            <td><input id="nafaa_api" name="api_url" type="url" class="regular-text" value="<?php echo esc_attr($s['api_url']); ?>">
                                <p class="description">Isay mat badlein jab tak Nafaa support na kahe.</p></td></tr>
                    </table>
                    <?php submit_button($s['connected'] ? 'Save' : 'Save & Connect'); ?>
                </form>
            </div>

            <?php if ($s['connected']) : ?>
            <div style="background:#fff;border:1px solid #dcdcde;border-radius:10px;padding:20px;max-width:720px;margin-top:16px">
                <h2 style="margin-top:0">2. Products aur stock</h2>
                <?php self::action_button('stock', 'Stock abhi sync karo', 'Aakhri sync: ' . ($last_stock ? human_time_diff($last_stock) . ' pehle' : 'abhi tak nahi')); ?>
                <?php self::action_button('pull', 'Products Nafaa se lao', 'Nafaa ke products yahan ban jayenge (SKU se). Jo pehle hain unki qeemat aur stock update.', '<label><input type="checkbox" name="images" value="1" checked> Tasveerein bhi</label>'); ?>
                <?php self::action_button('push', 'Products Nafaa me bhejo', 'Yahan ke products Nafaa me ban jayenge.', '<label><input type="checkbox" name="update_price" value="1"> Nafaa me pehle wale products ki qeemat bhi badlo</label><br><label><input type="checkbox" name="update_stock" value="1"> Stock bhi</label>'); ?>
                <?php self::action_button('resend', 'Reh jane wale orders dobara bhejo', 'Jo orders internet ki wajah se Nafaa nahi pahunche.'); ?>
            </div>

            <div style="background:#fff;border:1px solid #dcdcde;border-radius:10px;padding:20px;max-width:720px;margin-top:16px">
                <h2 style="margin-top:0">Haal hi me</h2>
                <?php if (!$log) : ?><p>Abhi kuch nahi hua.</p><?php endif; ?>
                <table class="widefat striped"><tbody>
                <?php foreach ($log as $l) : ?>
                    <tr><td style="width:24px"><?php echo $l['ok'] ? '✅' : '❌'; ?></td>
                        <td><?php echo esc_html($l['m']); ?></td>
                        <td style="width:140px;color:#646970"><?php echo esc_html(human_time_diff($l['t']) . ' pehle'); ?></td></tr>
                <?php endforeach; ?>
                </tbody></table>
                <?php self::action_button('disconnect', 'Disconnect', '', '', 'button-link-delete'); ?>
            </div>
            <?php endif; ?>
        </div>
        <?php
    }

    private static function action_button($do, $label, $help = '', $extra = '', $class = 'button-secondary')
    {
        ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin:12px 0;padding-bottom:12px;border-bottom:1px solid #f0f0f1">
            <?php wp_nonce_field('nafaa_action'); ?>
            <input type="hidden" name="action" value="nafaa_action">
            <input type="hidden" name="do" value="<?php echo esc_attr($do); ?>">
            <?php if ($extra) : ?><div style="margin-bottom:6px"><?php echo $extra; // static HTML ?></div><?php endif; ?>
            <button type="submit" class="button <?php echo esc_attr($class); ?>"><?php echo esc_html($label); ?></button>
            <?php if ($help) : ?><span class="description" style="margin-left:8px"><?php echo esc_html($help); ?></span><?php endif; ?>
        </form>
        <?php
    }
}
