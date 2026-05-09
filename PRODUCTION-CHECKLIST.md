# Nafaa Production Deployment Checklist

## Backend (apps/api)
- [ ] Deploy to Railway / Render / Fly.io / DigitalOcean
- [ ] PostgreSQL managed DB (Neon, Supabase, Railway)
- [ ] Set all .env vars (use `.env.production.example` as template)
- [ ] Run `pnpm prisma migrate deploy`
- [ ] Run `node scripts/create-super-admin.js`
- [ ] Domain → api.nafaa.pk (with HTTPS via provider)
- [ ] Verify CORS allows app.nafaa.pk + admin.nafaa.pk + nafaa.pk

## Marketing (apps/marketing)
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Domain → nafaa.pk
- [ ] Set `NEXT_PUBLIC_API_URL=https://api.nafaa.pk/api`
- [ ] Set `NEXT_PUBLIC_APP_URL=https://app.nafaa.pk`

## Tenant Web App (apps/web)
- [ ] Deploy to Vercel/Netlify
- [ ] Domain → app.nafaa.pk
- [ ] Set `VITE_API_URL=https://api.nafaa.pk/api`

## Admin Panel (apps/admin)
- [ ] Deploy to Vercel/Netlify
- [ ] Domain → admin.nafaa.pk
- [ ] Set `VITE_API_URL=https://api.nafaa.pk/api`
- [ ] Restrict access (Cloudflare Access / IP whitelist optional)

## Mobile App (apps/mobile)
- [ ] `eas build --profile production --platform android`
- [ ] `eas build --profile production --platform ios`
- [ ] `eas submit -p android` (Google Play)
- [ ] `eas submit -p ios` (App Store)
- [ ] Production URL `https://api.nafaa.pk/api` baked into build

## DNS
- [ ] nafaa.pk → marketing
- [ ] www.nafaa.pk → marketing
- [ ] app.nafaa.pk → web
- [ ] admin.nafaa.pk → admin
- [ ] api.nafaa.pk → backend
- [ ] All HTTPS via Cloudflare or provider

## Post-launch
- [ ] Backups — daily automated DB snapshots
- [ ] Monitoring — Sentry for errors, UptimeRobot for uptime
- [ ] Analytics — Plausible / Vercel Analytics
- [ ] Logs — provider logs + log retention 30+ days
