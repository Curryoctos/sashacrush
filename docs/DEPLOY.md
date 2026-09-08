# SashaCrush — Deploy Checklist

## 1. Database migrations

```bash
# Local verify
npx supabase db reset

# Remote
supabase link --project-ref <your-project-ref>
supabase db push
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
| Stripe | `checkout.session.completed`, `payment_intent.succeeded` | `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` |
| Flutterwave | Transfer terminal status (**SUCCESSFUL** / **FAILED**) | `https://<project-ref>.supabase.co/functions/v1/flutterwave-webhook` |

Local Stripe testing: `stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook`

## 4. Frontend

Set production env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`) and build:

```bash
npm run build
```

Deploy `dist/` to your static host (Vercel, Netlify, etc.).

## 5. Post-deploy smoke test

1. Staff login → dashboard (MFA temporarily disabled)
2. Admin Users → create a seller (or staff) and confirm access email / Mailpit link
3. Seller magic link (provisioned active email only)
3. Send document for signing → seller `?sign=` link
4. Pay out seller (MoMo or manual) → Flutterwave transfer webhook / Confirm paid → receipt PDF + emails
   - Fund Flutterwave UGX balance before MoMo tests
   - Failed transfers mark the payout `failed` and free available-to-pay-out
5. Chat message → email alert + in-app notification bell

## 6. CI

GitHub Actions runs on push/PR to `main`, `features`, `develop`:

- **quality** — typecheck, lint, unit tests, build
- **integration** — Supabase local + RLS tests
- **e2e** — preview server + Puppeteer smoke tests
