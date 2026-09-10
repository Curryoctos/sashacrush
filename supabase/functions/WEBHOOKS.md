# Supabase Database Webhooks — SashaCrush Notifications

This guide explains how to connect database events to Edge Functions that send email via Resend.

## Prerequisites

1. Deploy Edge Functions:
   ```bash
   supabase functions deploy notify-receipt-created
   supabase functions deploy notify-document-sent
   supabase functions deploy notify-document-signed
   supabase functions deploy notify-seller-assigned
   supabase functions deploy notify-seller-message
   supabase functions deploy notify-admin-message
   supabase functions deploy notify-payment-confirmed
   supabase functions deploy request-seller-magic-link
   supabase functions deploy admin-manage-users
   supabase functions deploy confirm-payment
   supabase functions deploy initiate-gateway-payment
   supabase functions deploy initiate-investment-checkout
   supabase functions deploy stripe-webhook
   supabase functions deploy flutterwave-webhook
   ```

   Or use `./scripts/deploy-functions.sh`.

2. Set Edge Function secrets (Dashboard → Project Settings → Edge Functions → Secrets, or CLI):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   supabase secrets set APP_URL=https://your-production-url.com
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   supabase secrets set FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
   supabase secrets set FLUTTERWAVE_WEBHOOK_HASH=your_secret_hash
   ```

   **Local development:** copy `supabase/functions/.env.example` → `supabase/functions/.env`, fill `STRIPE_SECRET_KEY` / `FLUTTERWAVE_SECRET_KEY`, then restart:

   ```bash
   cp supabase/functions/.env.example supabase/functions/.env
   # edit supabase/functions/.env
   npx supabase stop && npx supabase start
   ```

   Optional:
   ```bash
   supabase secrets set RESEND_FROM_EMAIL=notifications@sashacrush.com
   ```

3. **Never** expose `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in client code or `VITE_*` variables.

4. **Webhook authentication:** DB webhook functions (`notify-receipt-created`, `notify-payment-confirmed`) require `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`. When configuring webhooks in the Supabase Dashboard, use the **service role** key or the built-in Edge Function trigger (recommended).

5. **Client-invoked functions:** `notify-document-sent`, `notify-seller-assigned`, and `notify-admin-message` require admin/agent JWT. `notify-document-signed` and `notify-seller-message` require an authenticated user JWT (seller for message alerts). `admin-manage-users` requires an **admin** JWT (create / update / deactivate / send access). `request-seller-magic-link` is public (no JWT) but rate-limited and only sends links for active provisioned seller emails.

6. **Idempotency:** Webhook and several invoke functions record events in `notification_events` to prevent duplicate emails on retries.

7. **Rate limiting:** All notification edge functions use the `rate_limit_events` table to cap abuse.

---

## Resend free tier monitoring

Resend's free tier allows **3,000 emails/month**. Each webhook trigger sends one email.

- Monitor usage in the [Resend dashboard](https://resend.com/emails).
- Add a calendar reminder to check volume weekly during active deal periods.
- If you approach the limit, upgrade the Resend plan or batch non-urgent notifications.

---

## Webhook 1 — Receipt created

**Trigger:** `receipts` table → **INSERT**

**Edge Function URL:**
```
https://<project-ref>.supabase.co/functions/v1/notify-receipt-created
```

**Headers:**
| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <SUPABASE_ANON_KEY or service role>` |

**Payload format** (Supabase Database Webhook):

```json
{
  "type": "INSERT",
  "table": "receipts",
  "schema": "public",
  "record": {
    "id": "uuid",
    "payment_id": "uuid",
    "seller_id": "uuid",
    "receipt_number": "RCP-2026-0001",
    "pdf_path": "receipts/land-id/receipt.pdf",
    "created_at": "2026-06-30T12:00:00.000Z"
  },
  "old_record": null
}
```

**Required fields in `record`:** `id`, `payment_id`, `seller_id`, `receipt_number`

**Result:** Sends `newReceiptEmail` to the seller's email address.

---

## Webhook 2 — Payment confirmed

**Trigger:** `payments` table → **UPDATE**

**Edge Function URL:**
```
https://<project-ref>.supabase.co/functions/v1/notify-payment-confirmed
```

**Filter (recommended):** Only fire when `status` changes to `confirmed`.

In Supabase Dashboard → Database → Webhooks, configure the UPDATE webhook and ensure your application sets `payments.status = 'confirmed'` when a payment is verified.

**Payload format:**

```json
{
  "type": "UPDATE",
  "table": "payments",
  "schema": "public",
  "record": {
    "id": "uuid",
    "land_id": "uuid",
    "amount_usd": 50000,
    "amount_ugx": 185000000,
    "method": "manual",
    "rate_used": 3700,
    "stripe_payment_intent_id": null,
    "status": "confirmed",
    "created_at": "2026-06-30T12:00:00.000Z"
  },
  "old_record": {
    "id": "uuid",
    "land_id": "uuid",
    "amount_usd": 50000,
    "amount_ugx": 185000000,
    "method": "manual",
    "rate_used": 3700,
    "stripe_payment_intent_id": null,
    "status": "pending",
    "created_at": "2026-06-30T12:00:00.000Z"
  }
}
```

**Required fields in `record`:** `id`, `land_id`, `amount_usd`, `status`

The function skips sending if `record.status !== 'confirmed'` or if `old_record.status` was already `confirmed`.

**Result:** Sends `paymentConfirmedEmail` to the first admin user.

---

## Direct invocation — Document sent for signing

**Not a DB webhook.** Called from the client via `supabase.functions.invoke('notify-document-sent', ...)`.

**Edge Function URL:**
```
https://<project-ref>.supabase.co/functions/v1/notify-document-sent
```

**Payload format:**

```json
{
  "documentId": "uuid",
  "sellerId": "uuid"
}
```

**Result:** Sends `documentSentEmail` to the seller with signing URL:
```
{APP_URL}/seller/documents?sign={documentId}
```

---

## Direct invocation — Seller magic link

**Not a DB webhook.** Called from the login page via `supabase.functions.invoke('request-seller-magic-link', ...)`.

**Edge Function URL:**
```
https://<project-ref>.supabase.co/functions/v1/request-seller-magic-link
```

**Payload format:**

```json
{
  "email": "seller@sashacrush.com"
}
```

**Behavior:**
- Always returns `{ success: true }` (anti-enumeration).
- Only sends email when the address belongs to a user with `role = 'seller'`.
- Rate limited per email address.

**Result:** Sends `sellerMagicLinkEmail` with a one-time Supabase magic link.

---

## Direct invocation — Admin message to seller

**Not a DB webhook.** Called from the admin chat UI via `supabase.functions.invoke('notify-admin-message', ...)`.

**Edge Function URL:**
```
https://<project-ref>.supabase.co/functions/v1/notify-admin-message
```

**Payload format:**

```json
{
  "messageId": "uuid",
  "landId": "uuid"
}
```

**Behavior:** Requires admin/agent JWT. Sends `adminMessageEmail` to the seller assigned to the land record.

---

## Payment gateways — Stripe & Flutterwave

### Confirm payment (staff)

**Not a DB webhook.** Admin/agent confirms an **offline** payout (manual / crypto) and issues the receipt PDF server-side.

Flutterwave and Stripe payments **cannot** be staff-confirmed — they confirm only via provider webhook after verified success.

```
POST /functions/v1/confirm-payment
{ "paymentId": "uuid" }
```

### Initiate gateway payout (staff)

```
POST /functions/v1/initiate-gateway-payment
{ "paymentId": "uuid" }
```

Creates a **Flutterwave Transfer** (company → seller MoMo) for a pending `flutterwave`
payment and returns `{ reference, transferId, status, mode: "payout" }`.
No hosted checkout URL — funds leave the Flutterwave balance.

Idempotency:
- Reserves a deterministic `flutterwave_tx_ref` (`sc-payout-{paymentId}`) **before** calling Flutterwave
- Retries reuse the same reference (looks up existing transfer; never creates a second payout)

Seller Stripe Checkout collect-in is retired (seller payouts use Flutterwave).

### Initiate investment Checkout (executive)

```
POST /functions/v1/initiate-investment-checkout
{ "amountUsd": 1000, "notes": "optional" }
```

Creates a pending `investments` row (`method=stripe`) and a Stripe Checkout Session to **fund company capital**.
Returns `{ checkoutUrl, investmentId, reference, sessionId }`.

Requires: executive JWT, `STRIPE_SECRET_KEY`, `APP_URL`.

### Stripe webhook

```
POST /functions/v1/stripe-webhook
```

- **Investments:** `metadata.investment_id` → confirm capital contribution (no seller receipt)
- **Legacy payments:** `metadata.payment_id` → confirm payment + receipt
- `verify_jwt = false` (authenticated via `Stripe-Signature` + `STRIPE_WEBHOOK_SECRET`)

Local forward:

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

### Flutterwave webhook

```
POST /functions/v1/flutterwave-webhook
```

- `verify_jwt = false` (authenticated via `verif-hash` + `FLUTTERWAVE_WEBHOOK_HASH`)
- Verifies via `GET /v3/transfers/:id` (authoritative status)
- **SUCCESSFUL** → confirm payment + issue seller receipt
- **FAILED** / cancelled → mark payment `status=failed` (frees available-to-pay-out)
- Releases the webhook claim on processing errors so Flutterwave can safely retry
- Ensure the Flutterwave dashboard webhook includes transfer events (success and failure)
---

## Dashboard setup steps

1. Open **Supabase Dashboard** → your project → **Database** → **Webhooks**.
2. Click **Create a new webhook**.
3. For receipts:
   - Name: `notify-receipt-created`
   - Table: `receipts`
   - Events: **Insert**
   - Type: **Supabase Edge Function** (or HTTP Request to function URL)
   - Function: `notify-receipt-created`
4. For payments:
   - Name: `notify-payment-confirmed`
   - Table: `payments`
   - Events: **Update**
   - Type: **Supabase Edge Function**
   - Function: `notify-payment-confirmed`
5. Save each webhook and test with a manual insert/update in the SQL editor.
6. Check **Edge Functions → Logs** for success or error output.

---

## Local development

```bash
# Set secrets for local functions
supabase secrets set RESEND_API_KEY=re_xxxxxxxx --env-file supabase/.env.local

# Serve functions locally
supabase functions serve --env-file supabase/.env.local
```

Create `supabase/.env.local` (gitignored):

```
RESEND_API_KEY=re_xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJ...
APP_URL=http://localhost:5173
```

Test with curl:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/notify-document-sent' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"documentId":"<uuid>","sellerId":"<uuid>"}'
```
