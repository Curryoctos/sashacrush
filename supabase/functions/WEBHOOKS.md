# Supabase Database Webhooks — SashaCrush Notifications

This guide explains how to connect database events to Edge Functions that send email via Resend.

## Prerequisites

1. Deploy Edge Functions:
   ```bash
   supabase functions deploy notify-receipt-created
   supabase functions deploy notify-document-sent
   supabase functions deploy notify-payment-confirmed
   ```

2. Set Edge Function secrets (Dashboard → Project Settings → Edge Functions → Secrets, or CLI):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   supabase secrets set APP_URL=https://your-production-url.com
   ```

   Optional:
   ```bash
   supabase secrets set RESEND_FROM_EMAIL=notifications@sashacrush.com
   ```

3. **Never** expose `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in client code or `VITE_*` variables.

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
