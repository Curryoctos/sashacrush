#!/usr/bin/env bash
set -euo pipefail

FUNCTIONS=(
  notify-receipt-created
  notify-payment-confirmed
  notify-document-sent
  notify-document-signed
  notify-seller-assigned
  notify-seller-message
  notify-admin-message
  request-seller-magic-link
  admin-manage-users
  confirm-payment
  initiate-gateway-payment
  stripe-webhook
  flutterwave-webhook
)

echo "Deploying ${#FUNCTIONS[@]} edge functions…"

for fn in "${FUNCTIONS[@]}"; do
  echo "→ $fn"
  supabase functions deploy "$fn"
done

echo "Done. Configure secrets with:"
echo "  supabase secrets set RESEND_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... APP_URL=..."
echo "  supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=..."
echo "  supabase secrets set FLUTTERWAVE_SECRET_KEY=... FLUTTERWAVE_WEBHOOK_HASH=..."
