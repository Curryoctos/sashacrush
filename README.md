# SashaCrush

Cross-border land transactions, payments, and collaboration platform — built under **CurryOctos**.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 8 + TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Data fetching | TanStack React Query |
| Backend (planned) | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Testing | Vitest + Testing Library |

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |

## Project structure

```
src/
├── components/     # Shared UI and layout
│   ├── auth/       # ProtectedRoute, future auth forms
│   └── layout/     # AppShell, PortalShell
├── contexts/       # React context providers (Auth)
├── lib/            # Utilities (env, future Supabase client)
├── pages/          # Route-level pages by portal
│   ├── admin/
│   ├── agent/
│   ├── executive/
│   ├── seller/
│   └── community/
├── routes/         # React Router configuration
├── types/          # Shared TypeScript types
└── test/           # Vitest setup
```

## Role-based routing

| Role | Namespace | Access |
|------|-----------|--------|
| Admin / Owner | `/admin/*` | Full platform |
| Executive | `/executive/*` | Analytics, documents, executive channel |
| Agent | `/agent/*` | Maps, camera, receipts, suggestions |
| Seller | `/seller/*` | Isolated portal — land, chat, receipts, photos |
| Community | `/community/*` | Public community board |

Protected routes require Supabase Auth (C-01). Portal shells are scaffolded; auth integration is the next step.

## Environment variables

Copy `.env.example` to `.env.local` and fill in values when Supabase is configured:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (RLS-enforced)
- `VITE_APP_URL` — App base URL for deep links

## Development plan

This codebase follows the SashaCrush Master Software Development Plan (MSDP) v1.0 — 6-month delivery from June to December 2026. Month 1 focus: Auth & RBAC, Seller Portal, Land Records, Chat, and Supabase setup.

## License

Proprietary — CurryOctos. Confidential.
