/**
 * Lightweight analytics client. Sends events to backend + optionally to
 * Google Analytics / Facebook Pixel / Mixpanel when configured.
 */

type EventProps = Record<string, any>;

interface AnalyticsConfig {
  gaId?: string;
  fbPixelId?: string;
  mixpanelToken?: string;
  debug?: boolean;
}

class Analytics {
  private config: AnalyticsConfig = {};
  private queue: Array<{ event: string; props: EventProps; ts: number }> = [];
  private flushTimer: any = null;

  init(config: AnalyticsConfig) {
    this.config = config;

    if (config.gaId && !document.getElementById('ga-script')) {
      const script = document.createElement('script');
      script.id = 'ga-script';
      script.src = `https://www.googletagmanager.com/gtag/js?id=${config.gaId}`;
      script.async = true;
      document.head.appendChild(script);
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).gtag = function () { (window as any).dataLayer.push(arguments); };
      (window as any).gtag('js', new Date());
      (window as any).gtag('config', config.gaId, { send_page_view: false });
    }

    if (config.fbPixelId && !(window as any).fbq) {
      const fbCode = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');`;
      const s = document.createElement('script');
      s.text = fbCode + `fbq('init','${config.fbPixelId}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  }

  pageView(path: string, title?: string) {
    if (this.config.debug) console.log('[analytics] page_view', path);
    if ((window as any).gtag && this.config.gaId) {
      (window as any).gtag('event', 'page_view', {
        page_path: path,
        page_title: title || document.title,
      });
    }
    if ((window as any).fbq) (window as any).fbq('track', 'PageView');
  }

  track(event: string, props: EventProps = {}) {
    if (this.config.debug) console.log('[analytics]', event, props);

    if ((window as any).gtag && this.config.gaId) {
      (window as any).gtag('event', event, props);
    }
    if ((window as any).fbq && ['purchase', 'add_to_cart', 'sign_up', 'view_content'].includes(event)) {
      (window as any).fbq('track', this.mapToFb(event), props);
    }

    this.queue.push({ event, props, ts: Date.now() });
    this.scheduleFlush();
  }

  private mapToFb(event: string): string {
    return ({
      purchase: 'Purchase',
      add_to_cart: 'AddToCart',
      sign_up: 'CompleteRegistration',
      view_content: 'ViewContent',
      search: 'Search',
      begin_checkout: 'InitiateCheckout',
    } as any)[event] || event;
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flush(), 5000);
  }

  private async flush() {
    this.flushTimer = null;
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      // Send to backend for internal analytics (fail silently)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
        const url = `${import.meta.env.VITE_MARKETPLACE_API_URL}/analytics/events`;
        navigator.sendBeacon(url, blob);
      }
    } catch {}
  }

  // Convenience methods for common events
  signUp(method: string) { this.track('sign_up', { method }); }
  login(method: string) { this.track('login', { method }); }
  search(term: string) { this.track('search', { search_term: term }); }
  viewItem(productId: string, price: number, name: string) {
    this.track('view_content', { content_ids: [productId], content_type: 'product', value: price, currency: 'PKR', content_name: name });
  }
  addToCart(productId: string, price: number, quantity: number) {
    this.track('add_to_cart', { content_ids: [productId], value: price * quantity, currency: 'PKR' });
  }
  beginCheckout(total: number, itemCount: number) {
    this.track('begin_checkout', { value: total, currency: 'PKR', num_items: itemCount });
  }
  purchase(orderId: string, total: number, itemCount: number) {
    this.track('purchase', { transaction_id: orderId, value: total, currency: 'PKR', num_items: itemCount });
  }
  bargainStart(productId: string, offer: number) {
    this.track('bargain_start', { product_id: productId, offer_price: offer });
  }
  bargainAccepted(bargainId: string, final: number) {
    this.track('bargain_accepted', { bargain_id: bargainId, final_price: final });
  }
  joinGroupBuy(id: string) { this.track('join_group_buy', { group_buy_id: id }); }
  placeBid(auctionId: string, amount: number) {
    this.track('place_bid', { auction_id: auctionId, amount });
  }
  addToWishlist(productId: string) { this.track('add_to_wishlist', { content_ids: [productId] }); }
  shareContent(type: string, id: string) { this.track('share', { content_type: type, content_id: id }); }
  voiceSearchUsed(lang: string, resultCount: number) {
    this.track('voice_search', { language: lang, results: resultCount });
  }
  aiAssistantOpened() { this.track('ai_assistant_opened'); }
}

export const analytics = new Analytics();
