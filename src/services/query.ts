import { pipelineLabel } from '@/access'
import { emptyDrill, inRange, toSearch } from '@/lib/dates'
import { round2 } from '@/lib/format'
import type {
  AppSettings,
  Branch,
  CreditorInvoice,
  CurrencyCode,
  DebtorInvoice,
  DrawerDetail,
  Drill,
  GlobalFilters,
  LedgerRow,
  MoneyCurrency,
  PdTxn,
  PipelineStage,
  Receipt,
  Settle,
  StatusFilter,
  SupplierPayment,
  VerifyStatus,
  Voucher,
} from '@/types'

const RANK: Record<VerifyStatus, number> = {
  verified: 0,
  'source-reported': 1,
  estimated: 2,
  unreconciled: 3,
}

export function worst(list: VerifyStatus[]): VerifyStatus {
  if (!list.length) return 'estimated'
  return list.reduce((best, next) => (RANK[best] >= RANK[next] ? best : next))
}

export function groupLabel(id: string, pdLabel: string) {
  const labels: Record<string, string> = {
    'advance-voucher': 'Advance vouchers',
    'pd-mara': pdLabel || 'PD (Mara)',
    'paid-later': 'Paid later',
    operating: 'Operating',
    payroll: 'Payroll',
    statutory: 'Statutory',
    'hq-petty': 'HQ petty cash',
    'mara-petty': 'Mara petty cash',
    'cash-in': 'Cash in',
    'cash-out': 'Cash out',
  }
  return labels[id] ?? id
}

export function stageOf(date: string, pipeline: PipelineStage, settings: AppSettings): PipelineStage {
  if (settings.closedPeriods.includes(date.slice(0, 7))) return 'close'
  return pipeline
}

export function voucherEarned(voucher: Voucher, policy: AppSettings['recognition']) {
  if (voucher.flightStatus === 'cancelled') return { amount: 0, date: null as string | null }
  if (policy === 'on-payment') {
    const net = round2(voucher.received - voucher.refund)
    if (net <= 0 || !voucher.receiptDate) return { amount: 0, date: null }
    return { amount: net, date: voucher.receiptDate }
  }
  if (voucher.flightStatus !== 'flown') return { amount: 0, date: null }
  return { amount: round2(Math.max(0, voucher.billed - voucher.creditNote - voucher.refund)), date: voucher.flightDate }
}

export function debtorEarned(invoice: DebtorInvoice) {
  if (invoice.voided || invoice.flightStatus !== 'flown') return { amount: 0, date: null as string | null }
  return { amount: round2(Math.max(0, invoice.gross - invoice.creditNote)), date: invoice.flightDate }
}

export function pdNet(txn: PdTxn) {
  return round2(txn.gross - txn.discount)
}

export function appliedToInvoice(id: string, receipts: Receipt[], asOf: string) {
  let total = 0
  for (const receipt of receipts) {
    if (receipt.date > asOf) continue
    for (const allocation of receipt.allocations) {
      if (allocation.targetType === 'invoice' && allocation.targetId === id) total += allocation.amount
    }
  }
  return round2(total)
}

export function appliedToCreditor(id: string, payments: SupplierPayment[], asOf: string) {
  let total = 0
  for (const payment of payments) {
    if (payment.date > asOf) continue
    for (const allocation of payment.allocations) {
      if (allocation.invoiceId === id) total += allocation.amount
    }
  }
  return round2(total)
}

export function grossPay(line: { base: number; allowances: number; overtime: number }) {
  return round2(line.base + line.allowances + line.overtime)
}

export function netPay(line: { base: number; allowances: number; overtime: number; withheldPaye: number; withheldNssf: number; otherDeduction: number }) {
  return round2(grossPay(line) - line.withheldPaye - line.withheldNssf - line.otherDeduction)
}

export function focusHref(path: string, date: string, currency: MoneyCurrency | 'ALL', id: string) {
  const filters: GlobalFilters = {
    preset: 'custom',
    from: date.slice(0, 10),
    to: date.slice(0, 10),
    branch: 'All',
    party: '',
    status: 'all',
    currency: currency === 'MISSING' ? 'ALL' : currency,
  }
  return `${path}?${toSearch(filters, { ...emptyDrill(), txn: id })}`
}

export function makeDetail(input: Omit<DrawerDetail, 'approvals' | 'requiresEvidence'> & { approvals?: DrawerDetail['approvals']; requiresEvidence?: boolean }): DrawerDetail {
  const approvals = input.approvals ?? defaultApprovals(input.pipeline, input.creatorId)
  return { requiresEvidence: input.requiresEvidence ?? true, ...input, approvals }
}

function defaultApprovals(pipeline: PipelineStage, creatorId: string): DrawerDetail['approvals'] {
  const order = ['capture', 'validate', 'classify', 'attach', 'submit', 'approve', 'post', 'reconcile', 'close']
  const index = order.indexOf(pipeline)
  const trail: DrawerDetail['approvals'] = []
  if (index >= order.indexOf('submit')) {
    trail.push({ by: creatorId, action: 'Submitted', at: 'Demo ledger', note: 'Maker step' })
  }
  if (index >= order.indexOf('approve')) {
    trail.push({ by: 'Demo · Director', action: 'Approved', at: 'Demo ledger', note: 'Checker is not the creator on seeded history.' })
  }
  if (index >= order.indexOf('post')) {
    trail.push({ by: 'Demo · System', action: 'Posted', at: 'Demo ledger', note: 'Prototype posting. Not a live journal.' })
  }
  return trail
}

export function makeRow(input: {
  id: string
  date: string
  branch: Branch
  party: string
  category: string
  group: string
  groupLabel: string
  bucket?: string
  status: string
  settle: Settle
  verify: VerifyStatus
  currency: MoneyCurrency
  amount: number
  included?: boolean
  creatorId: string
  pipeline: PipelineStage
  values: Record<string, string | number>
  slotPaid?: number
  slotOutstanding?: number
  slotOverdue?: number
  detail: DrawerDetail
}): LedgerRow {
  return {
    bucket: '',
    included: true,
    slotPaid: 0,
    slotOutstanding: 0,
    slotOverdue: 0,
    ...input,
    month: input.date.slice(0, 7),
    values: { ...input.values, pipelineLabel: pipelineLabel(input.pipeline) },
  }
}

function statusOk(row: LedgerRow, status: StatusFilter) {
  if (status === 'all') return true
  if (status === 'verified' || status === 'source-reported' || status === 'estimated' || status === 'unreconciled') return row.verify === status
  if (status === 'paid') return row.settle === 'paid'
  if (status === 'partial') return row.settle === 'partial'
  if (status === 'overdue') return row.settle === 'overdue'
  if (status === 'open') return row.settle === 'open' || row.settle === 'partial' || row.settle === 'overdue'
  if (status === 'disputed') return row.status === 'disputed'
  return true
}

export function gate(rows: LedgerRow[], filters: GlobalFilters, drill: Drill) {
  const party = filters.party.trim().toLowerCase()
  return rows.filter((row) => {
    if (!inRange(row.date, filters.from, filters.to)) return false
    if (filters.branch !== 'All' && row.branch !== filters.branch) return false
    if (filters.currency !== 'ALL' && row.currency !== filters.currency) return false
    if (party) {
      const blob = `${row.party} ${row.category} ${row.id} ${row.groupLabel} ${Object.values(row.values).join(' ')}`.toLowerCase()
      if (!blob.includes(party)) return false
    }
    if (!statusOk(row, filters.status)) return false
    if (drill.drill && ![row.group, row.category, row.party, row.groupLabel].includes(drill.drill)) return false
    if (drill.month && row.month !== drill.month) return false
    if (drill.bucket && row.bucket !== drill.bucket) return false
    return true
  })
}

export function moneyLines(rows: LedgerRow[], pick: (row: LedgerRow) => number) {
  const map = new Map<CurrencyCode, { amount: number; verifies: VerifyStatus[] }>()
  for (const row of rows) {
    if (!row.included || row.currency === 'MISSING') continue
    const slot = map.get(row.currency) ?? { amount: 0, verifies: [] }
    slot.amount = round2(slot.amount + pick(row))
    slot.verifies.push(row.verify)
    map.set(row.currency, slot)
  }
  return (['KES', 'USD', 'GBP'] as CurrencyCode[])
    .filter((currency) => map.has(currency))
    .map((currency) => ({ currency, amount: map.get(currency)!.amount, verify: worst(map.get(currency)!.verifies) }))
}

export function creditorBalance(invoice: CreditorInvoice, payments: SupplierPayment[], asOf: string) {
  return round2(invoice.amount - invoice.creditNotes - appliedToCreditor(invoice.id, payments, asOf))
}
