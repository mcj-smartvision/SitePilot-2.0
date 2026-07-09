/**
 * Compatibility re-exports — prefer `@/utils/finance/payables`.
 * vendor_bills is the storage table for contractor payables.
 */
export {
  fetchVendorBills,
  fetchContractorPayables,
  buildVendorBillKpis,
  getUnpaidVendorBills,
  buildPayableSummary,
  createContractorPayable,
  recordPayablePayment,
  cancelContractorPayable,
  ensurePayableForFinalizedExpense,
} from '@/utils/finance/payables'
