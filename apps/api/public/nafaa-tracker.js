/**
 * Nafaa Marketing Tracker v1.0
 *
 * Automatically tracks:
 *  - Pageviews (with UTM parsing)
 *  - Session duration
 *  - Custom events
 *  - Click heatmaps (throttled)
 *  - Scroll depth
 *
 * Usage in any HTML page:
 *   <script src="https://api.nafaa.pk/nafaa-tracker.js"></script>
 *
 * Then anywhere:
 *   NafaaTrack.event('signup_clicked', { plan: 'pro' });
 *   NafaaTrack.subscribeNewsletter({ email: 'x@y.com', ...});
 */
(function () {
  var API_BASE = (function () {
    var s = document.currentScript;
    if (!s) return 'https://api.nafaa.pk';
    var src = s.src || '';
    return src.replace(/\/nafaa-tracker\.js.*$/, '') || 'https://api.nafaa.pk';
  })();

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function storage(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {}
  }

  var visitorId = storage('nafaa_vid');
  if (!visitorId) {
    visitorId = uuid();
    storage('nafaa_vid', visitorId);
  }

  var sessionId = sessionStorage.getItem('nafaa_sid');
  if (!sessionId) {
    sessionId = uuid();
    sessionStorage.setItem('nafaa_sid', sessionId);
  }

  function parseUtm() {
    var q = new URLSearchParams(location.search);
    return {
      utmSource: q.get('utm_source') || undefined,
      utmMedium: q.get('utm_medium') || undefined,
      utmCampaign: q.get('utm_campaign') || undefined,
      utmTerm: q.get('utm_term') || undefined,
      utmContent: q.get('utm_content') || undefined,
    };
  }

  function detectDevice() {
    var ua = navigator.userAgent;
    var dt = 'desktop';
    if (/Mobi|Android/i.test(ua)) dt = 'mobile';
    else if (/Tablet|iPad/i.test(ua)) dt = 'tablet';
    var m = ua.match(/(Chrome|Safari|Firefox|Edge)/);
    var browser = m ? m[1] : 'unknown';
    var os = 'unknown';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    return { deviceType: dt, browser: browser, os: os };
  }

  function post(path, body) {
    try {
      var blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      if (navigator.sendBeacon) {
        return navigator.sendBeacon(API_BASE + '/api' + path, blob);
      }
      fetch(API_BASE + '/api' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  function trackPageview() {
    var dev = detectDevice();
    var utm = parseUtm();
    var start = performance.timing.navigationStart;
    var loadTime = performance.now ? Math.round(performance.now()) : undefined;

    post('/public/marketing/pageview', Object.assign({
      visitorId: visitorId,
      sessionId: sessionId,
      path: location.pathname,
      fullUrl: location.href,
      title: document.title,
      referrer: document.referrer || undefined,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      language: navigator.language,
      loadTimeMs: loadTime,
    }, dev, utm));
  }

  // ── Heatmap: throttled clicks + scroll ──
  var clicks = [];
  var maxScroll = 0;
  var pageStart = Date.now();

  document.addEventListener('click', function (e) {
    if (clicks.length > 100) return;
    var t = e.target;
    var rect = t.getBoundingClientRect ? t.getBoundingClientRect() : { top: 0, left: 0 };
    clicks.push({
      x: e.pageX,
      y: e.pageY,
      tag: (t.tagName || '').toLowerCase(),
      text: (t.innerText || '').slice(0, 40),
      t: Date.now() - pageStart,
    });
  }, { passive: true });

  window.addEventListener('scroll', function () {
    var scrolled = window.scrollY + window.innerHeight;
    var pct = Math.min(100, Math.round((scrolled / document.body.scrollHeight) * 100));
    if (pct > maxScroll) maxScroll = pct;
  }, { passive: true });

  function flushHeatmap() {
    if (clicks.length === 0 && maxScroll === 0) return;
    post('/public/marketing/heatmap', {
      path: location.pathname,
      visitorId: visitorId,
      sessionId: sessionId,
      deviceType: detectDevice().deviceType,
      clicks: clicks,
      scrollDepth: maxScroll,
      durationSec: Math.round((Date.now() - pageStart) / 1000),
    });
    clicks = [];
  }

  window.addEventListener('beforeunload', flushHeatmap);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushHeatmap();
  });

  // ── Public API ──
  window.NafaaTrack = {
    event: function (name, props) {
      post('/public/marketing/event', {
        eventName: name,
        visitorId: visitorId,
        sessionId: sessionId,
        path: location.pathname,
        properties: props || {},
      });
    },
    subscribeNewsletter: function (data) {
      var utm = parseUtm();
      return fetch(API_BASE + '/api/public/marketing/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({
          sourcePage: location.pathname,
          sourceUrl: location.href,
        }, utm, data)),
      }).then(function (r) { return r.json(); });
    },
    submitContactForm: function (data) {
      var utm = parseUtm();
      return fetch(API_BASE + '/api/public/marketing/contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({
          sourcePage: location.pathname,
          sourceUrl: location.href,
        }, utm, data)),
      }).then(function (r) { return r.json(); });
    },
    bookDemo: function (data) {
      var utm = parseUtm();
      return fetch(API_BASE + '/api/public/marketing/demo-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({
          sourceUrl: location.href,
        }, utm, data)),
      }).then(function (r) { return r.json(); });
    },
    startChat: function (data) {
      return fetch(API_BASE + '/api/public/marketing/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({
          visitorId: visitorId,
          currentPage: location.pathname,
        }, data || {})),
      }).then(function (r) { return r.json(); });
    },
    sendChat: function (conversationId, content) {
      return fetch(API_BASE + '/api/public/marketing/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conversationId, content: content }),
      }).then(function (r) { return r.json(); });
    },
    visitorId: visitorId,
    sessionId: sessionId,
  };

  // Auto-track initial pageview
  if (document.readyState === 'complete') trackPageview();
  else window.addEventListener('load', trackPageview);

  // Track SPA route changes
  var lastPath = location.pathname;
  setInterval(function () {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      flushHeatmap();
      pageStart = Date.now();
      maxScroll = 0;
      trackPageview();
    }
  }, 500);
})();
