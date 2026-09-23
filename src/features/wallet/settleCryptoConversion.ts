import { confirmPaymentWithReceipt } from '@/features/payments/confirmPayment'
import { cryptoTypeForDb, sendTreasuryTransfer } from '@/features/wallet/sendTransfer'
import type { CryptoAsset } from '@/features/wallet/constants'
import { supabase } from '@/lib/supabase'
import type { BrowserProvider } from 'ethers'

export interface SettleCryptoConversionInput {
  provider: BrowserProvider
  userId: string
  landId: string
  asset: CryptoAsset
  cryptoAmount: number
  amountUsd: number
  amountUgx: number
  /** USD price of 1 unit of asset at lock time. */
  cryptoUsdRate: number
  /** UGX per 1 USD at lock time. */
  usdToUgxRate: number
  treasuryAddress: string
  chainId: number
}

export interface SettleCryptoConversionResult {
  paymentId: string
  txHash: string
  receiptNumber: string
}

/**
 * UC-03 / C-09: wallet transfer → payment + transactions_crypto → confirm + receipt.
 * Private keys never leave the device.
 */
export async function settleCryptoConversion(
  input: SettleCryptoConversionInput,
): Promise<SettleCryptoConversionResult> {
  const { txHash, fromAddress } = await sendTreasuryTransfer({
    provider: input.provider,
    asset: input.asset,
    amount: input.cryptoAmount,
    treasuryAddress: input.treasuryAddress,
    expectedChainId: input.chainId,
  })

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      land_id: input.landId,
      amount_usd: input.amountUsd,
      amount_ugx: input.amountUgx,
      rate_used: input.usdToUgxRate,
      method: 'crypto',
      manual_reference: txHash,
      status: 'pending_manual',
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    throw new Error(
      paymentError?.message ??
        `On-chain transfer succeeded (${txHash}) but payment record failed. Contact admin with this hash.`,
    )
  }

  const { error: cryptoError } = await supabase.from('transactions_crypto').insert({
    payment_id: payment.id,
    wallet_address: fromAddress,
    crypto_type: cryptoTypeForDb(input.asset),
    crypto_amount: input.cryptoAmount,
    usd_rate: input.cryptoUsdRate,
    ugx_rate: input.usdToUgxRate,
    tx_hash: txHash,
    chain_id: input.chainId,
    status: 'submitted',
    created_by: input.userId,
  })

  if (cryptoError) {
    throw new Error(
      cryptoError.message ||
        `Payment ${payment.id} created but crypto ledger insert failed. Tx: ${txHash}`,
    )
  }

  const receiptNumber = await confirmPaymentWithReceipt(payment.id)

  await supabase
    .from('transactions_crypto')
    .update({ status: 'confirmed' })
    .eq('tx_hash', txHash)

  return {
    paymentId: payment.id,
    txHash,
    receiptNumber,
  }
}
