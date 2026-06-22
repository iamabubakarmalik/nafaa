import * as crypto from 'crypto';

export interface DeviceInfo {
  device: string;        // "iPhone 15", "Windows PC", "MacBook"
  browser: string;       // "Chrome 120", "Safari 17"
  os: string;            // "iOS 17.2", "Windows 11", "macOS 14"
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  fingerprint: string;   // Hash for matching
  raw: string;           // Original UA
}

/**
 * Parse User-Agent string into readable device info
 */
export function parseUserAgent(userAgent?: string): DeviceInfo {
  const ua = userAgent || '';
  const lower = ua.toLowerCase();

  // ─── Device Type ───
  let deviceType: DeviceInfo['deviceType'] = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet/i.test(ua)) {
    deviceType = 'tablet';
  } else if (!ua) {
    deviceType = 'unknown';
  }

  // ─── OS Detection ───
  let os = 'Unknown OS';
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6.2/i.test(ua)) os = 'Windows 8';
  else if (/windows nt 6.1/i.test(ua)) os = 'Windows 7';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os x ([\d_]+)/i.test(ua)) {
    const m = ua.match(/mac os x ([\d_]+)/i);
    os = m ? `macOS ${m[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/iphone os ([\d_]+)/i.test(ua)) {
    const m = ua.match(/iphone os ([\d_]+)/i);
    os = m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/android ([\d.]+)/i.test(ua)) {
    const m = ua.match(/android ([\d.]+)/i);
    os = m ? `Android ${m[1]}` : 'Android';
  } else if (/linux/i.test(ua)) os = 'Linux';
  else if (/ubuntu/i.test(ua)) os = 'Ubuntu';

  // ─── Browser Detection ───
  let browser = 'Unknown Browser';
  if (/edg\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/edg\/([\d.]+)/i);
    browser = m ? `Edge ${m[1].split('.')[0]}` : 'Edge';
  } else if (/chrome\/([\d.]+)/i.test(ua) && !/edg/i.test(ua) && !/opr/i.test(ua)) {
    const m = ua.match(/chrome\/([\d.]+)/i);
    browser = m ? `Chrome ${m[1].split('.')[0]}` : 'Chrome';
  } else if (/firefox\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/firefox\/([\d.]+)/i);
    browser = m ? `Firefox ${m[1].split('.')[0]}` : 'Firefox';
  } else if (/safari\/([\d.]+)/i.test(ua) && /version\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/version\/([\d.]+)/i);
    browser = m ? `Safari ${m[1].split('.')[0]}` : 'Safari';
  } else if (/opr\/([\d.]+)/i.test(ua) || /opera\/([\d.]+)/i.test(ua)) {
    const m = ua.match(/(?:opr|opera)\/([\d.]+)/i);
    browser = m ? `Opera ${m[1].split('.')[0]}` : 'Opera';
  } else if (/postman/i.test(ua)) browser = 'Postman';
  else if (/curl/i.test(ua)) browser = 'cURL';
  else if (/insomnia/i.test(ua)) browser = 'Insomnia';

  // ─── Device Model ───
  let device = 'Unknown Device';
  if (/iphone/i.test(ua)) device = 'iPhone';
  else if (/ipad/i.test(ua)) device = 'iPad';
  else if (/ipod/i.test(ua)) device = 'iPod';
  else if (/android/i.test(ua)) {
    // Try to extract model from Android UA
    const modelMatch = ua.match(/;\s*([^;)]+)\s+build/i);
    device = modelMatch ? modelMatch[1].trim() : 'Android Device';
  } else if (/windows/i.test(ua)) device = 'Windows PC';
  else if (/macintosh|mac os x/i.test(ua)) device = 'Mac';
  else if (/linux/i.test(ua)) device = 'Linux PC';
  else if (deviceType === 'mobile') device = 'Mobile Device';
  else if (deviceType === 'tablet') device = 'Tablet';

  // ─── Fingerprint (for matching same device later) ───
  // Hash: browser + os + device type — IGNORE version numbers so minor updates don't trigger
  const fingerprintRaw = `${browser.split(' ')[0]}|${os.split(' ')[0]}|${device}|${deviceType}`;
  const fingerprint = crypto
    .createHash('sha256')
    .update(fingerprintRaw)
    .digest('hex')
    .slice(0, 16);

  return {
    device,
    browser,
    os,
    deviceType,
    fingerprint,
    raw: ua,
  };
}

/**
 * Simple IP-based location lookup (placeholder — integrate real service later)
 * For now returns city/country guess based on IP patterns
 */
export function getLocationFromIp(ip?: string): string {
  if (!ip) return 'Unknown';

  // Local/private IPs
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') ||
      ip.startsWith('10.') || ip.startsWith('172.')) {
    return 'Local Network';
  }

  // TODO: integrate ip-api.com or ipapi.co for real geolocation
  // For production: cache results in Redis to avoid rate limits
  return `IP: ${ip}`;
}

/**
 * Format login time for emails (Pakistan timezone)
 */
export function formatLoginTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'Asia/Karachi',
  }).format(date);
}

/**
 * Generate a strong random password for team members
 */
export function generateTempPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%&*';
  let password = '';
  for (let i = 0; i < length - 2; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure at least 1 symbol and 1 number
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  password += Math.floor(Math.random() * 10).toString();
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
