import { formatDisplayDate } from '@/lib/format'
import { round2 } from '@/lib/format'
import { worst } from '@/services/query'
import type { CurrencyCode, GlobalFilters, Ledger, StatementLine, StatementModel, VerifyStatus } from '@/types'

interface Event {
  id: string
  date: string
  description: string
  debit: number
  credit: number
  verify: VerifyStatus
}

export function buildStatement(
  ledger: Ledger,
  party: string,
  side: 'customer' | 'supplier',
  currency: CurrencyCode,
  filters: GlobalFilters,
): StatementModel {
  const events: Event[] = []
  if (side === 'customer') {
    for (const invoice of ledger.invoices) {
      if (invoice.customer !== party || invoice.currency !== currency || invoice.voided) continue
      events.push({ id: invoice.id, date: invoice.issueDate, description: `Invoice ${invoice.number}`, debit: invoice.gross, credit: 0, verify: invoice.verify })
      if (invoice.creditNote > 0) {
        events.push({ id: `${invoice.id}-cn`, date: invoice.issueDate, description: `Credit note ${invoice.creditNoteRef || invoice.id}`, debit: 0, credit: invoice.creditNote, verify: invoice.verify })
      }
    }
    for (const receipt of ledger.receipts) {
      if (receipt.currency !== currency) continue
      for (const allocation of receipt.allocations) {
        if (allocation.targetType !== 'invoice') continue
        const invoice = ledger.invoices.find((item) => item.id === allocation.targetId)
        if (!invoice || invoice.customer !== party) continue
        events.push({ id: `${receipt.id}-${allocation.targetId}`, date: receipt.date, description: `Receipt ${receipt.bankRef}`, debit: 0, credit: allocation.amount, verify: receipt.verify })
      }
    }
  } else {
    for (const invoice of ledger.creditorInvoices) {
      if (invoice.supplier !== party || invoice.currency !== currency || invoice.exclude) continue
      events.push({ id: invoice.id, date: invoice.invoiceDate, description: `Invoice ${invoice.reference}`, debit: invoice.amount, credit: 0, verify: invoice.verify })
      if (invoice.creditNotes > 0) events.push({ id: `${invoice.id}-cn`, date: invoice.invoiceDate, description: 'Credit note', debit: 0, credit: invoice.creditNotes, verify: invoice.verify })
    }
    for (const payment of ledger.supplierPayments) {
      if (payment.currency !== currency) continue
      for (const allocation of payment.allocations) {
        const invoice = ledger.creditorInvoices.find((item) => item.id === allocation.invoiceId)
        if (!invoice || invoice.supplier !== party) continue
        events.push({ id: `${payment.id}-${allocation.invoiceId}`, date: payment.date, description: `Payment ${payment.bankRef}`, debit: 0, credit: allocation.amount, verify: payment.verify })
      }
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const prior = events.filter((event) => event.date < filters.from)
  const current = events.filter((event) => event.date >= filters.from && event.date <= filters.to)
  const opening = round2(prior.reduce((sum, event) => sum + event.debit - event.credit, 0))
  let balance = opening
  const lines: StatementLine[] = current.map((event) => {
    balance = round2(balance + event.debit - event.credit)
    return { id: event.id, date: event.date, description: event.description, debit: event.debit, credit: event.credit, balance, verify: event.verify }
  })
  return {
    party,
    currency,
    opening,
    openingVerify: worst(prior.map((event) => event.verify)),
    lines,
    closing: balance,
    note: `Opening before ${formatDisplayDate(filters.from)}.`,
  }
}

export function statementParties(ledger: Ledger, side: 'customer' | 'supplier') {
  if (side === 'customer') return ledger.customers.map((customer) => customer.name)
  return [...new Set(ledger.creditorInvoices.filter((invoice) => !invoice.exclude && invoice.currency).map((invoice) => invoice.supplier))]
}
