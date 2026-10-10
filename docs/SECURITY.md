# SashaCrush — Security (C-30)

Production hardening checklist before go-live. Business rules BR-01…BR-08 are absolute and enforced in DB / edge / CI where automated.

## Business rules map

| Rule | Enforcement | Automated check |
|------|-------------|-----------------|
| **BR-01** Seller never sees payment / wallet / capital / ops data | RLS on sensitive tables | `seller-payments-rls`, `seller-isolation-rls`, `seller-land-records-rls` |
| **BR-02** Every confirmed payment → unique receipt PDF | Edge confirm + webhooks | Unit shape check + edge receipt allocation |
| **BR-03** Outstanding balance is owner/admin view only | Seller cannot SELECT payments | Seller payments RLS = `[]` |
| **BR-04** Signed docs immutable | `signature_hash` + storage policies block overwrite/delete when `status = 'signed'` | `business-rules` SHA-256 + migration `20261001000000_security_hardening.sql` |
| **BR-05** Crypto keys never on servers | MetaMask / WalletConnect client-only | `business-rules` static scan of `src/features/wallet` |
| **BR-06** Live FX/crypto rates at confirm | Fetched at conversion/confirm; `rate_used` stored | Covered by payment/wallet flows |
| **BR-07** Photo GPS not editable after upload | Trigger `photos_gps_immutable` | Migration + integration GPS update must fail |
| **BR-08** Sprint approval | ClickUp process (outside repo) | Manual |

## OWASP Top 10 (scoped)

| Item | Status / notes |
|------|----------------|
| A01 Broken access control | RLS + seller isolation suite; staff MFA gate restored |
| A02 Cryptographic failures | Signature SHA-256; no server-held crypto private keys |
| A03 Injection | Supabase client parameterized; edge input validation |
| A04 Insecure design | Admin-only payouts (`money_hardening`); capital shortfall hard-block |
| A05 Security misconfiguration | Webhook `verify_jwt=false` only where signature-verified; secrets via Supabase/Vercel env |
| A06 Vulnerable components | CI `npm audit --omit=dev --audit-level=critical`; zero critical required |
| A07 Identification / auth failures | Staff TOTP MFA; seller magic-link rate limits |
| A08 Software / data integrity | Signed doc hash + storage write-once after sign |
| A09 Logging / monitoring | `audit_log` (admin/agent read); gateway webhook event table |
| A10 SSRF | Outbound only to Stripe / Flutterwave / rate APIs with fixed hosts |

Community board tables are intentionally public-read for registered community UX — document accepted scope.

## Upload MIME (server)

| Bucket / table | Gate |
|----------------|------|
| `documents`, `photos`, `media`, `cargo`, `receipts` | Storage `allowed_mime_types` |
| `cargo_documents.mime_type` | DB CHECK allowlist |
| Signatures (client) | PNG/JPEG only before PDF embed |
| Photos (client) | PNG/JPEG/WebP + compress &lt; 500KB |

## RLS role×table (sensitive)

| Table | Admin | Agent | Executive | Seller |
|-------|-------|-------|-----------|--------|
| payments | R/W | R | — | — |
| investments | R/W | own R/W (Stripe rules) | — | — |
| transactions_crypto | R/W | — | — | — |
| audit_log | R | R | — | — |
| media_videos | R/W | — | R | — |
| cargo_* | R/W | assigned R (+ uploads) | — | — |
| suggestions | R/W | R + insert | R | — |
| land_records | R/W | R/W | via RPC | own only |
| documents | R/W (not signed overwrite) | R/W (not signed) | assigned | assigned |
| photos | R/W (GPS immutable) | R/W (GPS immutable) | R | own land R (+ camera insert) |

## CI gates

- **secret-scan** — gitleaks on every push/PR
- **quality** — typecheck, lint, unit (includes `business-rules`), build, `npm audit --omit=dev --audit-level=critical`
- **integration** — seller RLS + isolation suite against local Supabase

## Go-live gates

1. Apply migrations through `20261001000000_security_hardening.sql`
2. Redeploy payment edge functions after money hardening
3. Staff MFA enrollment for all admin/agent/executive accounts
4. Enable GitHub Secret Scanning + Push Protection on the remote
5. Confirm `npm audit --omit=dev` reports **0 critical**
6. UAT: seller JWT cannot see payments / capital / cargo / media vault
