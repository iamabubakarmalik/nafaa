import { Injectable, Logger } from '@nestjs/common';
import { getCityInfo } from '../constants/location-data';

@Injectable()
export class LocationDetectorService {
  private readonly logger = new Logger(LocationDetectorService.name);

  /**
   * Detect location from IP address using ip-api.com (free, no key needed)
   * Returns detected city, province, country, timezone
   */
  async detectFromIp(ip: string): Promise<{
    city: string | null;
    province: string | null;
    country: string | null;
    timezone: string | null;
    latitude: number | null;
    longitude: number | null;
  }> {
    try {
      // Skip local IPs
      if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { city: null, province: null, country: 'Pakistan', timezone: 'Asia/Karachi', latitude: null, longitude: null };
      }

      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,timezone,lat,lon`);
      if (!response.ok) throw new Error(`IP API returned ${response.status}`);

      const data: any = await response.json();
      if (data.status !== 'success') {
        return { city: null, province: null, country: 'Pakistan', timezone: 'Asia/Karachi', latitude: null, longitude: null };
      }

      // Try to match detected city with our Pakistan city list
      const cityInfo = data.city ? getCityInfo(data.city) : null;

      return {
        city: cityInfo?.name || data.city || null,
        province: cityInfo?.province || data.regionName || null,
        country: data.country || 'Pakistan',
        timezone: data.timezone || 'Asia/Karachi',
        latitude: data.lat || null,
        longitude: data.lon || null,
      };
    } catch (e: any) {
      this.logger.warn(`IP location detection failed: ${e.message}`);
      return { city: null, province: null, country: 'Pakistan', timezone: 'Asia/Karachi', latitude: null, longitude: null };
    }
  }

  /**
   * Extract IP from request headers (respects proxy chains)
   */
  extractIp(request: any): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
      return (ips[0] as string).trim();
    }
    return request.ip || request.socket?.remoteAddress || '';
  }
}
