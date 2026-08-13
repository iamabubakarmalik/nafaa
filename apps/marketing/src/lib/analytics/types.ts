/**
 * Global window types for all tracking pixels
 * Prevents TS errors when calling window.fbq, window.ttq, etc.
 */

declare global {
  interface Window {
    // Google
    gtag?: (...args: any[]) => void;
    dataLayer?: Object[];
    
    // Meta
    fbq?: {
      (...args: any[]): void;
      callMethod?: (...args: any[]) => void;
      queue?: any[];
      loaded?: boolean;
      version?: string;
      push?: (...args: any[]) => void;
    };
    _fbq?: any;
    
    // TikTok
    ttq?: {
      (...args: any[]): void;
      methods?: string[];
      setAndDefer?: (t: any, e: string) => void;
      instance?: (t: any) => any;
      load?: (id: string) => void;
      page?: () => void;
      track?: (event: string, params?: any) => void;
    };
    TiktokAnalyticsObject?: string;
    
    // LinkedIn
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
    lintrk?: (action: string, params?: any) => void;
    
    // Microsoft Clarity
    clarity?: (...args: any[]) => void;
    
    // Snap
    snaptr?: (...args: any[]) => void;
    
    // Pinterest
    pintrk?: (...args: any[]) => void;
    
    // Hotjar
    hj?: (...args: any[]) => void;
    _hjSettings?: { hjid: string; hjsv: number };
    
    // Plausible (legacy compat)
    plausible?: (event: string, opts?: any) => void;
  }
}

export {};
