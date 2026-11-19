#!/usr/bin/env bash
set -euo pipefail

FUNCTIONS=(
  notify-receipt-created
  notify-payment-confirmed
  notify-document-sent
  notify-document-signed
  notify-suggestion-status
  register-community-member
  notify-seller-assigned
  notify-seller-message
  notify-admin-message
  request-seller-magic-link
  admin-manage-users
  confirm-payment
  initiate-gateway-payment
  initiate-investment-checkout
  initiate-project-contribution
  stripe-webhook
  flutterwave-webhook
)

# Prefer local/npx CLI — global `supabase` is often missing from PATH.
if command -v supabase >/dev/null 2>&1; then
  SB=(supabase)
else
  SB=(npx supabase)
fi

echo "Deploying ${#FUNCTIONS[@]} edge functions…"

for fn in "${FUNCTIONS[@]}"; do
  echo "→ $fn"
  "${SB[@]}" functions deploy "$fn"
done

echo "Done. Configure secrets with:"
echo "  npx supabase secrets set RESEND_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... APP_URL=..."
echo "  npx supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=..."
echo "  npx supabase secrets set FLUTTERWAVE_SECRET_KEY=... FLUTTERWAVE_WEBHOOK_HASH=..."
