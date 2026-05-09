const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const tasks = [
  // Open Graph & SEO (1200×630 — standard OG size)
  { src: 'svg/og-default.svg', out: 'og/og-default.png', w: 1200, h: 630 },
  { src: 'svg/og-pricing.svg', out: 'og/og-pricing.png', w: 1200, h: 630 },
  { src: 'svg/og-features.svg', out: 'og/og-features.png', w: 1200, h: 630 },
  { src: 'svg/og-blog.svg', out: 'og/og-blog.png', w: 1200, h: 630 },
  { src: 'svg/og-industry-bakery.svg', out: 'og/og-industry-bakery.png', w: 1200, h: 630 },
  { src: 'svg/og-industry-kiryana.svg', out: 'og/og-industry-kiryana.png', w: 1200, h: 630 },
  { src: 'svg/og-industry-mobile-shop.svg', out: 'og/og-industry-mobile-shop.png', w: 1200, h: 630 },
  { src: 'svg/og-industry-pharmacy.svg', out: 'og/og-industry-pharmacy.png', w: 1200, h: 630 },

  // WhatsApp share
  { src: 'svg/whatsapp-share.svg', out: 'whatsapp/whatsapp-share.png', w: 1200, h: 630 },

  // Social media
  { src: 'svg/social-fb-cover.svg', out: 'social/fb-cover.png', w: 820, h: 312 },
  { src: 'svg/social-twitter-header.svg', out: 'social/twitter-header.png', w: 1500, h: 500 },
  { src: 'svg/social-linkedin-banner.svg', out: 'social/linkedin-banner.png', w: 1584, h: 396 },
  { src: 'svg/social-instagram-post.svg', out: 'social/instagram-post.png', w: 1080, h: 1080 },
  { src: 'svg/social-instagram-story.svg', out: 'social/instagram-story.png', w: 1080, h: 1920 },

  // Email
  { src: 'svg/email-header.svg', out: 'email/email-header.png', w: 600, h: 120 },
  { src: 'svg/email-signature.svg', out: 'email/email-signature.png', w: 400, h: 100 },

  // Marketing
  { src: 'svg/marketing-feature-card.svg', out: 'marketing/feature-card.png', w: 1200, h: 675 },
  { src: 'svg/marketing-testimonial.svg', out: 'marketing/testimonial.png', w: 1080, h: 1080 },
  { src: 'svg/marketing-stats.svg', out: 'marketing/stats.png', w: 1200, h: 630 },
  { src: 'svg/marketing-promo.svg', out: 'marketing/promo.png', w: 1080, h: 1080 },

  // App Store
  { src: 'svg/appstore-feature.svg', out: 'app-store/appstore-feature.png', w: 1200, h: 630 },
  { src: 'svg/playstore-feature.svg', out: 'app-store/playstore-feature.png', w: 1024, h: 500 },

  // Print (high-res 300dpi)
  { src: 'svg/print-business-card-front.svg', out: 'print/bc-front.png', w: 1050, h: 600, density: 300 },
  { src: 'svg/print-business-card-back.svg', out: 'print/bc-back.png', w: 1050, h: 600, density: 300 },
  { src: 'svg/print-flyer-a5.svg', out: 'print/flyer-a5.png', w: 1748, h: 2480, density: 300 },
  { src: 'svg/print-rollup-banner.svg', out: 'print/rollup-banner.png', w: 1700, h: 4000, density: 200 },
];

async function run() {
  for (const t of tasks) {
    const dir = path.dirname(t.out);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
      let pipeline = sharp(t.src, { density: t.density || 96 });
      if (t.w && t.h) pipeline = pipeline.resize(t.w, t.h);
      await pipeline.png({ quality: 90, compressionLevel: 9 }).toFile(t.out);
      console.log(`✓ ${t.out} (${t.w}×${t.h})`);
    } catch (e) {
      console.error(`✗ ${t.out}: ${e.message}`);
    }
  }
  console.log('\n🎉 All marketing assets generated!');
}

run();
