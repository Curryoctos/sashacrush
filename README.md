# SashaCrush

Cross-border land transactions, payments, and collaboration platform — built under **CurryOctos**.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 8 + TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Data fetching | TanStack React Query |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) |
| Email | Resend (via Edge Functions) |
| PDF | pdf-lib (receipts, document signing) |
| Testing | Vitest + Testing Library |

## Getting started

```bash
npm install
cp .env.example .env.local
npx supabase start
npx supabase db reset   # applies migrations + seed
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Local dev accounts

| Role | Email | Sign-in |
|------|-------|---------|
| Admin | `admin@sashacrush.com` | Password: `changeme-local-only` |
| Agent | `agent@sashacrush.com` | Password: `changeme-local-only` |
| Executive | `executive@sashacrush.com` | Password: `changeme-local-only` |
| Seller | `seller@sashacrush.com` | Magic link (check Mailpit at http://127.0.0.1:54324) |

Staff accounts require TOTP enrollment and verification on each login (MFA).

Local Supabase: TOTP is enabled in `supabase/config.toml` (`auth.mfa.totp.enroll_enabled`). After changing it, restart with `npx supabase stop && npx supabase start`.

Hosted Supabase: Dashboard → Authentication → MFA → enable **Authenticator app (TOTP)**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Run all Vitest tests |
| `npm run test:unit` | Unit tests only (excludes integration + e2e) |
| `npm run test:integration` | RLS integration tests (requires local Supabase) |
| `npm run test:e2e` | Puppeteer smoke tests (requires preview server) |
| `npm run deploy:functions` | Deploy all Edge Functions to linked project |

## Project structure

```
src/
├── components/       # Shared UI, auth gates, portal layouts
├── contexts/         # Auth provider
├── features/         # Domain modules (chat, documents, payments, deals, …)
├── lib/              # Utilities, portal nav, Supabase client
├── pages/            # Route-level pages by portal
│   ├── admin/
│   ├── agent/
│   ├── executive/
│   ├── seller/
│   └── staff/        # MFA setup & challenge
├── routes/           # React Router configuration
└── types/            # Shared TypeScript types

supabase/
├── migrations/       # Database schema & RLS
├── functions/        # Edge Functions (notifications, magic link)
└── seed.sql          # Local dev seed data
```

## Role-based routing

| Role | Namespace | Access |
|------|-----------|--------|
| Admin | `/admin/*` | Full platform — land records, documents, payments, chat, audit log, deal cockpit |
| Agent | `/agent/*` | Read-only land/deal view, field photo upload |
| Executive | `/executive/*` | Deal portfolio (aggregated, no payment amounts), executive chat |
| Seller | `/seller/*` | Isolated portal — land, chat, documents, receipts, photos |

Protected routes require Supabase Auth with role-based RLS.

## Key features

- **Land records** — Admin CRUD with seller assignment and deal cockpit (`/admin/deals/:landId`)
- **Documents** — Upload, send for signing, seller e-sign with PDF append, in-browser preview
- **Payments** — Admin records pending payments, confirms to generate PDF receipt + email webhooks
- **Chat** — Realtime seller/admin messaging with auto-replies and email alerts
- **Notifications** — Resend emails via Edge Functions; see `supabase/functions/WEBHOOKS.md`
- **MFA** — Staff TOTP enrollment + per-login challenge
- **Audit log** — Automatic trail for land, payment, and document changes

## Environment variables

Copy `.env.example` to `.env.local`:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (RLS-enforced)
- `VITE_APP_URL` — App base URL for deep links

Edge Function secrets (`RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`) are configured in Supabase, not in client env.

See [docs/DEPLOY.md](docs/DEPLOY.md) for the full production checklist and [supabase/functions/WEBHOOKS.md](supabase/functions/WEBHOOKS.md) for email webhook setup.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR:

1. **quality** — typecheck, lint, unit tests, build
2. **integration** — Supabase local + RLS tests
3. **e2e** — preview server + Puppeteer smoke tests

## License

Proprietary — CurryOctos. Confidential.
