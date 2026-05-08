# Nafaa — Pakistan's #1 Retail POS & Inventory Software

All-in-one POS, inventory, and accounting platform built for Pakistan's shopkeepers.

## Project Structure

This is a pnpm + Turborepo monorepo:

- apps/api — NestJS backend (port 4000)
- apps/web — React + Vite tenant dashboard (port 5173)
- apps/admin — Super admin panel (port 5174)
- apps/marketing — Next.js marketing site (port 3000)

## Tech Stack

- Backend: NestJS, Prisma, PostgreSQL, Redis, BullMQ
- Frontend: React 18, Vite, TanStack Query, Zustand, Tailwind CSS
- Marketing: Next.js 15, next-themes, next-intl
- Auth: JWT (access + refresh)
- Payments: Stripe, JazzCash, EasyPaisa, Manual Bank Transfer
- Email: Resend
- SMS: LifetimeSMS / Twilio
- Deployment: Railway (API) + Vercel (Web/Admin/Marketing)

## Local Setup

Prerequisites: Node.js 20+, pnpm 9+, PostgreSQL 16+, Redis 7+

Install:
    pnpm install

Database:
    cd apps/api
    pnpm prisma migrate dev
    pnpm create:super-admin

Run all (separate terminals):
    cd apps/api && pnpm dev
    cd apps/web && pnpm dev
    cd apps/admin && pnpm dev
    cd apps/marketing && pnpm dev

## URLs (Local)

- API Docs: http://localhost:4000/docs
- Marketing: http://localhost:3000
- Tenant Dashboard: http://localhost:5173
- Admin Panel: http://localhost:5174

## License

Proprietary — Nafaa Technologies (c) 2026

Made with love in Lahore, Pakistan
