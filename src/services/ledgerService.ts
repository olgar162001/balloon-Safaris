import type { CreditorInvoice, EntityPatch, Ledger, SupplierPayment } from '@/types'

export interface SessionLedger {
  patches: Record<string, EntityPatch>
  addedInvoices: CreditorInvoice[]
  addedPayments: SupplierPayment[]
  allocationOverrides: Record<string, { invoiceId: string; amount: number }[]>
}

function withPatch<T extends { id: string; pipeline: Ledger['vouchers'][number]['pipeline']; documents: string[]; notes: string }>(
  items: T[],
  patches: Record<string, EntityPatch>,
) {
  return items.map((item) => {
    const patch = patches[item.id]
    if (!patch) return item
    return {
      ...item,
      pipeline: patch.pipeline ?? item.pipeline,
      documents: patch.documentsAdded?.length ? [...item.documents, ...patch.documentsAdded] : item.documents,
      notes: patch.note ? `${item.notes}\n${patch.note}`.trim() : item.notes,
    }
  })
}

export function mergeLedger(base: Ledger, session: SessionLedger): Ledger {
  const payments = withPatch(base.supplierPayments, session.patches)
    .map((payment) => {
      const allocations = session.allocationOverrides[payment.id]
      if (!allocations) return payment
      return { ...payment, allocations, unmatched: allocations.length === 0 }
    })
    .concat(session.addedPayments)
  const invoices = withPatch(base.creditorInvoices, session.patches).concat(session.addedInvoices)
  return {
    ...base,
    vouchers: withPatch(base.vouchers, session.patches),
    pd: withPatch(base.pd, session.patches),
    invoices: withPatch(base.invoices, session.patches),
    receipts: withPatch(base.receipts, session.patches),
    creditorInvoices: invoices,
    supplierPayments: payments,
    payroll: withPatch(base.payroll, session.patches),
    statutory: withPatch(base.statutory, session.patches),
    hqWeeks: withPatch(base.hqWeeks, session.patches),
    maraDays: withPatch(base.maraDays, session.patches),
    landing: withPatch(base.landing, session.patches),
    allocationMonths: withPatch(base.allocationMonths, session.patches),
    suppliers: [...new Set([...base.suppliers, ...session.addedInvoices.map((invoice) => invoice.supplier)])],
  }
}
