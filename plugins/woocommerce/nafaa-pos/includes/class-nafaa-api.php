<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Nafaa API se baat — har request par key, aur POST par HMAC signature.
 */
class Nafaa_Api
{
    const OPT = 'nafaa_pos_settings';
    const LOG = 'nafaa_pos_log';

    public static function settings()
    {
        $s = get_option(self::OPT, []);
        return wp_parse_args(is_array($s) ? $s : [], [
            'api_url'       => NAFAA_POS_DEFAULT_API,
            'api_key'       => '',
            'secret'        => '',
            'connected'     => false,
            'business'      => '',
            // COD → processing, bank transfer → on-hold. "pending" (payment baqi) nahi.
            'send_statuses' => ['processing', 'on-hold'],
            'stock_sync'    => true,
        ]);
    }

    public static function save_settings(array $patch)
    {
        update_option(self::OPT, array_merge(self::settings(), $patch), false);
    }

    public static function is_ready()
    {
        $s = self::settings();
        return !empty($s['api_key']) && !empty($s['connected']);
    }

    private static function base()
    {
        $s = self::settings();
        return rtrim($s['api_url'] ?: NAFAA_POS_DEFAULT_API, '/') . '/integrations/website/v1';
    }

    /**
     * @return array{ok:bool, status:int, body:mixed, error:?string}
     */
    public static function request($method, $path, $body = null, $timeout = 15)
    {
        $s = self::settings();
        $headers = [
            'Accept'      => 'application/json',
            'X-Nafaa-Key' => $s['api_key'],
            'User-Agent'  => 'Nafaa-WooCommerce/' . NAFAA_POS_VERSION,
        ];
        $args = ['method' => $method, 'timeout' => $timeout, 'headers' => $headers];

        if ($body !== null) {
            $json = wp_json_encode($body);
            $args['body'] = $json;
            $args['headers']['Content-Type'] = 'application/json';
            if (!empty($s['secret'])) {
                $args['headers']['X-Nafaa-Signature'] = 'sha256=' . hash_hmac('sha256', $json, $s['secret']);
            }
        }

        $res = wp_remote_request(self::base() . $path, $args);
        if (is_wp_error($res)) {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => $res->get_error_message()];
        }
        $code = (int) wp_remote_retrieve_response_code($res);
        $data = json_decode(wp_remote_retrieve_body($res), true);
        $ok = $code >= 200 && $code < 300 && (!is_array($data) || !isset($data['success']) || $data['success'] !== false);
        $error = null;
        if (!$ok) {
            $msg = is_array($data) ? ($data['message'] ?? $data['error'] ?? null) : null;
            if (is_array($msg)) {
                $msg = implode(', ', $msg);
            }
            $error = $msg ?: ('HTTP ' . $code);
        }
        return ['ok' => $ok, 'status' => $code, 'body' => $data, 'error' => $error];
    }

    /** Aakhri 30 kaam — settings page par dikhte hain */
    public static function log($ok, $message)
    {
        $log = get_option(self::LOG, []);
        if (!is_array($log)) {
            $log = [];
        }
        array_unshift($log, ['t' => time(), 'ok' => (bool) $ok, 'm' => wp_strip_all_tags((string) $message)]);
        update_option(self::LOG, array_slice($log, 0, 30), false);
    }

    public static function verify_signature($raw, $header)
    {
        $s = self::settings();
        if (empty($s['secret']) || empty($header)) {
            return false;
        }
        $expected = 'sha256=' . hash_hmac('sha256', $raw, $s['secret']);
        return hash_equals($expected, $header);
    }
}
