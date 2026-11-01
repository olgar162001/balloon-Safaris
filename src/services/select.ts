import { pipelineLabel } from '@/access'
import { bucketFor } from '@/lib/dates'
import { formatMoney, round2 } from '@/lib/format'
import type {
  AppSettings,
  CurrencyCode,
  Drill,
  GlobalFilters,
  HorizontalRow,
  Ledger,
  LedgerRow,
  PayrollLine,
} from '@/types'
import {
  appliedToCreditor,
  appliedToInvoice,
  creditorBalance,
  debtorEarned,
  focusHref,
  gate,
  grossPay,
  groupLabel,
  makeDetail,
  makeRow,
  netPay,
  pdNet,
  stageOf,
  voucherEarned,
  worst,
} from '@/services/query'

export interface FinanceQuery {
  filters: GlobalFilters
  drill: Drill
  settings: AppSettings
}

const label = (id: string, settings: AppSettings) => groupLabel(id, settings.pdLabel)

function docs(names: string[]) {
  return names.map((name) => ({ name }))
}

export function selectRevenue(ledger: Ledger, query: FinanceQuery) {
  const { settings, filters } = query
  const rows: LedgerRow[] = []
  for (const voucher of ledger.vouchers) {
    const earned = voucherEarned(voucher, settings.recognition)
    if (!earned.date || earned.amount <= 0) continue
    const unpaid = round2(Math.max(0, voucher.billed - voucher.creditNote - (voucher.received - voucher.refund)))
    const pipeline = stageOf(earned.date, voucher.pipeline, settings)
    rows.push(makeRow({
      id: `REV-${voucher.id}`,
      date: earned.date,
      branch: voucher.branch,
      party: voucher.customer,
      category: 'Advance vouchers',
      group: 'advance-voucher',
      groupLabel: label('advance-voucher', settings),
      status: voucher.flightStatus,
      settle: unpaid <= 0.004 ? 'paid' : 'partial',
      verify: voucher.verify,
      currency: voucher.currency,
      amount: earned.amount,
      creatorId: voucher.creatorId,
      pipeline,
      slotPaid: round2(voucher.received - voucher.refund),
      slotOutstanding: unpaid,
      values: {
        type: label('advance-voucher', settings),
        booking: voucher.bookingId,
        voucher: voucher.id,
        customer: voucher.customer,
        flight: voucher.flightDate,
        currency: voucher.currency,
        recognized: earned.amount,
      },
      detail: makeDetail({
        title: voucher.id,
        subtitle: 'Advance voucher',
        amount: earned.amount,
        currency: voucher.currency,
        verify: voucher.verify,
        pipeline,
        creatorId: voucher.creatorId,
        domain: 'general',
        dates: [
          { label: 'Booking', value: voucher.bookingDate },
          { label: 'Receipt', value: voucher.receiptDate ?? '—' },
          { label: 'Flight', value: voucher.flightDate },
        ],
        facts: [
          { label: 'Policy', value: settings.recognition === 'on-flight' ? 'On flight delivery (pending approval)' : 'On payment (pending approval)' },
          { label: 'Billed', value: formatMoney(voucher.billed, voucher.currency) },
          { label: 'Cash received', value: formatMoney(voucher.received, voucher.currency) },
          { label: 'Refund', value: formatMoney(voucher.refund, voucher.currency) },
          { label: 'Flight status', value: voucher.flightStatus },
        ],
        allocations: [],
        documents: docs(voucher.documents),
        notes: voucher.notes,
        audit: [],
        source: 'Voucher book',
        sourceHref: focusHref('/revenue/vouchers', voucher.bookingDate, voucher.currency, voucher.id),
      }),
    }))
  }
  for (const txn of ledger.pd) {
    const amount = pdNet(txn)
    const pipeline = stageOf(txn.date, txn.pipeline, settings)
    rows.push(makeRow({
      id: `REV-${txn.id}`,
      date: txn.date,
      branch: 'Mara',
      party: 'Mara PD desk',
      category: label('pd-mara', settings),
      group: 'pd-mara',
      groupLabel: label('pd-mara', settings),
      status: txn.settlement,
      settle: 'paid',
      verify: txn.verify,
      currency: txn.currency,
      amount,
      creatorId: txn.creatorId,
      pipeline,
      slotPaid: amount,
      values: {
        type: label('pd-mara', settings),
        booking: txn.bookingRef,
        voucher: txn.id,
        customer: 'Mara PD desk',
        flight: txn.flightRef,
        currency: txn.currency,
        recognized: amount,
      },
      detail: makeDetail({
        title: txn.id,
        subtitle: 'PD collection',
        amount,
        currency: txn.currency,
        verify: txn.verify,
        pipeline,
        creatorId: txn.creatorId,
        domain: 'pd',
        dates: [{ label: 'Collection', value: txn.date }],
        facts: [
          { label: 'Shift', value: txn.shift },
          { label: 'Method', value: txn.method },
          { label: 'Receipt', value: txn.receiptNo },
          { label: 'Deposit', value: txn.depositRef },
        ],
        allocations: [],
        documents: docs(txn.documents),
        notes: txn.notes,
        audit: [],
        source: 'Mara PD book',
        sourceHref: focusHref('/revenue/pd', txn.date, txn.currency, txn.id),
      }),
    }))
  }
  for (const invoice of ledger.invoices) {
    const earned = debtorEarned(invoice)
    if (!earned.date || earned.amount <= 0) continue
    const applied = appliedToInvoice(invoice.id, ledger.receipts, filters.to)
    const balance = round2(Math.max(0, invoice.gross - invoice.creditNote - applied))
    const pipeline = stageOf(earned.date, invoice.pipeline, settings)
    const overdue = invoice.dueDate < filters.to && balance > 0.004
    rows.push(makeRow({
      id: `REV-${invoice.id}`,
      date: earned.date,
      branch: invoice.branch,
      party: invoice.customer,
      category: 'Paid later',
      group: 'paid-later',
      groupLabel: label('paid-later', settings),
      status: invoice.disputed ? 'disputed' : invoice.flightStatus,
      settle: balance <= 0.004 ? 'paid' : overdue ? 'overdue' : applied > 0 ? 'partial' : 'open',
      verify: invoice.verify,
      currency: invoice.currency,
      amount: earned.amount,
      creatorId: invoice.creatorId,
      pipeline,
      slotPaid: applied,
      slotOutstanding: balance,
      slotOverdue: overdue ? balance : 0,
      values: {
        type: 'Paid later',
        booking: invoice.bookingId,
        voucher: invoice.number,
        customer: invoice.customer,
        flight: invoice.flightDate,
        currency: invoice.currency,
        recognized: earned.amount,
      },
      detail: makeDetail({
        title: invoice.number,
        subtitle: 'Paid later invoice',
        amount: earned.amount,
        currency: invoice.currency,
        verify: invoice.verify,
        pipeline,
        creatorId: invoice.creatorId,
        domain: 'general',
        dates: [
          { label: 'Invoice', value: invoice.issueDate },
          { label: 'Flight', value: invoice.flightDate },
          { label: 'Due', value: invoice.dueDate },
        ],
        facts: [
          { label: 'Gross', value: formatMoney(invoice.gross, invoice.currency) },
          { label: 'Credit note', value: formatMoney(invoice.creditNote, invoice.currency) },
          { label: 'Receipts applied', value: formatMoney(applied, invoice.currency) },
          { label: 'Balance', value: formatMoney(balance, invoice.currency) },
        ],
        allocations: [],
        documents: docs(invoice.documents),
        notes: invoice.notes,
        audit: [],
        source: 'Invoice register',
        sourceHref: focusHref('/revenue/invoices', invoice.issueDate, invoice.currency, invoice.id),
      }),
    }))
  }
  return gate(rows, filters, query.drill)
}

export function selectVouchers(ledger: Ledger, query: FinanceQuery) {
  const { settings } = query
  const rows = ledger.vouchers.map((voucher) => {
    const earned = voucherEarned(voucher, settings.recognition)
    const unpaid = round2(Math.max(0, voucher.billed - voucher.creditNote - (voucher.received - voucher.refund)))
    const pipeline = stageOf(voucher.bookingDate, voucher.pipeline, settings)
    const recognized = earned.amount
    return makeRow({
      id: voucher.id,
      date: voucher.bookingDate,
      branch: voucher.branch,
      party: voucher.customer,
      category: voucher.agent,
      group: voucher.flightStatus,
      groupLabel: voucher.flightStatus,
      status: voucher.flightStatus,
      settle: voucher.flightStatus === 'cancelled' ? 'na' : unpaid <= 0.004 ? 'paid' : voucher.received > 0 ? 'partial' : 'open',
      verify: voucher.verify,
      currency: voucher.currency,
      amount: voucher.billed,
      creatorId: voucher.creatorId,
      pipeline,
      slotPaid: recognized,
      slotOutstanding: unpaid,
      values: {
        voucher: voucher.id,
        booking: voucher.bookingId,
        customer: voucher.customer,
        agent: voucher.agent,
        pax: voucher.pax,
        flight: voucher.flightDate,
        billed: voucher.billed,
        received: round2(voucher.received - voucher.refund),
        recognized,
        unpaid,
        flightStatus: voucher.flightStatus,
        currency: voucher.currency,
      },
      detail: makeDetail({
        title: voucher.id,
        subtitle: `${voucher.customer} · ${voucher.pax} pax`,
        amount: voucher.billed,
        currency: voucher.currency,
        verify: voucher.verify,
        pipeline,
        creatorId: voucher.creatorId,
        domain: 'general',
        dates: [
          { label: 'Booked', value: voucher.bookingDate },
          { label: 'Flight', value: voucher.flightDate },
          { label: 'Receipt', value: voucher.receiptDate ?? '—' },
          { label: 'Refund', value: voucher.refundDate ?? '—' },
        ],
        facts: [
          { label: 'Agent', value: voucher.agent },
          { label: 'Bank', value: voucher.bankAccount },
          { label: 'Settlement', value: voucher.settlementRef },
          { label: 'Recognized now', value: formatMoney(recognized, voucher.currency) },
          { label: 'Policy', value: settings.recognition === 'on-flight' ? 'On flight delivery' : 'On payment' },
        ],
        allocations: [],
        documents: docs(voucher.documents),
        notes: voucher.notes,
        audit: [],
        source: 'Voucher ' + voucher.id,
        sourceHref: focusHref('/ledger/revenue', earned.date ?? voucher.bookingDate, voucher.currency, `REV-${voucher.id}`),
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectPd(ledger: Ledger, query: FinanceQuery) {
  const rows = ledger.pd.map((txn) => {
    const amount = pdNet(txn)
    const pipeline = stageOf(txn.date, txn.pipeline, query.settings)
    const locked = query.settings.lockedDays.includes(txn.date)
    return makeRow({
      id: txn.id,
      date: txn.date,
      branch: 'Mara',
      party: txn.cashier,
      category: txn.method,
      group: txn.method,
      groupLabel: txn.method,
      bucket: txn.shift,
      status: locked ? 'locked' : txn.settlement,
      settle: txn.settlement === 'deposited' ? 'paid' : 'open',
      verify: txn.verify,
      currency: txn.currency,
      amount,
      creatorId: txn.creatorId,
      pipeline,
      slotPaid: amount,
      slotOutstanding: txn.settlement === 'pending' ? amount : 0,
      values: {
        txn: txn.id,
        date: txn.date,
        flight: txn.flightRef,
        pax: txn.pax,
        rate: txn.rate,
        gross: txn.gross,
        discount: txn.discount,
        net: amount,
        method: txn.method,
        cashier: txn.cashier,
        receipt: txn.receiptNo,
        settlement: locked ? 'Day locked' : txn.settlement,
        shift: txn.shift,
        currency: txn.currency,
      },
      detail: makeDetail({
        title: txn.id,
        subtitle: `${txn.shift} shift · ${txn.method}`,
        amount,
        currency: txn.currency,
        verify: txn.verify,
        pipeline,
        creatorId: txn.creatorId,
        domain: 'pd',
        dates: [{ label: 'Date', value: txn.date }],
        facts: [
          { label: 'Flight', value: txn.flightRef },
          { label: 'Booking', value: txn.bookingRef },
          { label: 'Pax', value: String(txn.pax) },
          { label: 'Deposit', value: txn.depositRef },
          { label: 'Day lock', value: locked ? 'Locked' : 'Open' },
        ],
        allocations: [],
        documents: docs(txn.documents),
        notes: txn.notes,
        audit: [],
        source: 'PD transaction',
        sourceHref: focusHref('/ledger/revenue', txn.date, txn.currency, `REV-${txn.id}`),
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectInvoices(ledger: Ledger, query: FinanceQuery) {
  const rows = ledger.invoices.map((invoice) => {
    const applied = appliedToInvoice(invoice.id, ledger.receipts, query.filters.to)
    const outstanding = round2(Math.max(0, invoice.gross - invoice.creditNote - applied))
    const pipeline = stageOf(invoice.issueDate, invoice.pipeline, query.settings)
    const overdue = !invoice.voided && invoice.dueDate < query.filters.to && outstanding > 0.004
    const settle = invoice.voided ? 'na' : outstanding <= 0.004 ? 'paid' : overdue ? 'overdue' : applied > 0 ? 'partial' : 'open'
    return makeRow({
      id: invoice.id,
      date: invoice.issueDate,
      branch: invoice.branch,
      party: invoice.customer,
      category: invoice.voided ? 'Void' : 'Invoice',
      group: settle === 'na' ? 'void' : settle,
      groupLabel: invoice.voided ? 'Void' : settle,
      bucket: invoice.voided ? '' : bucketFor(invoice.dueDate, query.filters.to, outstanding),
      status: invoice.voided ? 'void' : invoice.disputed ? 'disputed' : settle,
      settle,
      verify: invoice.verify,
      currency: invoice.currency,
      amount: invoice.gross,
      included: !invoice.voided,
      creatorId: invoice.creatorId,
      pipeline,
      slotPaid: applied,
      slotOutstanding: invoice.voided ? 0 : outstanding,
      slotOverdue: overdue ? outstanding : 0,
      values: {
        number: invoice.number,
        customer: invoice.customer,
        issued: invoice.issueDate,
        due: invoice.dueDate,
        gross: invoice.gross,
        tax: invoice.tax,
        paid: applied,
        outstanding: invoice.voided ? 0 : outstanding,
        status: invoice.voided ? 'Void — excluded' : invoice.disputed ? 'Disputed' : settle,
        currency: invoice.currency,
      },
      detail: makeDetail({
        title: invoice.number,
        subtitle: invoice.customer,
        amount: invoice.gross,
        currency: invoice.currency,
        verify: invoice.verify,
        pipeline,
        creatorId: invoice.creatorId,
        domain: 'general',
        dates: [
          { label: 'Issued', value: invoice.issueDate },
          { label: 'Flight', value: invoice.flightDate },
          { label: 'Due', value: invoice.dueDate },
        ],
        facts: [
          { label: 'Tax inside gross', value: formatMoney(invoice.tax, invoice.currency) },
          { label: 'Credit note', value: formatMoney(invoice.creditNote, invoice.currency) },
          { label: 'Contact', value: invoice.contact },
          { label: 'Flight status', value: invoice.flightStatus },
        ],
        allocations: ledger.receipts.flatMap((receipt) =>
          receipt.allocations
            .filter((allocation) => allocation.targetId === invoice.id)
            .map((allocation) => ({
              label: `${receipt.id} · ${receipt.date}`,
              amount: allocation.amount,
              currency: receipt.currency,
            })),
        ),
        documents: docs(invoice.documents),
        notes: invoice.notes,
        audit: [],
        source: invoice.id,
        sourceHref: focusHref('/revenue/debtors', invoice.issueDate, invoice.currency, invoice.id),
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectDebtors(ledger: Ledger, query: FinanceQuery) {
  return selectInvoices(ledger, query).filter((row) => row.included && row.slotOutstanding > 0.004).map((row) => {
    const invoice = ledger.invoices.find((item) => item.id === row.id)!
    return makeRow({
      ...row,
      group: invoice.customer,
      groupLabel: invoice.customer,
      amount: row.slotOutstanding,
      values: {
        customer: invoice.customer,
        invoice: invoice.number,
        due: invoice.dueDate,
        original: invoice.gross,
        receipts: row.slotPaid,
        credits: invoice.creditNote,
        balance: row.slotOutstanding,
        aging: row.bucket,
        currency: invoice.currency,
      },
      detail: { ...row.detail, amount: row.slotOutstanding, subtitle: 'Open balance' },
    })
  })
}

export function selectReceipts(ledger: Ledger, query: FinanceQuery) {
  const rows = ledger.receipts.map((receipt) => {
    const allocated = round2(receipt.allocations.reduce((sum, allocation) => sum + (allocation.amount > 0 ? allocation.amount : 0), 0))
    const unapplied = receipt.amount > 0 ? round2(receipt.amount - allocated) : 0
    const pipeline = stageOf(receipt.date, receipt.pipeline, query.settings)
    const link = receipt.allocations.map((allocation) => allocation.targetId).join(', ') || 'Unapplied'
    return makeRow({
      id: receipt.id,
      date: receipt.date,
      branch: receipt.branch,
      party: receipt.payer,
      category: receipt.kind,
      group: receipt.kind,
      groupLabel: receipt.kind,
      status: receipt.kind,
      settle: receipt.kind === 'refund' ? 'na' : unapplied > 0.004 ? 'open' : 'paid',
      verify: receipt.verify,
      currency: receipt.currency,
      amount: receipt.amount,
      creatorId: receipt.creatorId,
      pipeline,
      slotPaid: allocated,
      slotOutstanding: unapplied,
      slotOverdue: receipt.amount < 0 ? Math.abs(receipt.amount) : 0,
      values: {
        date: receipt.date,
        payer: receipt.payer,
        channel: receipt.channel,
        bankRef: receipt.bankRef,
        link,
        allocated,
        unapplied,
        amount: receipt.amount,
        currency: receipt.currency,
      },
      detail: makeDetail({
        title: receipt.id,
        subtitle: 'Cash receipt',
        amount: receipt.amount,
        currency: receipt.currency,
        verify: receipt.verify,
        pipeline,
        creatorId: receipt.creatorId,
        domain: receipt.branch === 'Mara' ? 'pd' : 'general',
        dates: [{ label: 'Receipt date', value: receipt.date }],
        facts: [
          { label: 'Channel', value: receipt.channel },
          { label: 'Bank ref', value: receipt.bankRef },
          { label: 'Kind', value: receipt.kind },
        ],
        allocations: receipt.allocations.map((allocation) => ({
          label: `${allocation.targetType} ${allocation.targetId}`,
          amount: allocation.amount,
          currency: receipt.currency,
        })),
        documents: docs(receipt.documents),
        notes: receipt.notes,
        audit: [],
        source: link,
        sourceHref: focusHref('/ledger/revenue', receipt.date, receipt.currency, receipt.allocations[0] ? `REV-${receipt.allocations[0].targetId}` : receipt.id),
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectExpenses(ledger: Ledger, query: FinanceQuery) {
  const rows: LedgerRow[] = []
  const { settings, filters } = query
  for (const invoice of ledger.creditorInvoices) {
    if (invoice.exclude || !invoice.currency) continue
    const amount = round2(invoice.amount - invoice.creditNotes)
    const applied = appliedToCreditor(invoice.id, ledger.supplierPayments, filters.to)
    const outstanding = round2(amount - applied)
    const pipeline = stageOf(invoice.invoiceDate, invoice.pipeline, settings)
    const overdue = invoice.dueDate < filters.to && outstanding > 0.004
    rows.push(makeRow({
      id: `EXP-${invoice.id}`,
      date: invoice.invoiceDate,
      branch: invoice.branch,
      party: invoice.supplier,
      category: invoice.category,
      group: 'operating',
      groupLabel: label('operating', settings),
      status: outstanding <= 0.004 ? 'paid' : 'incurred',
      settle: outstanding <= 0.004 ? 'paid' : overdue ? 'overdue' : applied > 0 ? 'partial' : 'open',
      verify: invoice.verify,
      currency: invoice.currency,
      amount,
      creatorId: invoice.creatorId,
      pipeline,
      slotPaid: applied,
      slotOutstanding: Math.max(0, outstanding),
      slotOverdue: overdue ? Math.max(0, outstanding) : 0,
      values: {
        stream: 'Operating',
        category: invoice.category,
        supplier: invoice.supplier,
        location: invoice.branch,
        invoiceDate: invoice.invoiceDate,
        amount,
        approval: pipelineLabel(pipeline),
        paymentStatus: outstanding <= 0.004 ? 'Paid' : applied > 0 ? 'Partial' : 'Unpaid',
        currency: invoice.currency,
      },
      detail: makeDetail({
        title: invoice.reference,
        subtitle: 'Supplier invoice',
        amount,
        currency: invoice.currency,
        verify: invoice.verify,
        pipeline,
        creatorId: invoice.creatorId,
        domain: 'general',
        dates: [
          { label: 'Invoice', value: invoice.invoiceDate },
          { label: 'Due', value: invoice.dueDate },
        ],
        facts: [
          { label: 'Supplier', value: invoice.supplier },
          { label: 'Allocated payments', value: formatMoney(applied, invoice.currency) },
          { label: 'Still outstanding', value: formatMoney(Math.max(0, outstanding), invoice.currency) },
        ],
        allocations: [],
        documents: docs(invoice.documents),
        notes: invoice.notes,
        audit: [],
        source: invoice.id,
        sourceHref: focusHref('/payables/creditors', invoice.invoiceDate, invoice.currency, invoice.id),
      }),
    }))
  }
  for (const line of ledger.payroll) {
    const gross = grossPay(line)
    const pipeline = stageOf(line.payDate, line.pipeline, settings)
    rows.push(payrollExpense(line, gross, pipeline, settings))
  }
  for (const item of ledger.statutory) {
    if (item.kind !== 'employer') continue
    const pipeline = stageOf(item.dueDate, item.pipeline, settings)
    rows.push(makeRow({
      id: `EXP-${item.id}`,
      date: item.dueDate,
      branch: item.branch,
      party: item.authority,
      category: item.type,
      group: 'statutory',
      groupLabel: label('statutory', settings),
      status: 'incurred',
      settle: item.paid >= item.assessed - 0.004 ? 'paid' : 'open',
      verify: item.verify,
      currency: item.currency,
      amount: item.assessed,
      creatorId: item.creatorId,
      pipeline,
      slotPaid: item.paid,
      slotOutstanding: round2(Math.max(0, item.assessed - item.paid)),
      values: {
        stream: 'Statutory',
        category: item.type,
        supplier: item.authority,
        location: item.branch,
        invoiceDate: item.dueDate,
        amount: item.assessed,
        approval: pipelineLabel(pipeline),
        paymentStatus: item.paid >= item.assessed - 0.004 ? 'Paid' : 'Unpaid',
        currency: item.currency,
      },
      detail: makeDetail({
        title: item.type,
        subtitle: 'Statutory cost',
        amount: item.assessed,
        currency: item.currency,
        verify: item.verify,
        pipeline,
        creatorId: item.creatorId,
        domain: 'general',
        dates: [{ label: 'Due', value: item.dueDate }],
        facts: [{ label: 'Payroll period', value: item.payrollPeriod }],
        allocations: [],
        documents: docs(item.documents),
        notes: item.notes,
        audit: [],
        source: item.id,
        sourceHref: focusHref('/expenses/statutory', item.dueDate, item.currency, item.id),
      }),
    }))
  }
  for (const week of ledger.hqWeeks) {
    for (const voucher of week.vouchers) {
      const pipeline = stageOf(voucher.date, week.pipeline, settings)
      rows.push(pettyExpense('hq-petty', 'HQ petty cash', week.branch, week.currency, week.custodian, week.creatorId, week.verify, pipeline, voucher, week.id, voucher.receiptAttached ? week.notes : 'Missing receipt image. Still a petty-cash expense, flagged unreconciled.'))
    }
  }
  for (const day of ledger.maraDays) {
    for (const voucher of day.vouchers) {
      const pipeline = stageOf(voucher.date, day.pipeline, settings)
      rows.push(pettyExpense('mara-petty', 'Mara petty cash', 'Mara', day.currency, day.custodian, day.creatorId, voucher.receiptAttached ? day.verify : 'unreconciled', pipeline, day.vouchers[0] && voucher.id === day.vouchers[0].id ? { ...voucher } : voucher, day.id, day.notes, 'mara'))
    }
  }
  return gate(rows, filters, query.drill)
}

function payrollExpense(line: PayrollLine, gross: number, pipeline: import('@/types').PipelineStage, settings: AppSettings) {
  return makeRow({
    id: `EXP-${line.id}`,
    date: line.payDate,
    branch: line.branch,
    party: line.employee,
    category: line.dept,
    group: 'payroll',
    groupLabel: label('payroll', settings),
    status: line.paid ? 'paid' : 'unpaid',
    settle: line.paid ? 'paid' : 'open',
    verify: line.verify,
    currency: line.currency,
    amount: gross,
    creatorId: line.creatorId,
    pipeline,
    slotPaid: line.paid ? netPay(line) : 0,
    slotOutstanding: line.paid ? 0 : netPay(line),
    values: {
      stream: 'Payroll',
      category: line.dept,
      supplier: line.employee,
      location: line.branch,
      invoiceDate: line.payDate,
      amount: gross,
      approval: pipelineLabel(pipeline),
      paymentStatus: line.paid ? 'Paid' : 'Unpaid',
      currency: line.currency,
    },
    detail: makeDetail({
      title: line.employee,
      subtitle: 'Payroll',
      amount: gross,
      currency: line.currency,
      verify: line.verify,
      pipeline,
      creatorId: line.creatorId,
      domain: 'general',
      dates: [{ label: 'Pay date', value: line.payDate }],
      facts: [
        { label: 'Period', value: line.period },
        { label: 'Net', value: formatMoney(netPay(line), line.currency) },
      ],
      allocations: [],
      documents: docs(line.documents),
      notes: line.notes,
      audit: [],
      source: line.id,
      sourceHref: focusHref('/expenses/payroll', line.payDate, line.currency, line.id),
    }),
  })
}

function pettyExpense(
  group: 'hq-petty' | 'mara-petty',
  stream: string,
  branch: 'HQ' | 'Mara',
  currency: CurrencyCode,
  party: string,
  creatorId: string,
  verify: import('@/types').VerifyStatus,
  pipeline: import('@/types').PipelineStage,
  voucher: { id: string; date: string; category: string; merchant: string; amount: number; description: string; receiptAttached: boolean },
  sourceId: string,
  notes: string,
  domain: 'hq' | 'mara' = 'hq',
) {
  return makeRow({
    id: `EXP-${voucher.id}`,
    date: voucher.date,
    branch,
    party: voucher.merchant,
    category: voucher.category,
    group,
    groupLabel: stream,
    status: voucher.receiptAttached ? 'voucher' : 'missing-receipt',
    settle: 'paid',
    verify: voucher.receiptAttached ? verify : 'unreconciled',
    currency,
    amount: voucher.amount,
    creatorId,
    pipeline,
    slotPaid: voucher.amount,
    values: {
      stream,
      category: voucher.category,
      supplier: voucher.merchant,
      location: branch,
      invoiceDate: voucher.date,
      amount: voucher.amount,
      approval: pipelineLabel(pipeline),
      paymentStatus: 'Petty voucher',
      currency,
    },
    detail: makeDetail({
      title: voucher.id,
      subtitle: 'Petty cash',
      amount: voucher.amount,
      currency,
      verify: voucher.receiptAttached ? verify : 'unreconciled',
      pipeline,
      creatorId,
      domain,
      dates: [{ label: 'Voucher date', value: voucher.date }],
      facts: [
        { label: 'Custodian', value: party },
        { label: 'Receipt image', value: voucher.receiptAttached ? 'Attached' : 'Missing' },
      ],
      allocations: [],
      documents: voucher.receiptAttached ? docs(['receipt-image.pdf']) : [],
      notes,
      audit: [],
      source: sourceId,
      sourceHref: focusHref(domain === 'hq' ? '/expenses/hq-petty' : '/expenses/mara-petty', voucher.date, currency, sourceId),
    }),
  })
}

export function selectPayroll(ledger: Ledger, query: FinanceQuery) {
  const rows = ledger.payroll.map((line) => {
    const gross = grossPay(line)
    const deductions = round2(line.withheldPaye + line.withheldNssf + line.otherDeduction)
    const net = netPay(line)
    const pipeline = stageOf(line.payDate, line.pipeline, query.settings)
    return makeRow({
      id: line.id,
      date: line.payDate,
      branch: line.branch,
      party: line.employee,
      category: line.dept,
      group: line.dept,
      groupLabel: line.dept,
      status: line.paid ? 'paid' : 'unpaid',
      settle: line.paid ? 'paid' : 'open',
      verify: line.verify,
      currency: line.currency,
      amount: gross,
      creatorId: line.creatorId,
      pipeline,
      slotPaid: line.paid ? net : 0,
      slotOutstanding: line.paid ? 0 : net,
      values: {
        period: line.period,
        employee: line.employee,
        dept: line.dept,
        gross,
        deductions,
        net,
        paid: line.paid ? 'Paid' : 'Unpaid',
        currency: line.currency,
      },
      detail: makeDetail({
        title: line.employee,
        subtitle: `${line.dept} · ${line.branch}`,
        amount: gross,
        currency: line.currency,
        verify: line.verify,
        pipeline,
        creatorId: line.creatorId,
        domain: 'general',
        dates: [{ label: 'Pay date', value: line.payDate }, { label: 'Period', value: line.period }],
        facts: [
          { label: 'Base', value: formatMoney(line.base, line.currency) },
          { label: 'Allowances', value: formatMoney(line.allowances, line.currency) },
          { label: 'Overtime', value: formatMoney(line.overtime, line.currency) },
          { label: 'PAYE withheld', value: formatMoney(line.withheldPaye, line.currency) },
          { label: 'NSSF withheld', value: formatMoney(line.withheldNssf, line.currency) },
          { label: 'Other deduction', value: formatMoney(line.otherDeduction, line.currency) },
          { label: 'Bank ref', value: line.bankRef || '—' },
        ],
        allocations: [],
        documents: docs(line.documents),
        notes: line.notes,
        audit: [],
        source: `Payroll ${line.period}`,
        sourceHref: focusHref('/expenses/statutory', line.payDate, line.currency, `STAT-PAYE-${line.period.slice(5)}`),
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectStatutory(ledger: Ledger, query: FinanceQuery) {
  const rows = ledger.statutory.map((item) => {
    const balance = round2(item.assessed - item.paid)
    const pipeline = stageOf(item.dueDate, item.pipeline, query.settings)
    const overdue = item.dueDate < query.filters.to && balance > 0.004
    return makeRow({
      id: item.id,
      date: item.dueDate,
      branch: item.branch,
      party: item.authority,
      category: item.type,
      group: item.kind,
      groupLabel: item.kind === 'employer' ? 'Employer cost' : 'Withheld liability',
      status: item.kind,
      settle: balance <= 0.004 ? 'paid' : overdue ? 'overdue' : 'open',
      verify: item.verify,
      currency: item.currency,
      amount: balance,
      creatorId: item.creatorId,
      pipeline,
      slotPaid: item.paid,
      slotOutstanding: balance,
      slotOverdue: overdue ? balance : 0,
      values: {
        authority: item.authority,
        type: item.type,
        period: item.period,
        due: item.dueDate,
        assessed: item.assessed,
        paid: item.paid,
        balance,
        currency: item.currency,
      },
      detail: makeDetail({
        title: item.type,
        subtitle: item.kind === 'withheld' ? 'Payroll withholding' : 'Employer contribution',
        amount: balance,
        currency: item.currency,
        verify: item.verify,
        pipeline,
        creatorId: item.creatorId,
        domain: 'general',
        dates: [{ label: 'Due', value: item.dueDate }, { label: 'Paid', value: item.paidDate ?? '—' }],
        facts: [
          { label: 'Assessed', value: formatMoney(item.assessed, item.currency) },
          { label: 'Paid', value: formatMoney(item.paid, item.currency) },
          { label: 'Payroll period', value: item.payrollPeriod },
        ],
        allocations: [],
        documents: docs(item.documents),
        notes: item.notes,
        audit: [],
        source: item.payrollPeriod,
        sourceHref: focusHref('/expenses/payroll', `${item.period}-28`, item.currency, `PRL-${item.period.slice(5)}-1`),
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectPayments(ledger: Ledger, query: FinanceQuery) {
  const rows = ledger.supplierPayments.map((payment) => {
    const allocated = round2(payment.allocations.reduce((sum, allocation) => sum + allocation.amount, 0))
    const pipeline = stageOf(payment.date, payment.pipeline, query.settings)
    const match = payment.allocations.length
      ? payment.allocations.map((allocation) => {
          const invoice = ledger.creditorInvoices.find((item) => item.id === allocation.invoiceId)
          return `${invoice?.reference ?? allocation.invoiceId} ${formatMoney(allocation.amount, payment.currency)}`
        }).join('; ')
      : 'Unmatched'
    return makeRow({
      id: payment.id,
      date: payment.date,
      branch: payment.branch,
      party: payment.supplier,
      category: payment.unmatched ? 'Unmatched' : 'Allocated',
      group: payment.unmatched ? 'unmatched' : 'allocated',
      groupLabel: payment.unmatched ? 'Unmatched' : 'Allocated',
      status: payment.unmatched ? 'unmatched' : 'allocated',
      settle: payment.unmatched ? 'open' : 'paid',
      verify: payment.verify,
      currency: payment.currency,
      amount: payment.amount,
      creatorId: payment.creatorId,
      pipeline,
      slotPaid: allocated,
      slotOutstanding: round2(payment.amount - allocated),
      values: {
        supplier: payment.supplier,
        date: payment.date,
        match,
        method: payment.method,
        bankRef: payment.bankRef,
        amount: payment.amount,
        allocated,
        unallocated: round2(payment.amount - allocated),
        currency: payment.currency,
      },
      detail: makeDetail({
        title: payment.bankRef || payment.id,
        subtitle: 'Supplier payment',
        amount: payment.amount,
        currency: payment.currency,
        verify: payment.verify,
        pipeline,
        creatorId: payment.creatorId,
        domain: 'general',
        dates: [{ label: 'Paid', value: payment.date }],
        facts: [{ label: 'Method', value: payment.method }, { label: 'Supplier', value: payment.supplier }],
        allocations: payment.allocations.map((allocation) => ({
          label: ledger.creditorInvoices.find((item) => item.id === allocation.invoiceId)?.reference ?? allocation.invoiceId,
          amount: allocation.amount,
          currency: payment.currency,
          note: payment.allocations.length > 1 ? 'Split payment' : undefined,
        })),
        documents: docs(payment.documents),
        notes: payment.notes,
        audit: [],
        source: payment.id,
        sourceHref: focusHref('/payables/creditors', payment.date, payment.currency, payment.allocations[0]?.invoiceId ?? payment.id),
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectPetty(ledger: Ledger, query: FinanceQuery, side: 'hq' | 'mara') {
  if (side === 'hq') {
    const rows = ledger.hqWeeks.map((week) => {
      const inflow = round2(week.replenishments.reduce((sum, item) => sum + item.amount, 0))
      const spend = round2(week.vouchers.reduce((sum, item) => sum + item.amount, 0))
      const adjustments = round2(week.adjustments.filter((item) => item.approved).reduce((sum, item) => sum + item.amount, 0))
      const closing = round2(week.opening + inflow - spend + adjustments)
      const variance = round2(week.physicalCount - closing)
      const pipeline = stageOf(week.weekStart, week.pipeline, query.settings)
      const verify = week.vouchers.some((voucher) => !voucher.receiptAttached) ? 'unreconciled' : week.verify
      return makeRow({
        id: week.id,
        date: week.weekStart,
        branch: 'HQ',
        party: week.custodian,
        category: 'Weekly float',
        group: 'hq-petty',
        groupLabel: 'HQ petty cash',
        status: pipelineLabel(pipeline),
        settle: 'na',
        verify,
        currency: week.currency,
        amount: spend,
        creatorId: week.creatorId,
        pipeline,
        slotPaid: inflow,
        slotOutstanding: closing,
        slotOverdue: variance,
        values: {
          week: week.weekStart,
          opening: week.opening,
          topups: inflow,
          vouchers: spend,
          balance: closing,
          variance,
          approval: pipelineLabel(pipeline),
          currency: week.currency,
        },
        detail: makeDetail({
          title: `HQ week ${week.weekStart}`,
          subtitle: 'HQ petty cash',
          amount: spend,
          currency: week.currency,
          verify,
          pipeline,
          creatorId: week.creatorId,
          domain: 'hq',
          dates: [{ label: 'Week starting', value: week.weekStart }],
          facts: [
            { label: 'Opening', value: formatMoney(week.opening, week.currency) },
            { label: 'Replenishments', value: formatMoney(inflow, week.currency) },
            { label: 'Vouchers', value: formatMoney(spend, week.currency) },
            { label: 'Computed closing', value: formatMoney(closing, week.currency) },
            { label: 'Physical count', value: formatMoney(week.physicalCount, week.currency) },
            { label: 'Reviewer', value: week.reviewer },
          ],
          allocations: week.vouchers.map((voucher) => ({
            label: `${voucher.category} · ${voucher.merchant}${voucher.receiptAttached ? '' : ' · missing receipt'}`,
            amount: voucher.amount,
            currency: week.currency,
          })),
          documents: docs(week.documents),
          notes: week.notes,
          audit: [],
          source: week.id,
          sourceHref: focusHref('/expenses', week.weekStart, week.currency, `EXP-${week.vouchers[0]?.id ?? week.id}`),
        }),
      })
    })
    return gate(rows, query.filters, query.drill)
  }
  const rows = ledger.maraDays.map((day) => {
    const inflow = round2(day.topUps.reduce((sum, item) => sum + item.amount, 0))
    const spend = round2(day.vouchers.reduce((sum, item) => sum + item.amount, 0))
    const adjustments = round2(day.adjustments.filter((item) => item.approved).reduce((sum, item) => sum + item.amount, 0))
    const closing = round2(day.opening + inflow - spend + adjustments)
    const variance = round2(day.physicalCount - closing)
    const pipeline = stageOf(day.date, day.pipeline, query.settings)
    const locked = query.settings.lockedDays.includes(day.date)
    const verify = Math.abs(variance) > 0.004 ? 'unreconciled' : day.verify
    return makeRow({
      id: day.id,
      date: day.date,
      branch: 'Mara',
      party: day.custodian,
      category: 'Daily float',
      group: 'mara-petty',
      groupLabel: 'Mara petty cash',
      status: locked ? 'locked' : pipelineLabel(pipeline),
      settle: 'na',
      verify,
      currency: day.currency,
      amount: spend,
      creatorId: day.creatorId,
      pipeline,
      slotPaid: inflow,
      slotOutstanding: closing,
      slotOverdue: variance,
      values: {
        day: day.date,
        opening: day.opening,
        inflow,
        outflow: spend,
        closing,
        variance,
        approval: locked ? 'Day locked' : pipelineLabel(pipeline),
        currency: day.currency,
      },
      detail: makeDetail({
        title: `Mara ${day.date}`,
        subtitle: 'Mara petty cash',
        amount: spend,
        currency: day.currency,
        verify,
        pipeline,
        creatorId: day.creatorId,
        domain: 'mara',
        dates: [{ label: 'Day', value: day.date }],
        facts: [
          { label: 'Opening', value: formatMoney(day.opening, day.currency) },
          { label: 'Top-ups (transfers)', value: formatMoney(inflow, day.currency) },
          { label: 'Vouchers', value: formatMoney(spend, day.currency) },
          { label: 'Computed closing', value: formatMoney(closing, day.currency) },
          { label: 'Physical count', value: formatMoney(day.physicalCount, day.currency) },
          { label: 'Handover', value: day.handover },
          { label: 'Lock', value: locked ? 'Locked' : 'Open' },
        ],
        allocations: day.vouchers.map((voucher) => ({ label: `${voucher.category} · ${voucher.merchant}`, amount: voucher.amount, currency: day.currency })),
        documents: docs(day.documents),
        notes: day.notes,
        audit: [],
        source: day.id,
        sourceHref: focusHref('/expenses', day.date, day.currency, `EXP-${day.vouchers[0]?.id ?? day.id}`),
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectLanding(ledger: Ledger, query: FinanceQuery) {
  const rows = ledger.landing.map((fee) => {
    const currency = fee.currency ?? 'MISSING'
    const difference = fee.currency && fee.sourceReported !== null ? round2(fee.sourceReported - fee.collected) : 0
    const pipeline = stageOf(fee.date, fee.pipeline, query.settings)
    return makeRow({
      id: fee.id,
      date: fee.date,
      branch: 'Mara',
      party: fee.operator,
      category: 'Landing fee',
      group: fee.operator,
      groupLabel: fee.operator,
      status: fee.currency ? 'recorded' : 'missing-currency',
      settle: fee.settled >= fee.collected - 0.004 && fee.currency ? 'paid' : 'open',
      verify: fee.verify,
      currency,
      amount: fee.collected,
      included: Boolean(fee.currency),
      creatorId: fee.creatorId,
      pipeline,
      slotPaid: fee.settled,
      slotOutstanding: fee.currency ? round2(Math.max(0, fee.collected - fee.settled)) : 0,
      values: {
        date: fee.date,
        flight: fee.flightRef,
        operator: fee.operator,
        collected: fee.collected,
        source: fee.sourceReported ?? fee.collected,
        difference,
        settled: fee.settled,
        currency: fee.currency ?? 'Missing',
      },
      detail: makeDetail({
        title: fee.id,
        subtitle: fee.actualNote,
        amount: fee.collected,
        currency,
        verify: fee.verify,
        pipeline,
        creatorId: fee.creatorId,
        domain: 'general',
        dates: [{ label: 'Date', value: fee.date }],
        facts: [
          { label: 'Flight', value: fee.flightRef },
          { label: 'Source-reported', value: fee.sourceReported === null || !fee.currency ? '—' : formatMoney(fee.sourceReported, fee.currency) },
          { label: 'Recalculated', value: fee.currency ? formatMoney(fee.collected, fee.currency) : 'Currency missing' },
          { label: 'Kept outside ticket revenue', value: 'Yes' },
        ],
        allocations: [],
        documents: docs(fee.documents),
        notes: fee.notes,
        audit: [],
        source: fee.flightRef,
        sourceHref: focusHref('/operations/landing-fees', fee.date, currency, fee.id),
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectAllocations(ledger: Ledger, query: FinanceQuery) {
  const rows = ledger.allocationMonths.map((month) => {
    const pipeline = stageOf(`${month.month}-01`, month.pipeline, query.settings)
    return makeRow({
      id: month.id,
      date: `${month.month}-01`,
      branch: 'Mara',
      party: month.beneficiary,
      category: 'Landing allocation',
      group: month.ruleId,
      groupLabel: month.beneficiary,
      status: 'blocked',
      settle: 'open',
      verify: month.verify,
      currency: month.currency,
      amount: month.actual,
      creatorId: month.creatorId,
      pipeline,
      slotPaid: month.paid,
      slotOutstanding: 0,
      values: {
        month: month.month,
        beneficiary: month.beneficiary,
        actual: month.actual,
        reduced40: month.reduced40,
        divided13: month.dividedBy13,
        allocated: 'Not posted',
        paid: month.paid,
        posting: 'Automatic posting prohibited until approved',
        currency: month.currency,
      },
      detail: makeDetail({
        title: month.id,
        subtitle: 'Allocation month',
        amount: month.actual,
        currency: month.currency,
        verify: month.verify,
        pipeline,
        creatorId: month.creatorId,
        domain: 'general',
        dates: [{ label: 'Month', value: month.month }],
        facts: [
          { label: 'Reduced 40% (flagged)', value: formatMoney(month.reduced40, month.currency) },
          { label: 'Divided by 13 (flagged)', value: formatMoney(month.dividedBy13, month.currency) },
          { label: 'Allocated', value: 'Not posted' },
          { label: 'Rule', value: month.ruleId },
        ],
        allocations: [],
        documents: docs(month.documents),
        notes: month.notes,
        audit: [],
        source: month.ruleId,
        sourceHref: '/operations/allocations',
      }),
    })
  })
  return gate(rows, query.filters, query.drill)
}

export function selectCash(ledger: Ledger, query: FinanceQuery) {
  const receipts = selectReceipts(ledger, { ...query, drill: { drill: '', month: '', bucket: '', txn: '' } })
  const payments = selectPayments(ledger, { ...query, drill: { drill: '', month: '', bucket: '', txn: '' } })
  const rows: LedgerRow[] = []
  for (const row of receipts) {
    if (!row.included) continue
    rows.push(makeRow({ ...row, id: `IN-${row.id}`, group: 'cash-in', groupLabel: 'Cash in', category: 'Cash in', amount: row.amount }))
  }
  for (const row of payments) {
    if (!row.included) continue
    rows.push(makeRow({
      ...row,
      id: `OUT-${row.id}`,
      group: 'cash-out',
      groupLabel: 'Cash out',
      category: 'Cash out',
      party: String(row.values.supplier ?? row.party),
    }))
  }
  for (const line of ledger.payroll) {
    if (!line.paid) continue
    const net = netPay(line)
    rows.push(makeRow({
      id: `OUT-${line.id}`,
      date: line.payDate,
      branch: line.branch,
      party: line.employee,
      category: 'Cash out',
      group: 'cash-out',
      groupLabel: 'Cash out',
      status: 'payroll',
      settle: 'paid',
      verify: line.verify,
      currency: line.currency,
      amount: net,
      creatorId: line.creatorId,
      pipeline: stageOf(line.payDate, line.pipeline, query.settings),
      values: { date: line.payDate, direction: 'Cash out', party: line.employee, reference: line.bankRef || line.id, amount: net, currency: line.currency },
      detail: makeDetail({
        title: line.id,
        subtitle: 'Net pay',
        amount: net,
        currency: line.currency,
        verify: line.verify,
        pipeline: line.pipeline,
        creatorId: line.creatorId,
        domain: 'general',
        dates: [{ label: 'Pay date', value: line.payDate }],
        facts: [],
        allocations: [],
        documents: docs(line.documents),
        notes: line.notes,
        audit: [],
        source: line.id,
        sourceHref: focusHref('/expenses/payroll', line.payDate, line.currency, line.id),
      }),
    }))
  }
  for (const item of ledger.statutory) {
    if (!item.paidDate || item.paid <= 0) continue
    rows.push(makeRow({
      id: `OUT-${item.id}`,
      date: item.paidDate,
      branch: item.branch,
      party: item.authority,
      category: 'Cash out',
      group: 'cash-out',
      groupLabel: 'Cash out',
      status: 'statutory',
      settle: 'paid',
      verify: item.verify,
      currency: item.currency,
      amount: item.paid,
      creatorId: item.creatorId,
      pipeline: stageOf(item.paidDate, item.pipeline, query.settings),
      values: { date: item.paidDate, direction: 'Cash out', party: item.authority, reference: item.id, amount: item.paid, currency: item.currency },
      detail: makeDetail({
        title: item.id,
        subtitle: 'Statutory remittance',
        amount: item.paid,
        currency: item.currency,
        verify: item.verify,
        pipeline: item.pipeline,
        creatorId: item.creatorId,
        domain: 'general',
        dates: [{ label: 'Paid', value: item.paidDate }],
        facts: [],
        allocations: [],
        documents: docs(item.documents),
        notes: item.notes,
        audit: [],
        source: item.id,
        sourceHref: focusHref('/expenses/statutory', item.paidDate, item.currency, item.id),
      }),
    }))
  }
  for (const row of selectExpenses(ledger, { ...query, drill: { drill: '', month: '', bucket: '', txn: '' } })) {
    if (row.group !== 'hq-petty' && row.group !== 'mara-petty') continue
    rows.push(makeRow({
      ...row,
      id: `OUT-${row.id}`,
      group: 'cash-out',
      groupLabel: 'Cash out',
      category: 'Cash out',
    }))
  }
  const normalized = rows.map((row) => makeRow({
    ...row,
    values: {
      date: row.date,
      direction: row.groupLabel,
      party: row.party,
      reference: String(row.values.bankRef ?? row.values.reference ?? row.values.link ?? row.id),
      amount: row.amount,
      currency: row.currency === 'MISSING' ? 'Missing' : row.currency,
    },
  }))
  return gate(normalized, query.filters, query.drill)
}

export function selectCreditors(ledger: Ledger, query: FinanceQuery) {
  const sheet: HorizontalRow[] = []
  for (const invoice of ledger.creditorInvoices) {
    const currency = invoice.currency ?? 'MISSING'
    const allocated = invoice.currency ? appliedToCreditor(invoice.id, ledger.supplierPayments, query.filters.to) : 0
    const outstanding = invoice.currency ? creditorBalance(invoice, ledger.supplierPayments, query.filters.to) : 0
    const overdue = invoice.dueDate < query.filters.to && outstanding > 0.004
    const settle = !invoice.currency || invoice.exclude ? 'na' : outstanding <= 0.004 ? 'paid' : overdue ? 'overdue' : allocated > 0 ? 'partial' : 'open'
    const payments = ledger.supplierPayments.flatMap((payment) => {
      const mine = payment.allocations.filter((allocation) => allocation.invoiceId === invoice.id)
      if (!mine.length) return []
      const split = payment.allocations
        .filter((allocation) => allocation.invoiceId !== invoice.id)
        .map((allocation) => ({
          invoiceId: allocation.invoiceId,
          reference: ledger.creditorInvoices.find((item) => item.id === allocation.invoiceId)?.reference ?? allocation.invoiceId,
          amount: allocation.amount,
        }))
      return mine.map((allocation) => ({
        date: payment.date,
        amount: allocation.amount,
        reference: payment.bankRef,
        paymentId: payment.id,
        afterPeriod: payment.date > query.filters.to,
        split,
      }))
    }).sort((a, b) => a.date.localeCompare(b.date))
    sheet.push({
      id: invoice.id,
      supplier: invoice.supplier,
      category: invoice.category,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      amount: invoice.amount,
      currency,
      reference: invoice.reference,
      payments,
      creditNotes: invoice.creditNotes,
      allocated,
      outstanding: Math.max(0, outstanding),
      status: invoice.duplicateOf ? 'Duplicate — excluded' : !invoice.currency ? 'Missing currency' : settle,
      aging: invoice.currency && !invoice.exclude ? bucketFor(invoice.dueDate, query.filters.to, Math.max(0, outstanding)) : '—',
      verify: invoice.verify,
      balanceStatus: 'Unverified',
      included: Boolean(invoice.currency) && !invoice.exclude,
      branch: invoice.branch,
      creatorId: invoice.creatorId,
      pipeline: stageOf(invoice.invoiceDate, invoice.pipeline, query.settings),
      documents: invoice.documents,
      notes: invoice.notes,
      sample: false,
      duplicateOf: invoice.duplicateOf,
    })
  }
  const filtered = sheet.filter((row) => {
    if (row.invoiceDate < query.filters.from || row.invoiceDate > query.filters.to) return false
    if (query.filters.branch !== 'All' && row.branch !== query.filters.branch) return false
    if (query.filters.currency !== 'ALL' && row.currency !== query.filters.currency) return false
    const party = query.filters.party.trim().toLowerCase()
    if (party && !`${row.supplier} ${row.category} ${row.reference}`.toLowerCase().includes(party)) return false
    if (query.filters.status !== 'all') {
      if (['verified', 'source-reported', 'estimated', 'unreconciled'].includes(query.filters.status) && row.verify !== query.filters.status) return false
      if (query.filters.status === 'paid' && row.status !== 'paid') return false
      if (query.filters.status === 'overdue' && row.aging !== 'Not due' && row.outstanding > 0 && row.dueDate < query.filters.to) {
        // keep
      } else if (query.filters.status === 'overdue') return false
      if (query.filters.status === 'open' && !(row.outstanding > 0)) return false
      if (query.filters.status === 'partial' && !(row.allocated > 0 && row.outstanding > 0)) return false
    }
    if (query.drill.drill && ![row.supplier, row.category, row.id, row.reference].includes(query.drill.drill)) return false
    if (query.drill.month && row.invoiceDate.slice(0, 7) !== query.drill.month) return false
    if (query.drill.bucket && row.aging !== query.drill.bucket) return false
    return true
  })
  const rows: LedgerRow[] = filtered.map((row) => makeRow({
    id: row.id,
    date: row.invoiceDate,
    branch: row.branch,
    party: row.supplier,
    category: row.category,
    group: row.supplier,
    groupLabel: row.supplier,
    bucket: row.aging,
    status: row.status,
    settle: row.outstanding <= 0.004 ? 'paid' : row.dueDate < query.filters.to ? 'overdue' : row.allocated > 0 ? 'partial' : 'open',
    verify: row.included ? 'unreconciled' : row.verify,
    currency: row.currency,
    amount: row.outstanding,
    included: row.included,
    creatorId: row.creatorId,
    pipeline: row.pipeline,
    slotPaid: row.allocated,
    slotOutstanding: row.outstanding,
    slotOverdue: row.dueDate < query.filters.to ? row.outstanding : 0,
    values: {
      supplier: row.supplier,
      category: row.category,
      invoiceDate: row.invoiceDate,
      reference: row.reference,
      invoiced: row.amount,
      credits: row.creditNotes,
      allocated: row.allocated,
      outstanding: row.outstanding,
      status: row.status,
      aging: row.aging,
      currency: row.currency === 'MISSING' ? 'Missing' : row.currency,
      balanceStatus: 'Unverified',
    },
    detail: makeDetail({
      title: row.reference,
      subtitle: 'Creditor balance',
      amount: row.outstanding,
      currency: row.currency,
      verify: 'unreconciled',
      pipeline: row.pipeline,
      creatorId: row.creatorId,
      domain: 'general',
      dates: [{ label: 'Invoice', value: row.invoiceDate }, { label: 'Due', value: row.dueDate }],
      facts: [
        { label: 'Invoiced', value: row.currency === 'MISSING' ? 'Currency missing' : formatMoney(row.amount, row.currency) },
        { label: 'Balance status', value: 'Unverified' },
        { label: 'Opening balance', value: 'Not provided' },
      ],
      allocations: row.payments.map((payment) => ({
        label: `${payment.date} · ${payment.reference}${payment.afterPeriod ? ' · after period end' : ''}${payment.split.length ? ' · split' : ''}`,
        amount: payment.amount,
        currency: row.currency,
      })),
      documents: docs(row.documents),
      notes: row.notes,
      audit: [],
      source: row.id,
      sourceHref: focusHref('/expenses', row.invoiceDate, row.currency, `EXP-${row.id}`),
    }),
  }))
  return { rows, sheet: filtered }
}

export function selectPnl(revenue: LedgerRow[], expenses: LedgerRow[]) {
  const map = new Map<string, LedgerRow[]>()
  const put = (row: LedgerRow) => {
    if (!row.included || row.currency === 'MISSING') return
    const key = `${row.month}|${row.group}|${row.currency}|${row.amount >= 0 ? 'r' : 'c'}`
    map.set(key, [...(map.get(key) ?? []), row])
  }
  revenue.forEach(put)
  expenses.forEach((row) => put(makeRow({ ...row, amount: -Math.abs(row.amount) })))
  return [...map.entries()].map(([key, group]) => {
    const [month, groupId, currency] = key.split('|')
    const amount = round2(group.reduce((sum, row) => sum + row.amount, 0))
    const head = group[0]!
    return makeRow({
      id: `PNL-${key}`,
      date: `${month}-15`,
      branch: head.branch,
      party: head.groupLabel,
      category: amount >= 0 ? 'Revenue' : 'Cost',
      group: groupId!,
      groupLabel: head.groupLabel,
      status: amount >= 0 ? 'revenue' : 'cost',
      settle: 'na',
      verify: worst(group.map((row) => row.verify)),
      currency: currency as CurrencyCode,
      amount,
      creatorId: 'finance-manager',
      pipeline: 'post',
      values: {
        line: amount >= 0 ? 'Recognized revenue' : 'Attributable cost',
        stream: head.groupLabel,
        amount,
        currency,
        note: amount >= 0 ? 'From the revenue ledger' : 'Cost only. Supplier settlements are not repeated here.',
      },
      detail: makeDetail({
        title: head.groupLabel,
        subtitle: 'P&L line',
        amount,
        currency: currency as CurrencyCode,
        verify: worst(group.map((row) => row.verify)),
        pipeline: 'post',
        creatorId: 'finance-manager',
        domain: 'general',
        dates: [{ label: 'Month', value: month! }],
        facts: [],
        allocations: [],
        documents: [],
        notes: 'Built from the same rows as the revenue and expense ledgers.',
        audit: [],
        source: groupId!,
        sourceHref: amount >= 0 ? '/ledger/revenue' : '/ledger/expenses',
        requiresEvidence: false,
      }),
    })
  })
}
