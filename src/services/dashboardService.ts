import { previousFilters } from '@/lib/dates'
import { formatMoney, round2 } from '@/lib/format'
import { PD_NOTICE, PNL_WARNING, RECOGNITION_NOTICE } from '@/copy'
import type {
  AuditEvent,
  CollectionRate,
  CurrencyCode,
  ExceptionItem,
  GlobalFilters,
  KpiModel,
  Ledger,
  LedgerKind,
  LedgerRow,
  LedgerView,
  ReconItem,
  SearchHit,
  SummaryCardModel,
  VerifyStatus,
  ViewColumn,
} from '@/types'
import { agingChart, allocationChart, cashChart, doughnutChart, monthChart, performanceChart, rankingChart, statusChart } from '@/services/charts'
import { appliedToInvoice, focusHref, moneyLines, worst } from '@/services/query'
import {
  selectAllocations,
  selectCash,
  selectCreditors,
  selectDebtors,
  selectExpenses,
  selectInvoices,
  selectLanding,
  selectPayments,
  selectPayroll,
  selectPd,
  selectPetty,
  selectPnl,
  selectReceipts,
  selectRevenue,
  selectStatutory,
  selectVouchers,
  type FinanceQuery,
} from '@/services/select'

const v = (key: string, header: string, kind: ViewColumn['kind']): ViewColumn => ({ key, header, kind })

function variance(current: LedgerRow[], previous: LedgerRow[]) {
  const left = moneyLines(current, (row) => row.amount)
  const right = moneyLines(previous, (row) => row.amount)
  return (['KES', 'USD', 'GBP'] as CurrencyCode[])
    .filter((currency) => left.some((line) => line.currency === currency) || right.some((line) => line.currency === currency))
    .map((currency) => ({
      currency,
      amount: round2((left.find((line) => line.currency === currency)?.amount ?? 0) - (right.find((line) => line.currency === currency)?.amount ?? 0)),
      verify: worst([
        left.find((line) => line.currency === currency)?.verify ?? 'estimated',
        right.find((line) => line.currency === currency)?.verify ?? 'estimated',
      ]),
    }))
}

function summaries(
  rows: LedgerRow[],
  previous: LedgerRow[],
  labels: { total: string; totalHint: string; paid: string; paidHint: string; outstanding: string; outstandingHint: string; overdue: string; overdueHint: string },
  force?: VerifyStatus,
): SummaryCardModel[] {
  const lines = (pick: (row: LedgerRow) => number) => {
    const totals = moneyLines(rows, pick)
    return force ? totals.map((line) => ({ ...line, verify: force })) : totals
  }
  return [
    { id: 'total', label: labels.total, hint: labels.totalHint, lines: lines((row) => row.amount) },
    { id: 'count', label: 'Records', hint: 'Included records. Excluded rows sit under the table and are omitted from this count.', lines: [], count: rows.filter((row) => row.included && row.currency !== 'MISSING').length },
    { id: 'paid', label: labels.paid, hint: labels.paidHint, lines: lines((row) => row.slotPaid) },
    { id: 'outstanding', label: labels.outstanding, hint: labels.outstandingHint, lines: lines((row) => row.slotOutstanding) },
    { id: 'overdue', label: labels.overdue, hint: labels.overdueHint, lines: lines((row) => row.slotOverdue) },
    { id: 'variance', label: 'Variance vs prior period', hint: 'Same filters, previous window of equal length. Currencies are not combined.', lines: variance(rows, previous) },
  ]
}

function pack(input: {
  kind: LedgerKind
  title: string
  eyebrow: string
  description: string
  formula: string
  warnings: string[]
  columns: ViewColumn[]
  rows: LedgerRow[]
  previous: LedgerRow[]
  charts: LedgerView['charts']
  labels: Parameters<typeof summaries>[2]
  force?: VerifyStatus
}): LedgerView {
  return {
    kind: input.kind,
    title: input.title,
    eyebrow: input.eyebrow,
    description: input.description,
    formula: input.formula,
    warnings: input.warnings,
    columns: input.columns,
    rows: input.rows.filter((row) => row.included),
    excluded: input.rows.filter((row) => !row.included),
    charts: input.charts,
    summaries: summaries(input.rows, input.previous, input.labels, input.force),
  }
}

function kpi(id: string, label: string, href: string, formula: string, hint: string, rows: LedgerRow[], force?: VerifyStatus): KpiModel {
  const totals = moneyLines(rows, (row) => row.amount).map((line) => (force ? { ...line, verify: force } : line))
  const sparkCurrency = totals[0]?.currency ?? null
  const sparkMap = new Map<string, number>()
  for (const row of rows) {
    if (!row.included || row.currency !== sparkCurrency) continue
    sparkMap.set(row.month, round2((sparkMap.get(row.month) ?? 0) + row.amount))
  }
  return {
    id,
    label,
    href,
    formula,
    hint,
    totals,
    count: rows.filter((row) => row.included && row.currency !== 'MISSING').length,
    sparkCurrency,
    spark: [...sparkMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })),
  }
}

const revenueCols = [v('type', 'Stream', 'text'), v('booking', 'Booking', 'text'), v('voucher', 'Voucher / invoice', 'text'), v('customer', 'Customer', 'text'), v('flight', 'Flight', 'date'), v('currency', 'Currency', 'text'), v('recognized', 'Recognized', 'money'), v('verify', 'Verification', 'verify')]
const standardLabels = {
  total: 'Total',
  totalHint: 'Period total',
  paid: 'Paid',
  paidHint: 'Settled',
  outstanding: 'Outstanding',
  outstandingHint: 'Open',
  overdue: 'Overdue',
  overdueHint: 'Past due',
}

export interface FinanceModel {
  filters: GlobalFilters
  kpis: KpiModel[]
  views: Record<LedgerKind, LedgerView>
  sheet: ReturnType<typeof selectCreditors>['sheet']
  exceptions: ExceptionItem[]
  charts: {
    performance: LedgerView['charts'][number]
    cash: LedgerView['charts'][number]
    ranking: LedgerView['charts'][number]
    aging: LedgerView['charts'][number]
    invoices: LedgerView['charts'][number]
  }
  recon: ReconItem[]
  audit: AuditEvent[]
  search: SearchHit[]
  collection: CollectionRate[]
  tieOut: string[]
}

export function buildModel(ledger: Ledger, query: FinanceQuery, extraAudit: AuditEvent[]): FinanceModel {
  const previous: FinanceQuery = { ...query, filters: previousFilters(query.filters), drill: { ...query.drill, month: '' } }
  const revenue = selectRevenue(ledger, query)
  const vouchers = selectVouchers(ledger, query)
  const pd = selectPd(ledger, query)
  const invoices = selectInvoices(ledger, query)
  const debtors = selectDebtors(ledger, query)
  const receipts = selectReceipts(ledger, query)
  const expenses = selectExpenses(ledger, query)
  const payroll = selectPayroll(ledger, query)
  const statutory = selectStatutory(ledger, query)
  const payments = selectPayments(ledger, query)
  const hq = selectPetty(ledger, query, 'hq')
  const mara = selectPetty(ledger, query, 'mara')
  const landing = selectLanding(ledger, query)
  const allocations = selectAllocations(ledger, query)
  const cash = selectCash(ledger, query)
  const creditors = selectCreditors(ledger, query)
  const pnl = selectPnl(revenue, expenses)
  const revenuePrev = selectRevenue(ledger, previous)
  const expensesPrev = selectExpenses(ledger, previous)
  const pnlPrev = selectPnl(revenuePrev, expensesPrev)

  const views: Record<LedgerKind, LedgerView> = {
    revenue: pack({
      kind: 'revenue', title: 'Recognized revenue', eyebrow: 'Revenue', formula: 'Recognized streams for the period.',
      description: 'Revenue register.',
      warnings: [RECOGNITION_NOTICE, PD_NOTICE],
      columns: revenueCols, rows: revenue, previous: revenuePrev,
      charts: [doughnutChart(revenue, 'mix', 'Revenue mix', '/ledger/revenue'), monthChart(revenue, 'trend', 'Recognized by month', '/ledger/revenue')],
      labels: { ...standardLabels, total: 'Recognized', totalHint: 'Sum of recognized amounts in the table.', paid: 'Cash on these items', paidHint: 'Cash collected against these documents. Not added to revenue.', outstanding: 'Still unpaid', outstandingHint: 'Shortfalls and open paid-later balances. Not a second sale.', overdue: 'Overdue balance', overdueHint: 'Open paid-later amounts past due.' },
    }),
    vouchers: pack({
      kind: 'vouchers', title: 'Advance vouchers', eyebrow: 'Revenue', formula: 'Advance voucher register.',
      description: 'Voucher book.',
      warnings: [RECOGNITION_NOTICE],
      columns: [v('voucher', 'Voucher', 'text'), v('booking', 'Booking', 'text'), v('customer', 'Customer', 'text'), v('agent', 'Agent', 'text'), v('pax', 'Pax', 'text'), v('flight', 'Flight', 'date'), v('billed', 'Billed', 'money'), v('received', 'Received', 'money'), v('recognized', 'Recognized', 'money'), v('unpaid', 'Unpaid', 'money'), v('flightStatus', 'Flight status', 'status'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: vouchers, previous: selectVouchers(ledger, previous),
      charts: [doughnutChart(vouchers, 'voucher-status', 'Vouchers by flight status', '/revenue/vouchers'), monthChart(vouchers, 'voucher-month', 'Billed by booking month', '/revenue/vouchers')],
      labels: { total: 'Billed', totalHint: 'Face value of vouchers booked in the period.', paid: 'Recognized', paidHint: 'Amount earned under the current working policy.', outstanding: 'Unpaid on the voucher', outstandingHint: 'Shortfall stays on the voucher. It is not re-invoiced as Paid Later.', overdue: 'Overdue', overdueHint: 'Voucher shortfalls are not aged as trade debtors.' },
    }),
    pd: pack({
      kind: 'pd', title: query.settings.pdLabel || 'PD (Mara)', eyebrow: 'Revenue', formula: 'PD net on collection day.',
      description: 'Mara PD register.',
      warnings: [PD_NOTICE],
      columns: [v('txn', 'PD txn', 'text'), v('date', 'Date', 'date'), v('flight', 'Flight', 'text'), v('pax', 'Pax', 'text'), v('rate', 'Rate', 'money'), v('gross', 'Gross', 'money'), v('discount', 'Discount', 'money'), v('net', 'Net', 'money'), v('method', 'Method', 'text'), v('cashier', 'Cashier', 'text'), v('receipt', 'Receipt', 'text'), v('shift', 'Shift', 'text'), v('settlement', 'Settlement', 'status'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: pd, previous: selectPd(ledger, previous),
      charts: [doughnutChart(pd, 'pd-method', 'PD by method', '/revenue/pd', 'category'), monthChart(pd, 'pd-month', 'PD by day / month', '/revenue/pd', 'line')],
      labels: { ...standardLabels, total: 'Net collected', totalHint: 'Gross minus discount.', paid: 'Net collected', paidHint: 'Same-day collection.', outstanding: 'Pending deposit', outstandingHint: 'Collections not yet marked deposited.', overdue: 'Overdue', overdueHint: 'Not used for same-day PD.' },
    }),
    debtors: pack({
      kind: 'debtors', title: 'Outstanding debtors', eyebrow: 'Receivables', formula: 'Open debtor balances.',
      description: 'Debtors register.',
      warnings: ['Opening balances were not provided. Aging is computed from demo invoices only.'],
      columns: [v('customer', 'Customer', 'text'), v('invoice', 'Invoice', 'text'), v('due', 'Due', 'date'), v('original', 'Original', 'money'), v('receipts', 'Receipts', 'money'), v('credits', 'Credits', 'money'), v('balance', 'Balance', 'money'), v('aging', 'Aging', 'text'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: debtors, previous: selectDebtors(ledger, previous),
      charts: [agingChart(debtors, '/ledger/debtors'), doughnutChart(debtors, 'debtor-customers', 'Open balance by customer', '/ledger/debtors', 'group')],
      labels: { total: 'Outstanding', totalHint: 'Sum of the balance column.', paid: 'Receipts applied', paidHint: 'Part payments already applied. Not revenue.', outstanding: 'Outstanding', outstandingHint: 'Same as the total for this register.', overdue: 'Overdue', overdueHint: 'Balances past due. Included in outstanding, not added again.' },
    }),
    invoices: pack({
      kind: 'invoices', title: 'Invoices issued', eyebrow: 'Revenue', formula: 'Gross invoiced, voids excluded.',
      description: 'Invoice register.',
      warnings: [],
      columns: [v('number', 'No.', 'text'), v('customer', 'Customer', 'text'), v('issued', 'Issue date', 'date'), v('due', 'Due', 'date'), v('gross', 'Gross', 'money'), v('tax', 'Tax (included)', 'money'), v('paid', 'Paid', 'money'), v('outstanding', 'Outstanding', 'money'), v('status', 'Status', 'status'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: invoices, previous: selectInvoices(ledger, previous),
      charts: [statusChart(invoices, '/ledger/invoices'), monthChart(invoices, 'invoice-month', 'Gross invoiced by month', '/ledger/invoices')],
      labels: { total: 'Gross invoiced', totalHint: 'Eligible invoices. Approved voids are excluded.', paid: 'Receipts applied', paidHint: 'Cash applied to these invoices.', outstanding: 'Outstanding', outstandingHint: 'Gross − credits − receipts.', overdue: 'Overdue', overdueHint: 'Past-due balances inside outstanding.' },
    }),
    receipts: pack({
      kind: 'receipts', title: 'Cash received', eyebrow: 'Revenue', formula: 'Customer cash receipts.',
      description: 'Receipts register.',
      warnings: ['Unapplied cash is not revenue.'],
      columns: [v('date', 'Receipt date', 'date'), v('payer', 'Payer', 'text'), v('channel', 'Channel', 'text'), v('bankRef', 'Bank ref', 'text'), v('link', 'Invoice / voucher', 'text'), v('allocated', 'Allocated', 'money'), v('unapplied', 'Unapplied', 'money'), v('amount', 'Amount', 'money'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: receipts, previous: selectReceipts(ledger, previous),
      charts: [doughnutChart(receipts, 'receipt-kind', 'Receipts by kind', '/ledger/receipts'), monthChart(receipts, 'receipt-month', 'Cash by month', '/ledger/receipts')],
      labels: { total: 'Cash received', totalHint: 'Net of refunds. Sum of the amount column.', paid: 'Allocated', paidHint: 'Portion matched to a voucher, PD slip or invoice.', outstanding: 'Unapplied', outstandingHint: 'Cash with no document. Not revenue.', overdue: 'Refunds', overdueHint: 'Cash returned. Included in the net total as a negative.' },
    }),
    expenses: pack({
      kind: 'expenses', title: 'Expenses incurred', eyebrow: 'Expenses', formula: 'Costs incurred in period.',
      description: 'Expense register.',
      warnings: ['Payroll, statutory and petty cash were not in the source file. Those streams are Estimated.'],
      columns: [v('stream', 'Stream', 'text'), v('category', 'Category', 'text'), v('supplier', 'Supplier / payee', 'text'), v('location', 'Location', 'text'), v('invoiceDate', 'Date', 'date'), v('amount', 'Amount', 'money'), v('approval', 'Approval', 'text'), v('paymentStatus', 'Payment status', 'status'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: expenses, previous: expensesPrev,
      charts: [doughnutChart(expenses, 'expense-mix', 'Expense mix', '/ledger/expenses'), monthChart(expenses, 'expense-month', 'Costs by month', '/ledger/expenses')],
      labels: { ...standardLabels, total: 'Incurred', totalHint: 'Sum of cost rows. Payments are not included.', paid: 'Cash later applied', paidHint: 'Settlement progress. Not part of the cost total.', outstanding: 'Unpaid cost', outstandingHint: 'Incurred amounts not yet settled.', overdue: 'Overdue to suppliers', overdueHint: 'Past-due operating balances.' },
    }),
    payroll: pack({
      kind: 'payroll', title: 'Payroll', eyebrow: 'Expenses', formula: 'Gross payroll.',
      description: 'Payroll register.',
      warnings: ['Payroll records were not provided. These rows are a demo schedule, not company history.'],
      columns: [v('period', 'Period', 'text'), v('employee', 'Employee', 'text'), v('dept', 'Department', 'text'), v('gross', 'Gross', 'money'), v('deductions', 'Deductions', 'money'), v('net', 'Net', 'money'), v('paid', 'Paid / unpaid', 'status'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: payroll, previous: selectPayroll(ledger, previous),
      charts: [doughnutChart(payroll, 'payroll-dept', 'Gross by department', '/ledger/payroll', 'category'), monthChart(payroll, 'payroll-month', 'Gross by month', '/ledger/payroll')],
      labels: { total: 'Gross', totalHint: 'Salary expense.', paid: 'Net disbursed', paidHint: 'Net pay already sent. Not an extra expense.', outstanding: 'Net unpaid', outstandingHint: 'Approved net not yet paid.', overdue: 'Overdue', overdueHint: 'Not aged separately in this demo.' },
    }),
    statutory: pack({
      kind: 'statutory', title: 'Statutory obligations', eyebrow: 'Expenses', formula: 'Statutory balances due.',
      description: 'Statutory register.',
      warnings: ['Statutory certificates were not provided. Amounts are Estimated from the demo payroll.'],
      columns: [v('authority', 'Authority', 'text'), v('type', 'Type', 'text'), v('period', 'Period', 'text'), v('due', 'Due', 'date'), v('assessed', 'Assessed', 'money'), v('paid', 'Paid', 'money'), v('balance', 'Balance', 'money'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: statutory, previous: selectStatutory(ledger, previous),
      charts: [doughnutChart(statutory, 'stat-type', 'Balance by type', '/ledger/statutory', 'category'), monthChart(statutory, 'stat-month', 'Balance by due month', '/ledger/statutory')],
      labels: { total: 'Balance', totalHint: 'Assessed minus payments.', paid: 'Payments', paidHint: 'Cash remitted. Not a second expense.', outstanding: 'Balance', outstandingHint: 'Same as the headline.', overdue: 'Overdue balance', overdueHint: 'Unpaid amounts past the due date.' },
    }),
    payments: pack({
      kind: 'payments', title: 'Creditor payments', eyebrow: 'Payables', formula: 'Supplier disbursements.',
      description: 'Payments register.',
      warnings: ['Unmatched payments do not reduce a supplier balance.'],
      columns: [v('supplier', 'Supplier', 'text'), v('date', 'Date', 'date'), v('match', 'Invoice match', 'text'), v('method', 'Method', 'text'), v('bankRef', 'Bank ref', 'text'), v('amount', 'Amount', 'money'), v('allocated', 'Allocated', 'money'), v('unallocated', 'Unmatched', 'money'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: payments, previous: selectPayments(ledger, previous),
      charts: [doughnutChart(payments, 'pay-kind', 'Allocated vs unmatched', '/ledger/payments'), monthChart(payments, 'pay-month', 'Payments by month', '/ledger/payments')],
      labels: { total: 'Disbursed', totalHint: 'Cash paid to suppliers.', paid: 'Allocated', paidHint: 'Matched to invoices.', outstanding: 'Unmatched', outstandingHint: 'Paid but not applied to an invoice.', overdue: 'Overdue', overdueHint: 'Not used on disbursements.' },
    }),
    'hq-petty': pack({
      kind: 'hq-petty', title: 'HQ petty cash', eyebrow: 'Expenses', formula: 'HQ float voucher spend.',
      description: 'HQ petty cash.',
      warnings: ['Petty-cash books were not provided. Weeks are Estimated unless a receipt is missing.'],
      columns: [v('week', 'Week', 'date'), v('opening', 'Float', 'money'), v('topups', 'Top-ups', 'money'), v('vouchers', 'Vouchers', 'money'), v('balance', 'Balance', 'money'), v('variance', 'Variance', 'money'), v('approval', 'Approval', 'text'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: hq, previous: selectPetty(ledger, previous, 'hq'),
      charts: [],
      labels: { total: 'Voucher spend', totalHint: 'The expense. Top-ups are excluded.', paid: 'Replenishments', paidHint: 'Transfers into the float. Not expenses.', outstanding: 'Computed closing', outstandingHint: 'Opening + replenishments − vouchers ± approved adjustments.', overdue: 'Count variance', overdueHint: 'Physical count minus computed closing.' },
    }),
    'mara-petty': pack({
      kind: 'mara-petty', title: 'Mara petty cash', eyebrow: 'Expenses', formula: 'Mara float voucher spend.',
      description: 'Mara petty cash.',
      warnings: ['A locked day cannot be edited. An adjustment needs a reason and is written to the audit log.'],
      columns: [v('day', 'Day', 'date'), v('opening', 'Opening', 'money'), v('inflow', 'In', 'money'), v('outflow', 'Out', 'money'), v('closing', 'Closing', 'money'), v('variance', 'Variance', 'money'), v('approval', 'Approval', 'text'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: mara, previous: selectPetty(ledger, previous, 'mara'),
      charts: [],
      labels: { total: 'Voucher spend', totalHint: 'Cash expenses for the days shown.', paid: 'Top-ups', paidHint: 'Transfers, not expenses.', outstanding: 'Computed closing', outstandingHint: 'Formula balance before comparing the count.', overdue: 'Count variance', overdueHint: 'Shortage or overage versus the count.' },
    }),
    pnl: pack({
      kind: 'pnl', title: 'Net operating result', eyebrow: 'Overview', formula: 'Revenue minus costs.',
      description: 'Provisional result.',
      warnings: [PNL_WARNING],
      columns: [v('line', 'Line', 'text'), v('stream', 'Stream', 'text'), v('amount', 'Amount', 'money'), v('currency', 'Currency', 'text'), v('note', 'Note', 'text'), v('verify', 'Verification', 'verify')],
      rows: pnl, previous: pnlPrev,
      charts: [monthChart(pnl, 'pnl-month', 'Net by month', '/ledger/pnl'), doughnutChart(pnl, 'pnl-mix', 'Signed contribution', '/ledger/pnl')],
      labels: { total: 'Net', totalHint: 'Revenue lines minus cost lines. This is the sum of the table.', paid: 'Not used', paidHint: 'Net is the only headline.', outstanding: 'Not used', outstandingHint: 'See debtors and creditors for balances.', overdue: 'Not used', overdueHint: 'See the aging registers.' },
    }),
    landing: pack({
      kind: 'landing', title: 'Landing fees', eyebrow: 'Operations', formula: 'Landing-fee collections.',
      description: 'Landing fees.',
      warnings: ['What landing-fee ACTUAL represents is still awaiting sign-off.'],
      columns: [v('date', 'Date', 'date'), v('flight', 'Flight', 'text'), v('operator', 'Operator', 'text'), v('collected', 'Recalculated', 'money'), v('source', 'Source-reported', 'money'), v('difference', 'Difference', 'money'), v('settled', 'Settled', 'money'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: landing, previous: selectLanding(ledger, previous),
      charts: [doughnutChart(landing, 'landing-op', 'Landing fees by operator', '/operations/landing-fees', 'category'), monthChart(landing, 'landing-month', 'Collected by month', '/operations/landing-fees')],
      labels: { ...standardLabels, total: 'Recalculated', totalHint: 'Slip total. Missing-currency rows are excluded.', paid: 'Settled', paidHint: 'Amount marked settled to the operator.', outstanding: 'Unsettled', outstandingHint: 'Collected and not yet settled.', overdue: 'Overdue', overdueHint: 'Not aged in this demo.' },
    }),
    allocations: pack({
      kind: 'allocations', title: 'Beneficiary allocations', eyebrow: 'Operations', formula: 'Landing allocation rules.',
      description: 'Allocations.',
      warnings: ['County and Hemlab are separate named counterparties. The 20% beneficiary is not assigned.'],
      columns: [v('month', 'Month', 'text'), v('beneficiary', 'Beneficiary', 'text'), v('actual', 'Actual', 'money'), v('reduced40', 'Reduced 40% (flagged)', 'money'), v('divided13', 'Divided by 13 (flagged)', 'money'), v('allocated', 'Allocated', 'text'), v('paid', 'Paid', 'money'), v('posting', 'Posting', 'text'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: allocations, previous: selectAllocations(ledger, previous),
      charts: [monthChart(allocations, 'alloc-actual', 'Source-reported actual', '/operations/allocations'), allocationChart(allocations)],
      labels: { total: 'Actual (source)', totalHint: 'Landing actual. Not the 40% flag.', paid: 'Paid out', paidHint: 'Nothing is paid from an unapproved rule.', outstanding: 'Posted allocation', outstandingHint: 'Zero. Posting is blocked.', overdue: 'Overdue', overdueHint: 'Not used.' },
    }),
    cash: pack({
      kind: 'cash', title: 'Cash movement', eyebrow: 'Overview', formula: 'Cash in and cash out.',
      description: 'Cash movement.',
      warnings: ['Landing-fee cash is reported on the landing-fee screen, not in customer receipts.'],
      columns: [v('date', 'Date', 'date'), v('direction', 'Direction', 'text'), v('party', 'Party', 'text'), v('reference', 'Reference', 'text'), v('amount', 'Amount', 'money'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: cash, previous: selectCash(ledger, previous),
      charts: [cashChart(cash)],
      labels: { total: 'Net of displayed rows', totalHint: 'Cash in is positive and cash out is positive in its own rows. Do not read this card as profit.', paid: 'Not used', paidHint: 'See direction on each row.', outstanding: 'Not used', outstandingHint: 'Unapplied cash is on the receipts screen.', overdue: 'Not used', overdueHint: 'Not a balance-sheet aging.' },
    }),
    creditors: pack({
      kind: 'creditors', title: 'Creditors outstanding', eyebrow: 'Payables', formula: 'Unverified supplier balances.',
      description: 'Creditors register.',
      warnings: ['Confirmed is not shown. Openings and bank statements have not been reconciled.'],
      columns: [v('supplier', 'Supplier', 'text'), v('category', 'Category', 'text'), v('invoiceDate', 'Invoice date', 'date'), v('reference', 'Reference', 'text'), v('invoiced', 'Invoiced', 'money'), v('credits', 'Credits', 'money'), v('allocated', 'Allocated', 'money'), v('outstanding', 'Outstanding', 'money'), v('status', 'Status', 'status'), v('aging', 'Aging', 'text'), v('balanceStatus', 'Balance status', 'text'), v('currency', 'Currency', 'text'), v('verify', 'Verification', 'verify')],
      rows: creditors.rows, previous: selectCreditors(ledger, previous).rows,
      charts: [rankingChart(creditors.sheet), agingChart(creditors.rows, '/payables/creditors', 'Payables aging')],
      labels: { total: 'Outstanding', totalHint: 'Unverified closing balance.', paid: 'Allocated', paidHint: 'Payments applied on or before the period end.', outstanding: 'Outstanding', outstandingHint: 'Same as the headline.', overdue: 'Overdue balance', overdueHint: 'Past-due portion of outstanding.' },
      force: 'unreconciled',
    }),
  }

  const creditorOpen = creditors.rows.filter((row) => row.included && row.amount > 0.004)
  const kpis: KpiModel[] = [
    kpi('revenue', 'Total revenue earned', '/ledger/revenue', views.revenue.formula, 'Three streams, recognition date.', revenue),
    kpi('receipts', 'Cash received', '/ledger/receipts', views.receipts.formula, 'Receipts, not revenue.', receipts),
    kpi('debtors', 'Outstanding debtors', '/ledger/debtors', views.debtors.formula, 'Open invoices and part payments.', debtors),
    kpi('invoices', 'Invoices issued', '/ledger/invoices', views.invoices.formula, 'Eligible gross, voids excluded.', invoices.filter((row) => row.included)),
    kpi('expenses', 'Expenses incurred', '/ledger/expenses', views.expenses.formula, 'Five streams, no double count.', expenses),
    kpi('creditors', 'Creditors outstanding', '/payables/creditors', views.creditors.formula, 'Unverified supplier balances.', creditorOpen, 'unreconciled'),
    kpi('payments', 'Creditor payments', '/ledger/payments', views.payments.formula, 'Disbursements, not expenses.', payments),
    kpi('payroll', 'Payroll', '/ledger/payroll', views.payroll.formula, 'Gross pay. Estimated.', payroll),
    kpi('statutory', 'Statutory obligations', '/ledger/statutory', views.statutory.formula, 'Balance still due.', statutory),
    kpi('hq-petty', 'HQ petty cash', '/ledger/hq-petty', views['hq-petty'].formula, 'Weekly voucher spend.', hq),
    kpi('mara-petty', 'Mara petty cash', '/ledger/mara-petty', views['mara-petty'].formula, 'Daily voucher spend.', mara),
    kpi('pnl', 'Net operating result', '/ledger/pnl', views.pnl.formula, 'Provisional. See the warning.', pnl),
  ]

  return {
    filters: query.filters,
    kpis,
    views,
    sheet: creditors.sheet,
    charts: {
      performance: performanceChart(revenue, receipts),
      cash: cashChart(cash),
      ranking: rankingChart(creditors.sheet),
      aging: agingChart(debtors, '/ledger/debtors'),
      invoices: statusChart(invoices, '/ledger/invoices'),
    },
    exceptions: buildExceptions(ledger, query),
    recon: buildRecon(ledger, query),
    audit: [...ledger.audit, ...extraAudit].sort((a, b) => b.at.localeCompare(a.at)),
    search: buildSearch(ledger),
    collection: buildCollection(ledger, query.filters),
    tieOut: structuralTieOut(ledger),
  }
}

function inPeriod(date: string, filters: GlobalFilters) {
  return date.slice(0, 10) >= filters.from && date.slice(0, 10) <= filters.to
}

function buildExceptions(ledger: Ledger, query: FinanceQuery): ExceptionItem[] {
  const items: ExceptionItem[] = [
    { id: 'std-pd', date: query.filters.to, severity: 'high', title: 'PD definition is unsigned', detail: PD_NOTICE, owner: 'Finance Manager', href: '/control/settings', standing: true, verify: 'source-reported' },
    { id: 'std-open', date: query.filters.to, severity: 'high', title: 'Opening balances are not on file', detail: 'Creditor and debtor closings stay Unverified.', owner: 'Finance Manager', href: '/payables/creditors', standing: true, verify: 'unreconciled' },
    { id: 'std-alloc', date: query.filters.to, severity: 'high', title: 'Allocation posting is blocked', detail: 'Reduced 40% and Divided by 13 are flags only.', owner: 'Director', href: '/operations/allocations', standing: true, verify: 'source-reported' },
  ]
  for (const invoice of ledger.creditorInvoices) {
    if (!inPeriod(invoice.invoiceDate, query.filters)) continue
    if (invoice.duplicateOf) items.push({ id: invoice.id, date: invoice.invoiceDate, severity: 'high', title: `Duplicate invoice ${invoice.reference}`, detail: `Copy of ${invoice.duplicateOf}. Excluded from expenses and balances.`, owner: 'Accountant', href: focusHref('/payables/creditors', invoice.invoiceDate, 'ALL', invoice.id), standing: false, verify: 'unreconciled' })
    if (!invoice.currency) items.push({ id: invoice.id, date: invoice.invoiceDate, severity: 'high', title: 'Supplier invoice is missing a currency', detail: `${invoice.reference} is excluded from every total.`, owner: 'Accountant', href: '/operations/reconciliation', standing: false, verify: 'unreconciled' })
  }
  for (const fee of ledger.landing) {
    if (!inPeriod(fee.date, query.filters)) continue
    if (!fee.currency) items.push({ id: fee.id, date: fee.date, severity: 'high', title: 'Landing fee is missing a currency', detail: fee.notes, owner: 'Accountant', href: focusHref('/operations/landing-fees', fee.date, 'ALL', fee.id), standing: false, verify: 'unreconciled' })
    if (fee.currency && fee.sourceReported !== null && Math.abs(fee.sourceReported - fee.collected) > 0.004) items.push({ id: `${fee.id}-diff`, date: fee.date, severity: 'medium', title: 'Landing source figure differs from the slip', detail: `Source ${formatMoney(fee.sourceReported, fee.currency)} vs recalculated ${formatMoney(fee.collected, fee.currency)}.`, owner: 'Finance Manager', href: focusHref('/operations/reconciliation', fee.date, fee.currency, fee.id), standing: false, verify: 'source-reported' })
  }
  for (const invoice of ledger.invoices) {
    if (invoice.disputed && inPeriod(invoice.issueDate, query.filters)) items.push({ id: invoice.id, date: invoice.issueDate, severity: 'high', title: `${invoice.number} is disputed`, detail: invoice.notes, owner: 'Finance Manager', href: focusHref('/revenue/debtors', invoice.issueDate, invoice.currency, invoice.id), standing: false, verify: 'unreconciled' })
  }
  for (const receipt of ledger.receipts) {
    if (receipt.kind === 'unapplied' && inPeriod(receipt.date, query.filters)) items.push({ id: receipt.id, date: receipt.date, severity: 'medium', title: 'Unapplied cash', detail: receipt.notes, owner: 'Accountant', href: focusHref('/ledger/receipts', receipt.date, receipt.currency, receipt.id), standing: false, verify: 'unreconciled' })
  }
  for (const payment of ledger.supplierPayments) {
    if (payment.unmatched && inPeriod(payment.date, query.filters)) items.push({ id: payment.id, date: payment.date, severity: 'medium', title: 'Unmatched supplier payment', detail: payment.notes, owner: 'Accountant', href: focusHref('/ledger/payments', payment.date, payment.currency, payment.id), standing: false, verify: 'unreconciled' })
  }
  for (const txn of ledger.pd) {
    if (!txn.documents.length && inPeriod(txn.date, query.filters)) items.push({ id: txn.id, date: txn.date, severity: 'medium', title: 'PD receipt image missing', detail: txn.notes, owner: 'Mara Cashier', href: focusHref('/revenue/pd', txn.date, txn.currency, txn.id), standing: false, verify: 'unreconciled' })
  }
  for (const week of ledger.hqWeeks) {
    if (!inPeriod(week.weekStart, query.filters)) continue
    if (week.vouchers.some((voucher) => !voucher.receiptAttached)) items.push({ id: week.id, date: week.weekStart, severity: 'medium', title: 'HQ petty voucher is missing a receipt', detail: week.notes, owner: 'HQ Cash Custodian', href: focusHref('/expenses/hq-petty', week.weekStart, week.currency, week.id), standing: false, verify: 'unreconciled' })
  }
  for (const day of ledger.maraDays) {
    if (!inPeriod(day.date, query.filters)) continue
    const spend = day.vouchers.reduce((sum, voucher) => sum + voucher.amount, 0)
    const inflow = day.topUps.reduce((sum, topUp) => sum + topUp.amount, 0)
    const closing = round2(day.opening + inflow - spend)
    if (Math.abs(round2(day.physicalCount - closing)) > 0.004) items.push({ id: day.id, date: day.date, severity: 'high', title: 'Mara cash count does not match', detail: day.notes, owner: 'Mara Cashier', href: focusHref('/expenses/mara-petty', day.date, day.currency, day.id), standing: false, verify: 'unreconciled' })
  }
  return items.filter((item) => item.standing || inPeriod(item.date, query.filters))
}

function buildRecon(ledger: Ledger, query: FinanceQuery): ReconItem[] {
  const rows: ReconItem[] = []
  for (const fee of ledger.landing) {
    if (!inPeriod(fee.date, query.filters)) continue
    if (!fee.currency) {
      rows.push({ id: fee.id, date: fee.date, type: 'Missing currency', party: fee.operator, sourceText: 'Currency cell blank', recalcText: 'Excluded', differenceText: 'Not summed', reviewer: 'Accountant', verify: 'unreconciled', href: '/operations/landing-fees' })
    } else if (fee.sourceReported !== null && Math.abs(fee.sourceReported - fee.collected) > 0.004) {
      rows.push({ id: fee.id, date: fee.date, type: 'Source vs recalculated', party: fee.operator, sourceText: formatMoney(fee.sourceReported, fee.currency), recalcText: formatMoney(fee.collected, fee.currency), differenceText: formatMoney(round2(fee.sourceReported - fee.collected), fee.currency), reviewer: 'Finance Manager', verify: 'source-reported', href: focusHref('/operations/landing-fees', fee.date, fee.currency, fee.id) })
    }
  }
  for (const invoice of ledger.creditorInvoices) {
    if (!inPeriod(invoice.invoiceDate, query.filters)) continue
    if (invoice.duplicateOf) rows.push({ id: invoice.id, date: invoice.invoiceDate, type: 'Duplicate invoice', party: invoice.supplier, sourceText: invoice.reference, recalcText: `Kept ${invoice.duplicateOf}`, differenceText: 'Excluded', reviewer: 'Accountant', verify: 'unreconciled', href: '/payables/creditors' })
    if (!invoice.currency) rows.push({ id: invoice.id, date: invoice.invoiceDate, type: 'Missing currency', party: invoice.supplier, sourceText: String(invoice.amount), recalcText: 'Excluded', differenceText: 'Not summed', reviewer: 'Accountant', verify: 'unreconciled', href: '/payables/creditors' })
  }
  for (const receipt of ledger.receipts) {
    if (receipt.kind === 'unapplied' && inPeriod(receipt.date, query.filters)) rows.push({ id: receipt.id, date: receipt.date, type: 'Unapplied receipt', party: receipt.payer, sourceText: formatMoney(receipt.amount, receipt.currency), recalcText: formatMoney(0, receipt.currency), differenceText: formatMoney(receipt.amount, receipt.currency), reviewer: 'Accountant', verify: 'unreconciled', href: focusHref('/ledger/receipts', receipt.date, receipt.currency, receipt.id) })
  }
  for (const payment of ledger.supplierPayments) {
    if (payment.unmatched && inPeriod(payment.date, query.filters)) rows.push({ id: payment.id, date: payment.date, type: 'Unmatched payment', party: payment.supplier, sourceText: formatMoney(payment.amount, payment.currency), recalcText: 'No invoice', differenceText: formatMoney(payment.amount, payment.currency), reviewer: 'Accountant', verify: 'unreconciled', href: focusHref('/ledger/payments', payment.date, payment.currency, payment.id) })
  }
  for (const invoice of ledger.invoices) {
    if (invoice.disputed && inPeriod(invoice.issueDate, query.filters)) rows.push({ id: invoice.id, date: invoice.issueDate, type: 'Disputed invoice', party: invoice.customer, sourceText: formatMoney(invoice.gross, invoice.currency), recalcText: 'Collection paused', differenceText: 'Still in the balance', reviewer: 'Finance Manager', verify: 'unreconciled', href: focusHref('/revenue/debtors', invoice.issueDate, invoice.currency, invoice.id) })
  }
  return rows
}

function buildSearch(ledger: Ledger): SearchHit[] {
  const hits: SearchHit[] = []
  for (const invoice of ledger.invoices) hits.push({ id: invoice.id, group: 'Invoices', label: invoice.number, hint: `${invoice.customer} · ${formatMoney(invoice.gross, invoice.currency)}`, href: focusHref('/revenue/invoices', invoice.issueDate, invoice.currency, invoice.id) })
  for (const voucher of ledger.vouchers) hits.push({ id: voucher.id, group: 'Vouchers', label: voucher.id, hint: `${voucher.customer} · ${formatMoney(voucher.billed, voucher.currency)}`, href: focusHref('/revenue/vouchers', voucher.bookingDate, voucher.currency, voucher.id) })
  for (const receipt of ledger.receipts) hits.push({ id: receipt.id, group: 'Receipts', label: receipt.bankRef || receipt.id, hint: `${receipt.payer} · ${formatMoney(receipt.amount, receipt.currency)}`, href: focusHref('/revenue/receipts', receipt.date, receipt.currency, receipt.id) })
  for (const supplier of ledger.suppliers) hits.push({ id: supplier, group: 'Suppliers', label: supplier, hint: 'Supplier account', href: `/payables/suppliers?party=${encodeURIComponent(supplier)}` })
  for (const customer of ledger.customers) hits.push({ id: customer.id, group: 'Customers', label: customer.name, hint: 'Customer statement', href: `/receivables/statements?party=${encodeURIComponent(customer.name)}` })
  return hits
}

function buildCollection(ledger: Ledger, filters: GlobalFilters): CollectionRate[] {
  return (['KES', 'USD', 'GBP'] as CurrencyCode[]).map((currency) => {
    const invoices = ledger.invoices.filter((invoice) => {
      if (invoice.voided || invoice.currency !== currency) return false
      if (!inPeriod(invoice.issueDate, filters)) return false
      if (filters.branch !== 'All' && invoice.branch !== filters.branch) return false
      if (filters.party && !invoice.customer.toLowerCase().includes(filters.party.toLowerCase())) return false
      return true
    })
    const denominator = round2(invoices.reduce((sum, invoice) => sum + invoice.gross - invoice.creditNote, 0))
    const numerator = round2(invoices.reduce((sum, invoice) => sum + appliedToInvoice(invoice.id, ledger.receipts, filters.to), 0))
    return {
      currency,
      numerator,
      denominator,
      rate: denominator > 0.004 ? round2((numerator / denominator) * 100) : null,
      verify: worst(invoices.map((invoice) => invoice.verify)),
    }
  }).filter((rate) => (filters.currency === 'ALL' || rate.currency === filters.currency) && (rate.denominator > 0 || rate.numerator > 0))
}

export function structuralTieOut(ledger: Ledger) {
  const notes: string[] = []
  for (const voucher of ledger.vouchers) {
    const cash = round2(ledger.receipts.filter((receipt) => receipt.allocations.some((allocation) => allocation.targetId === voucher.id)).reduce((sum, receipt) => sum + receipt.amount, 0))
    const expected = round2(voucher.received - voucher.refund)
    if (cash !== expected) notes.push(`${voucher.id}: receipts ${cash} vs voucher ${expected}`)
  }
  for (const invoice of ledger.invoices) {
    if (invoice.voided) continue
    const applied = appliedToInvoice(invoice.id, ledger.receipts, '2099-12-31')
    const net = round2(invoice.gross - invoice.creditNote)
    const expected = invoice.pay === 'full' ? net : invoice.pay === 'half' ? round2(net * 0.5) : invoice.pay === 'later' ? invoice.laterReceipt?.amount ?? 0 : 0
    if (applied !== expected) notes.push(`${invoice.id}: applied ${applied} vs ${expected}`)
  }
  if (ledger.creditorInvoices.some((invoice) => invoice.id.startsWith('SAMPLE'))) notes.push('Design sample leaked into the live creditor ledger')
  return notes
}

export function collectionLabel() {
  return 'Denominator: eligible invoices issued in the selected period, net of credit notes, excluding approved voids. Numerator: receipts applied to those invoices as at the period end. Currencies are not combined.'
}
