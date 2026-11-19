# SashaCrush — Deploy Checklist

## 1. Database migrations

```bash
# Local verify
npx supabase db reset

# Remote (production project for www.sasha-union.com)
npx supabase link --project-ref hwfpriemphbenuosluuc
npx supabase db push
```

## 2. Edge Functions

```bash
chmod +x scripts/deploy-functions.sh
./scripts/deploy-functions.sh
```

Required secrets (Dashboard → Edge Functions → Secrets, or CLI):

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
supabase secrets set APP_URL=https://your-production-url.com
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
supabase secrets set FLUTTERWAVE_WEBHOOK_HASH=<dashboard-secret-hash>
```

Optional: `RESEND_FROM_EMAIL=notifications@sashacrush.com`

## 3. Database webhooks

Configure in Supabase Dashboard → Database → Webhooks:

| Name | Table | Event | Function |
|------|-------|-------|----------|
| notify-receipt-created | `receipts` | INSERT | `notify-receipt-created` |
| notify-payment-confirmed | `payments` | UPDATE | `notify-payment-confirmed` |

Use **Supabase Edge Function** trigger type. Webhook functions require the service role bearer — see `supabase/functions/WEBHOOKS.md`.

## 3b. Payment gateway webhooks

Point provider dashboards at your edge functions (JWT verification disabled for these):

| Provider | Event | URL |
|----------|-------|-----|
| Stripe | `checkout.session.completed`, `payment_intent.succeeded` | `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` (capital funding + legacy) |
| Flutterwave | Transfer terminal status (**SUCCESSFUL** / **FAILED**) | `https://<project-ref>.supabase.co/functions/v1/flutterwave-webhook` |

Stripe is used for **agent capital funding** (`initiate-investment-checkout` — deal-scoped investments into the company pool). Seller MoMo payouts use Flutterwave.

Local Stripe testing: `stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook`

## 4. Frontend

Set production env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`) and build:

```bash
npm run build
```

Deploy `dist/` to your static host (Vercel, Netlify, etc.).

### GitHub Actions secrets (production-build job)

CI **tests** always use local Supabase (`127.0.0.1:54321` + demo anon key).  
Do **not** put live Supabase URLs in `.github/workflows/ci.yml`.

For the `production-build` job (runs on push to `main` / `map`), add these under  
**Repo → Settings → Secrets and variables → Actions**:

| Secret | Example |
|--------|---------|
| `VITE_SUPABASE_URL` | `https://hwfpriemphbenuosluuc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon/public key from that project (Dashboard → Settings → API) |
| `VITE_APP_URL` | `https://www.sasha-union.com` |

Optional: `VITE_STRIPE_PUBLIC_KEY`, `VITE_FLUTTERWAVE_PUBLIC_KEY`,  
`VITE_WALLETCONNECT_PROJECT_ID`, `VITE_CRYPTO_TREASURY_ADDRESS`.

If you deploy with Vercel/Netlify, set the same `VITE_*` values in that host’s env — the host build is what users get.

## 5. Post-deploy smoke test

1. Staff login → MFA setup/challenge (TOTP) → dashboard
2. Admin Users → create a seller (or staff) and confirm access email / Mailpit link
3. Seller magic link (provisioned active email only)
3. Send document for signing → seller `?sign=` link
4. Pay out seller (MoMo or manual) → Flutterwave transfer webhook / Confirm paid → receipt PDF + emails
   - Fund Flutterwave UGX balance before MoMo tests
   - Failed transfers mark the payout `failed` and free available-to-pay-out
5. Chat message → email alert + in-app notification bell (DB trigger + optional notify-* email)
6. Public project contribute → Stripe Checkout (card) or pending reference (wire/MoMo/crypto); webhook confirms card → `funding_raised_usd` updates
7. Community register at `/community/register` (edge fn `register-community-member`, `verify_jwt=false`)

## 6. CI

GitHub Actions runs on push/PR to `main`, `features`, `develop`, `map`:

- **secret-scan** — gitleaks (C-30)
- **quality** — typecheck, lint, unit tests, `npm audit --omit=dev --audit-level=critical`, build (local placeholders)
- **integration** — Supabase local + seller RLS / isolation / GPS immutability
- **e2e** — preview server + Puppeteer smoke tests
- **lighthouse** — C-29 mobile performance gates
- **production-build** — push to `main`/`map` only; builds with live `VITE_*` secrets and uploads `dist` artifact

## 7. Security (C-30)

See [`docs/SECURITY.md`](./SECURITY.md) for OWASP checklist, RLS matrix, MIME gates, and go-live MFA / secret-scanning requirements.
