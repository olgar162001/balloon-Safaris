import type {
  AllocationMonth,
  AllocationRule,
  AuditEvent,
  CreditorInvoice,
  CustomerParty,
  DebtorInvoice,
  HqWeek,
  LandingFee,
  Ledger,
  MaraDay,
  PayrollLine,
  PdTxn,
  Receipt,
  StatutoryItem,
  SupplierPayment,
  Voucher,
} from '@/types'
import { round2 } from '@/lib/format'

const mm = (m: number) => String(m).padStart(2, '0')
const day = (m: number, d: number) => `2026-${mm(m)}-${String(d).padStart(2, '0')}`

const CUSTOMERS: CustomerParty[] = [
  { id: 'c1', name: 'Savanna Trail Agents', limitKes: 2_500_000, contact: 'accounts@demo.local' },
  { id: 'c2', name: 'Mara Ridge Camps', limitKes: 1_800_000, contact: 'finance@demo.local' },
  { id: 'c3', name: 'Horizon Desk Bookings', limitKes: 1_200_000, contact: 'billing@demo.local' },
  { id: 'c4', name: 'Rift Valley Travel Desk', limitKes: 900_000, contact: 'ap@demo.local' },
  { id: 'c5', name: 'Walk-in Guest A', limitKes: 400_000, contact: 'guest-a@demo.local' },
  { id: 'c6', name: 'Walk-in Guest J', limitKes: 400_000, contact: 'guest-j@demo.local' },
]

const AGENTS = ['Savanna Trail Agents', 'Mara Ridge Camps', 'Direct desk', 'Horizon Desk Bookings']
const GUESTS = ['Savanna Trail Agents', 'Mara Ridge Camps', 'Horizon Desk Bookings', 'Rift Valley Travel Desk', 'Walk-in Guest A', 'Walk-in Guest J']

const doc = {
  creatorId: 'accountant-1',
  pipeline: 'reconcile' as const,
  documents: ['supporting-schedule.pdf'],
  notes: 'Demo record. Not a filed company balance.',
}

function build(): Ledger {
  const vouchers: Voucher[] = []
  const pd: PdTxn[] = []
  const invoices: DebtorInvoice[] = []
  const creditorInvoices: CreditorInvoice[] = []

  for (let m = 1; m <= 10; m++) {
    const billedA = 80_000 + m * 5_000
    vouchers.push({
      ...doc,
      id: `VCH-${mm(m)}-A`,
      bookingId: `BK-${mm(m)}-A`,
      customer: GUESTS[m % GUESTS.length]!,
      agent: AGENTS[m % AGENTS.length]!,
      pax: 2 + (m % 3),
      flightDate: day(m, 8),
      bookingDate: day(m, 2),
      currency: 'KES',
      price: billedA,
      discount: 0,
      billed: billedA,
      received: billedA,
      receiptDate: day(m, 2),
      bankAccount: 'Demo bank · KES collections',
      settlementRef: `EFT-VCH-${mm(m)}-A`,
      refund: 0,
      refundDate: null,
      flightStatus: 'flown',
      creditNote: 0,
      branch: 'HQ',
      verify: m % 4 === 0 ? 'verified' : 'source-reported',
      creatorId: m === 10 ? 'finance-manager' : 'accountant-1',
      pipeline: m === 10 ? 'submit' : 'reconcile',
      documents: ['voucher-scan.pdf'],
    })

    const billedB = 45_000 + m * 2_000
    const nextFlight = m === 10 ? '2026-11-15' : day(m + 1, 15)
    vouchers.push({
      ...doc,
      id: `VCH-${mm(m)}-B`,
      bookingId: `BK-${mm(m)}-B`,
      customer: GUESTS[(m + 2) % GUESTS.length]!,
      agent: AGENTS[(m + 1) % AGENTS.length]!,
      pax: 2,
      flightDate: nextFlight,
      bookingDate: day(m, 3),
      currency: 'KES',
      price: billedB,
      discount: 0,
      billed: billedB,
      received: billedB,
      receiptDate: day(m, 3),
      bankAccount: 'Demo bank · KES collections',
      settlementRef: `EFT-VCH-${mm(m)}-B`,
      refund: 0,
      refundDate: null,
      flightStatus: 'payment-confirmed',
      creditNote: 0,
      branch: 'HQ',
      verify: 'source-reported',
      pipeline: 'post',
      documents: ['voucher-scan.pdf'],
      notes: 'Cash collected before the flight. Not earned again when the balloon flies, under the delivery policy.',
    })

    if (m % 2 === 0) {
      const usd = 1_500 + m * 100
      vouchers.push({
        ...doc,
        id: `VCH-${mm(m)}-C`,
        bookingId: `BK-${mm(m)}-C`,
        customer: 'Walk-in Guest J',
        agent: 'Direct desk',
        pax: 2,
        flightDate: day(m, 12),
        bookingDate: day(m, 4),
        currency: 'USD',
        price: usd,
        discount: 0,
        billed: usd,
        received: usd,
        receiptDate: day(m, 4),
        bankAccount: 'Demo bank · USD collections',
        settlementRef: `EFT-VCH-${mm(m)}-C`,
        refund: 0,
        refundDate: null,
        flightStatus: 'flown',
        creditNote: 0,
        branch: 'HQ',
        verify: 'source-reported',
        documents: ['voucher-scan.pdf'],
      })
    }

    if (m === 3 || m === 6 || m === 9) {
      const gbp = 900 + m * 20
      vouchers.push({
        ...doc,
        id: `VCH-${mm(m)}-G`,
        bookingId: `BK-${mm(m)}-G`,
        customer: 'Walk-in Guest A',
        agent: 'Savanna Trail Agents',
        pax: 1,
        flightDate: day(m, 19),
        bookingDate: day(m, 6),
        currency: 'GBP',
        price: gbp,
        discount: 0,
        billed: gbp,
        received: gbp,
        receiptDate: day(m, 6),
        bankAccount: 'Demo bank · GBP collections',
        settlementRef: `EFT-VCH-${mm(m)}-G`,
        refund: 0,
        refundDate: null,
        flightStatus: 'flown',
        creditNote: 0,
        branch: 'HQ',
        verify: 'source-reported',
        documents: ['voucher-scan.pdf'],
      })
    }

    const rate1 = 6_000 + m * 200
    pd.push({
      ...doc,
      id: `PD-${mm(m)}-1`,
      date: day(m, 5),
      flightRef: `FL-${mm(m)}-05`,
      bookingRef: `BK-PD-${mm(m)}-1`,
      pax: 2,
      rate: rate1,
      currency: 'KES',
      gross: rate1 * 2,
      discount: 0,
      method: m % 2 ? 'Cash' : 'M-Pesa',
      cashier: 'Demo · Mara Cashier',
      receiptNo: `MRC-${mm(m)}-05`,
      depositRef: `DEP-${mm(m)}-05`,
      shift: 'AM',
      settlement: 'deposited',
      verify: 'source-reported',
      branch: 'Mara',
      creatorId: 'mara-cashier',
      documents: ['pd-receipt.pdf'],
      notes: 'Same-day Mara collection. Definition of PD is pending sign-off.',
    })
    const rate2 = 7_500 + m * 250
    pd.push({
      ...doc,
      id: `PD-${mm(m)}-2`,
      date: day(m, 18),
      flightRef: `FL-${mm(m)}-18`,
      bookingRef: `BK-PD-${mm(m)}-2`,
      pax: 3,
      rate: rate2,
      currency: 'KES',
      gross: rate2 * 3,
      discount: m === 10 ? 1_500 : 0,
      method: 'Card',
      cashier: 'Demo · Mara Cashier',
      receiptNo: `MRC-${mm(m)}-18`,
      depositRef: `DEP-${mm(m)}-18`,
      shift: 'PM',
      settlement: m === 10 ? 'pending' : 'deposited',
      verify: m === 10 ? 'unreconciled' : 'source-reported',
      branch: 'Mara',
      creatorId: 'mara-cashier',
      pipeline: m === 10 ? 'attach' : 'reconcile',
      documents: m === 10 ? [] : ['pd-receipt.pdf'],
      notes: m === 10 ? 'Receipt image missing. Daily deposit not matched.' : 'Same-day Mara collection.',
    })
    const usdPd = 400 + m * 20
    pd.push({
      ...doc,
      id: `PD-${mm(m)}-U`,
      date: day(m, 11),
      flightRef: `FL-${mm(m)}-11`,
      bookingRef: `BK-PD-${mm(m)}-U`,
      pax: 2,
      rate: usdPd / 2,
      currency: 'USD',
      gross: usdPd,
      discount: 0,
      method: 'Card',
      cashier: 'Demo · Mara Cashier',
      receiptNo: `MRC-${mm(m)}-11`,
      depositRef: `DEP-${mm(m)}-11`,
      shift: 'AM',
      settlement: 'deposited',
      verify: 'source-reported',
      branch: 'Mara',
      creatorId: 'mara-cashier',
      documents: ['pd-receipt.pdf'],
      notes: 'USD collection kept in USD. No conversion.',
    })

    const grossA = 150_000 + m * 10_000
    invoices.push({
      ...doc,
      id: `INV-${mm(m)}-A`,
      number: `BS-INV-${mm(m)}-A`,
      customer: GUESTS[m % GUESTS.length]!,
      issueDate: day(m, 3),
      dueDate: day(m, 17),
      flightDate: day(m, 6),
      bookingId: `BK-AR-${mm(m)}-A`,
      currency: 'KES',
      gross: grossA,
      tax: round2(grossA * 16 / 116),
      discount: 0,
      creditNote: 0,
      creditNoteRef: '',
      voided: false,
      disputed: false,
      flightStatus: 'flown',
      pay: 'full',
      branch: 'HQ',
      verify: m % 4 === 0 ? 'verified' : 'source-reported',
      contact: 'accounts@demo.local',
      documents: ['tax-invoice.pdf'],
    })

    const grossB = 80_000 + m * 5_000
    invoices.push({
      ...doc,
      id: `INV-${mm(m)}-B`,
      number: `BS-INV-${mm(m)}-B`,
      customer: m === 10 ? 'Walk-in Guest A' : GUESTS[(m + 3) % GUESTS.length]!,
      issueDate: day(m, 14),
      dueDate: day(m, 28),
      flightDate: day(m, 16),
      bookingId: `BK-AR-${mm(m)}-B`,
      currency: 'KES',
      gross: grossB,
      tax: round2(grossB * 16 / 116),
      discount: 0,
      creditNote: 0,
      creditNoteRef: '',
      voided: false,
      disputed: m === 10,
      flightStatus: 'flown',
      pay: 'half',
      branch: 'HQ',
      verify: m === 10 ? 'unreconciled' : 'source-reported',
      pipeline: m === 10 ? 'submit' : 'reconcile',
      contact: 'guest-a@demo.local',
      documents: ['tax-invoice.pdf'],
      notes: m === 10 ? 'Disputed. Collection is paused pending Finance review.' : doc.notes,
      creatorId: 'accountant-1',
    })

    if (m % 3 === 0) {
      invoices.push({
        ...doc,
        id: `INV-${mm(m)}-C`,
        number: `BS-INV-${mm(m)}-C`,
        customer: 'Walk-in Guest J',
        issueDate: day(m, 9),
        dueDate: day(m, 23),
        flightDate: day(m, 10),
        bookingId: `BK-AR-${mm(m)}-C`,
        currency: 'USD',
        gross: 1_200 + m * 80,
        tax: 0,
        discount: 0,
        creditNote: 0,
        creditNoteRef: '',
        voided: false,
        disputed: false,
        flightStatus: 'flown',
        pay: 'none',
        branch: 'HQ',
        verify: 'source-reported',
        contact: 'guest-j@demo.local',
        documents: ['tax-invoice.pdf'],
        notes: 'Unpaid USD invoice. No FX translation.',
      })
    }

    if (m !== 10) {
      const gas = 60_000 + m * 4_000
      creditorInvoices.push({
        ...doc,
        id: `CR-${mm(m)}-GAS`,
        supplier: 'Mara Gas & Lift',
        category: 'Fuel & gas',
        invoiceDate: day(m, 4),
        dueDate: day(m, 25),
        amount: gas,
        currency: 'KES',
        reference: `GAS-${mm(m)}`,
        creditNotes: 0,
        branch: 'Mara',
        verify: 'source-reported',
        exclude: false,
        documents: ['supplier-invoice.pdf'],
        notes: 'Incurred supplier invoice. Later settlement is not a second expense.',
      })
      const cat = 25_000 + m * 1_500
      creditorInvoices.push({
        ...doc,
        id: `CR-${mm(m)}-CAT`,
        supplier: 'Camp Catering',
        category: 'Catering',
        invoiceDate: day(m, 7),
        dueDate: day(m, 21),
        amount: cat,
        currency: 'KES',
        reference: `CAT-${mm(m)}`,
        creditNotes: 0,
        branch: 'Mara',
        verify: 'source-reported',
        exclude: false,
        documents: ['supplier-invoice.pdf'],
      })
    }
  }

  const may = vouchers.find((v) => v.id === 'VCH-05-A')!
  may.flightStatus = 'cancelled'
  may.refund = may.received
  may.refundDate = '2026-05-20'
  may.verify = 'unreconciled'
  may.notes = 'Flight cancelled. Full refund recorded. Recognized revenue is zero.'

  const aug = vouchers.find((v) => v.id === 'VCH-08-A')!
  aug.received = round2(aug.billed * 0.6)
  aug.notes = 'Partial collection. The shortfall stays on this voucher and is not invoiced again as Paid Later.'

  const apr = invoices.find((inv) => inv.id === 'INV-04-A')!
  apr.creditNote = 10_000
  apr.creditNoteRef = 'CN-04-A'
  apr.notes = 'Approved credit note. It reduces revenue and the debtor balance. It is not a second sale.'

  const sep = invoices.find((inv) => inv.id === 'INV-09-A')!
  sep.pay = 'later'
  sep.laterReceipt = { date: '2026-10-09', amount: sep.gross, ref: 'EFT-CROSS-09A' }
  sep.notes = 'Issued in September and collected in October. The receipt is not a second revenue entry.'

  invoices.push({
    ...doc,
    id: 'INV-02-VOID',
    number: 'BS-INV-02-VOID',
    customer: 'Horizon Desk Bookings',
    issueDate: '2026-02-11',
    dueDate: '2026-02-25',
    flightDate: '2026-02-12',
    bookingId: 'BK-VOID-02',
    currency: 'KES',
    gross: 42_000,
    tax: round2(42_000 * 16 / 116),
    discount: 0,
    creditNote: 0,
    creditNoteRef: '',
    voided: true,
    disputed: false,
    flightStatus: 'void',
    pay: 'none',
    branch: 'HQ',
    verify: 'unreconciled',
    contact: 'billing@demo.local',
    documents: ['void-approval.pdf'],
    notes: 'Approved void. Excluded from gross invoiced and from recognized revenue.',
  })

  invoices.push({
    ...doc,
    id: 'INV-10-USD',
    number: 'BS-INV-10-USD',
    customer: 'Walk-in Guest J',
    issueDate: '2026-10-08',
    dueDate: '2026-10-22',
    flightDate: '2026-10-10',
    bookingId: 'BK-AR-10-USD',
    currency: 'USD',
    gross: 1_800,
    tax: 0,
    discount: 0,
    creditNote: 0,
    creditNoteRef: '',
    voided: false,
    disputed: false,
    flightStatus: 'flown',
    pay: 'none',
    branch: 'HQ',
    verify: 'source-reported',
    contact: 'guest-j@demo.local',
    documents: ['tax-invoice.pdf'],
    notes: 'Open USD balance. Not translated into KES.',
  })

  invoices.push({
    ...doc,
    id: 'INV-07-GBP',
    number: 'BS-INV-07-GBP',
    customer: 'Walk-in Guest A',
    issueDate: '2026-07-08',
    dueDate: '2026-07-22',
    flightDate: '2026-07-09',
    bookingId: 'BK-AR-07-GBP',
    currency: 'GBP',
    gross: 960,
    tax: 0,
    discount: 0,
    creditNote: 0,
    creditNoteRef: '',
    voided: false,
    disputed: false,
    flightStatus: 'flown',
    pay: 'none',
    branch: 'HQ',
    verify: 'estimated',
    contact: 'guest-a@demo.local',
    documents: ['tax-invoice.pdf'],
    notes: 'Open GBP balance from July.',
  })

  invoices.push({
    ...doc,
    id: 'INV-11-SCHED',
    number: 'BS-INV-10-SCHED',
    customer: 'Rift Valley Travel Desk',
    issueDate: '2026-10-21',
    dueDate: '2026-11-04',
    flightDate: '2026-11-08',
    bookingId: 'BK-AR-10-SCHED',
    currency: 'KES',
    gross: 74_000,
    tax: round2(74_000 * 16 / 116),
    discount: 0,
    creditNote: 0,
    creditNoteRef: '',
    voided: false,
    disputed: false,
    flightStatus: 'scheduled',
    pay: 'none',
    branch: 'HQ',
    verify: 'source-reported',
    contact: 'ap@demo.local',
    documents: ['tax-invoice.pdf'],
    notes: 'Invoiced before the flight. Counted in invoices and debtors. Not recognized as revenue until delivery, under the flight policy.',
  })

  creditorInvoices.push(
    {
      ...doc,
      id: 'CR-10-GAS',
      supplier: 'Mara Gas & Lift',
      category: 'Fuel & gas',
      invoiceDate: '2026-10-04',
      dueDate: '2026-10-25',
      amount: 180_000,
      currency: 'KES',
      reference: 'GAS-10',
      creditNotes: 0,
      branch: 'Mara',
      verify: 'source-reported',
      exclude: false,
      creatorId: 'finance-manager',
      documents: ['supplier-invoice.pdf'],
      notes: 'Three dated payments are allocations, not a rewritten balance.',
    },
    {
      ...doc,
      id: 'CR-10-CAT',
      supplier: 'Camp Catering',
      category: 'Catering',
      invoiceDate: '2026-10-06',
      dueDate: '2026-10-20',
      amount: 80_000,
      currency: 'KES',
      reference: 'CAT-10',
      creditNotes: 0,
      branch: 'Mara',
      verify: 'source-reported',
      exclude: false,
      documents: ['supplier-invoice.pdf'],
    },
    {
      ...doc,
      id: 'CR-10-MAINT',
      supplier: 'Balloon Workshop',
      category: 'Maintenance',
      invoiceDate: '2026-10-08',
      dueDate: '2026-10-30',
      amount: 90_000,
      currency: 'KES',
      reference: 'MNT-10',
      creditNotes: 0,
      branch: 'Mara',
      verify: 'source-reported',
      exclude: false,
      pipeline: 'submit',
      creatorId: 'accountant-1',
      documents: ['supplier-invoice.pdf'],
      notes: 'Waiting for an approver who did not create the bill.',
    },
    {
      ...doc,
      id: 'CR-09-INS',
      supplier: 'Ridge Cover',
      category: 'Insurance',
      invoiceDate: '2026-09-15',
      dueDate: '2026-10-15',
      amount: 140_000,
      currency: 'KES',
      reference: 'INS-2026-09',
      creditNotes: 0,
      branch: 'HQ',
      verify: 'source-reported',
      exclude: false,
      documents: ['insurance-schedule.pdf'],
      notes: 'Paid in October. September’s as-of balance does not absorb that later payment.',
    },
    {
      ...doc,
      id: 'CR-05-USD',
      supplier: 'Envelope Works',
      category: 'Spares',
      invoiceDate: '2026-05-06',
      dueDate: '2026-06-06',
      amount: 4_200,
      currency: 'USD',
      reference: 'ENV-05',
      creditNotes: 0,
      branch: 'HQ',
      verify: 'source-reported',
      exclude: false,
      documents: ['supplier-invoice.pdf'],
    },
    {
      ...doc,
      id: 'CR-06-GBP',
      supplier: 'Spares House',
      category: 'Spares',
      invoiceDate: '2026-06-09',
      dueDate: '2026-07-09',
      amount: 2_400,
      currency: 'GBP',
      reference: 'SPR-06',
      creditNotes: 0,
      branch: 'HQ',
      verify: 'estimated',
      exclude: false,
      documents: ['supplier-invoice.pdf'],
    },
  )

  const catMarch = creditorInvoices.find((inv) => inv.id === 'CR-03-CAT')!
  creditorInvoices.push({
    ...catMarch,
    id: 'CR-03-CAT-DUP',
    reference: catMarch.reference,
    exclude: true,
    duplicateOf: 'CR-03-CAT',
    verify: 'unreconciled',
    documents: ['duplicate-flag.pdf'],
    notes: 'Duplicate of CR-03-CAT. Excluded from expenses and from the creditor balance.',
  })

  creditorInvoices.push({
    ...doc,
    id: 'CR-06-MISSING',
    supplier: 'Print Desk',
    category: 'Printing',
    invoiceDate: '2026-06-14',
    dueDate: '2026-06-28',
    amount: 18_500,
    currency: null,
    reference: 'PRT-06-NC',
    creditNotes: 0,
    branch: 'HQ',
    verify: 'unreconciled',
    exclude: true,
    documents: [],
    notes: 'Currency cell was blank on the source file. Excluded from every total.',
  })

  vouchers.push({
    ...doc,
    id: 'VCH-10-TODAY',
    bookingId: 'BK-10-TODAY',
    customer: 'Savanna Trail Agents',
    agent: 'Savanna Trail Agents',
    pax: 4,
    flightDate: '2026-10-28',
    bookingDate: '2026-10-28',
    currency: 'KES',
    price: 240_000,
    discount: 0,
    billed: 240_000,
    received: 240_000,
    receiptDate: '2026-10-28',
    bankAccount: 'Demo bank · KES collections',
    settlementRef: 'EFT-VCH-10-TODAY',
    refund: 0,
    refundDate: null,
    flightStatus: 'flown',
    creditNote: 0,
    branch: 'HQ',
    verify: 'source-reported',
    documents: ['voucher-scan.pdf'],
  })
  vouchers.push({
    ...doc,
    id: 'VCH-10-TODAY-USD',
    bookingId: 'BK-10-TODAY-USD',
    customer: 'Walk-in Guest J',
    agent: 'Horizon Desk Bookings',
    pax: 2,
    flightDate: '2026-10-28',
    bookingDate: '2026-10-28',
    currency: 'USD',
    price: 2_400,
    discount: 0,
    billed: 2_400,
    received: 2_400,
    receiptDate: '2026-10-28',
    bankAccount: 'Demo bank · USD collections',
    settlementRef: 'EFT-VCH-10-TODAY-USD',
    refund: 0,
    refundDate: null,
    flightStatus: 'flown',
    creditNote: 0,
    branch: 'HQ',
    verify: 'source-reported',
    documents: ['voucher-scan.pdf'],
  })
  pd.push({
    ...doc,
    id: 'PD-10-TODAY',
    date: '2026-10-28',
    flightRef: 'FL-10-28',
    bookingRef: 'BK-PD-10-TODAY',
    pax: 2,
    rate: 16_000,
    currency: 'KES',
    gross: 32_000,
    discount: 0,
    method: 'M-Pesa',
    cashier: 'Demo · Mara Cashier',
    receiptNo: 'PD-28',
    depositRef: 'DEP-10-28',
    shift: 'AM',
    settlement: 'deposited',
    branch: 'Mara',
    verify: 'source-reported',
    creatorId: 'mara-cashier',
    documents: ['pd-slip.pdf'],
  })
  invoices.push({
    ...doc,
    id: 'INV-10-TODAY',
    number: 'BS-INV-10-TODAY',
    customer: 'Mara Ridge Camps',
    issueDate: '2026-10-28',
    dueDate: '2026-11-11',
    flightDate: '2026-10-28',
    bookingId: 'BK-AR-10-TODAY',
    currency: 'KES',
    gross: 96_000,
    tax: 0,
    discount: 0,
    creditNote: 0,
    creditNoteRef: '',
    voided: false,
    disputed: false,
    flightStatus: 'flown',
    pay: 'none',
    branch: 'HQ',
    contact: 'finance@demo.local',
    verify: 'source-reported',
  })
  creditorInvoices.push({
    ...doc,
    id: 'CR-10-TODAY',
    supplier: 'Mara Gas & Lift',
    category: 'Fuel & gas',
    invoiceDate: '2026-10-28',
    dueDate: '2026-11-11',
    amount: 54_000,
    currency: 'KES',
    reference: 'GAS-28',
    creditNotes: 0,
    branch: 'HQ',
    exclude: false,
    verify: 'source-reported',
    documents: ['supplier-invoice.pdf'],
  })

  const receipts: Receipt[] = []
  for (const voucher of vouchers) {
    if (voucher.received > 0 && voucher.receiptDate) {
      receipts.push({
        ...doc,
        id: `RCP-${voucher.id}`,
        date: voucher.receiptDate,
        payer: voucher.customer,
        channel: 'Bank transfer',
        bankRef: voucher.settlementRef,
        currency: voucher.currency,
        branch: voucher.branch,
        amount: voucher.received,
        allocations: [{ targetType: 'voucher', targetId: voucher.id, amount: voucher.received }],
        kind: 'collection',
        verify: voucher.verify,
        creatorId: voucher.creatorId,
        documents: ['bank-advice.pdf'],
        notes: 'Advance collection. Not a second revenue entry.',
      })
    }
    if (voucher.refund > 0 && voucher.refundDate) {
      receipts.push({
        ...doc,
        id: `RCP-RF-${voucher.id}`,
        date: voucher.refundDate,
        payer: voucher.customer,
        channel: 'Bank transfer',
        bankRef: `RF-${voucher.settlementRef}`,
        currency: voucher.currency,
        branch: voucher.branch,
        amount: -voucher.refund,
        allocations: [{ targetType: 'voucher', targetId: voucher.id, amount: -voucher.refund }],
        kind: 'refund',
        verify: 'unreconciled',
        documents: ['refund-advice.pdf'],
        notes: 'Refund. Reduces cash. Does not create revenue.',
      })
    }
  }

  for (const txn of pd) {
    const net = round2(txn.gross - txn.discount)
    receipts.push({
      ...doc,
      id: `RCP-${txn.id}`,
      date: txn.date,
      payer: 'Mara walk-up / agent desk',
      channel: txn.method,
      bankRef: txn.depositRef,
      currency: txn.currency,
      branch: 'Mara',
      amount: net,
      allocations: [{ targetType: 'pd', targetId: txn.id, amount: net }],
      kind: 'collection',
      verify: txn.verify,
      creatorId: txn.creatorId,
      pipeline: txn.pipeline,
      documents: txn.documents,
      notes: 'PD collection. Reported in cash and, separately, in the PD revenue stream.',
    })
  }

  for (const invoice of invoices) {
    if (invoice.voided) continue
    const net = round2(invoice.gross - invoice.creditNote)
    let amount = 0
    let date = invoice.issueDate
    let ref = `EFT-${invoice.id}`
    if (invoice.pay === 'full') amount = net
    if (invoice.pay === 'half') amount = round2(net * 0.5)
    if (invoice.pay === 'full' || invoice.pay === 'half') {
      const issued = Number(invoice.issueDate.slice(8, 10))
      date = day(Number(invoice.issueDate.slice(5, 7)), Math.min(issued + 9, 28))
    }
    if (invoice.pay === 'later' && invoice.laterReceipt) {
      amount = invoice.laterReceipt.amount
      date = invoice.laterReceipt.date
      ref = invoice.laterReceipt.ref
    }
    if (amount > 0) {
      receipts.push({
        ...doc,
        id: `RCP-${invoice.id}`,
        date,
        payer: invoice.customer,
        channel: 'Bank transfer',
        bankRef: ref,
        currency: invoice.currency,
        branch: invoice.branch,
        amount,
        allocations: [{ targetType: 'invoice', targetId: invoice.id, amount }],
        kind: 'collection',
        verify: invoice.verify,
        documents: ['receipt-advice.pdf'],
        notes: 'Applied to the invoice. This receipt does not create another revenue line.',
      })
    }
  }

  receipts.push({
    ...doc,
    id: 'RCP-UNAP-10',
    date: '2026-10-15',
    payer: 'Unapplied — demo walk-in',
    channel: 'Cash',
    bankRef: 'UNAP-10',
    currency: 'KES',
    branch: 'Mara',
    amount: 25_000,
    allocations: [],
    kind: 'unapplied',
    verify: 'unreconciled',
    creatorId: 'mara-cashier',
    pipeline: 'submit',
    documents: ['cash-count.pdf'],
    notes: 'Cash with no invoice or voucher. It is not revenue.',
  })

  const supplierPayments: SupplierPayment[] = []
  const pay = (input: SupplierPayment) => supplierPayments.push(input)

  for (const invoice of creditorInvoices) {
    if (invoice.exclude || !invoice.currency) continue
    if (invoice.id === 'CR-10-TODAY') {
      pay(payment('PAY-10-TODAY', '2026-10-28', invoice, 20_000, 'GAS-28-P1'))
      continue
    }
    if (invoice.id === 'CR-10-GAS') {
      pay(payment('PAY-10-GAS-1', '2026-10-10', invoice, 40_000, 'GAS-P1'))
      pay(payment('PAY-10-GAS-2', '2026-10-18', invoice, 50_000, 'GAS-P2'))
      pay(payment('PAY-10-GAS-3', '2026-10-25', invoice, 30_000, 'GAS-P3'))
      continue
    }
    if (invoice.id === 'CR-10-CAT' || invoice.id === 'CR-10-MAINT') continue
    if (invoice.id === 'CR-09-INS') {
      pay(payment('PAY-10-INS', '2026-10-06', invoice, 140_000, 'INS-P1'))
      continue
    }
    if (invoice.id === 'CR-05-USD') {
      pay(payment('PAY-05-USD-1', '2026-05-20', invoice, 1_400, 'ENV-P1'))
      pay(payment('PAY-06-USD-2', '2026-06-03', invoice, 1_400, 'ENV-P2'))
      pay(payment('PAY-06-USD-3', '2026-06-18', invoice, 700, 'ENV-P3'))
      continue
    }
    if (invoice.id === 'CR-06-GBP') {
      pay(payment('PAY-06-GBP-1', '2026-06-20', invoice, 800, 'SPR-P1'))
      pay(payment('PAY-07-GBP-2', '2026-07-08', invoice, 800, 'SPR-P2'))
      pay(payment('PAY-07-GBP-3', '2026-07-22', invoice, 400, 'SPR-P3'))
      continue
    }
    const first = round2(invoice.amount * 0.4)
    const second = round2(invoice.amount * 0.3)
    const month = Number(invoice.invoiceDate.slice(5, 7))
    if (invoice.id.endsWith('GAS')) {
      pay(payment(`PAY-${invoice.id}-1`, day(month, 12), invoice, first, `${invoice.reference}-P1`))
      pay(payment(`PAY-${invoice.id}-2`, day(month, 20), invoice, second, `${invoice.reference}-P2`))
    } else {
      pay(payment(`PAY-${invoice.id}-1`, day(month, 18), invoice, invoice.amount, `${invoice.reference}-P1`))
    }
  }

  pay({
    ...doc,
    id: 'PAY-SPLIT-10',
    date: '2026-10-20',
    supplier: 'Split across catering and maintenance',
    method: 'EFT',
    bankRef: 'SPLIT-10',
    currency: 'KES',
    branch: 'Mara',
    amount: 70_000,
    allocations: [
      { invoiceId: 'CR-10-CAT', amount: 40_000 },
      { invoiceId: 'CR-10-MAINT', amount: 30_000 },
    ],
    unmatched: false,
    documents: ['payment-advice.pdf'],
    notes: 'One payment allocated to two invoices. The split is stored as allocations.',
    verify: 'source-reported',
  })

  pay({
    ...doc,
    id: 'PAY-UNMATCH-07',
    date: '2026-07-16',
    supplier: 'Unmatched supplier payment',
    method: 'EFT',
    bankRef: 'UNM-07',
    currency: 'KES',
    branch: 'HQ',
    amount: 15_000,
    allocations: [],
    unmatched: true,
    verify: 'unreconciled',
    pipeline: 'submit',
    documents: [],
    notes: 'Unmatched payment. It does not reduce a supplier balance and it is not an expense.',
  })

  const payroll: PayrollLine[] = []
  const employees = [
    { employee: 'Pilot crew A', dept: 'Flight', branch: 'Mara' as const, base: 180_000, allowances: 25_000, ot: true },
    { employee: 'Pilot crew B', dept: 'Flight', branch: 'Mara' as const, base: 175_000, allowances: 25_000, ot: true },
    { employee: 'Mara cashier desk', dept: 'Camp', branch: 'Mara' as const, base: 65_000, allowances: 8_000, ot: false },
    { employee: 'Reservations desk', dept: 'Commercial', branch: 'HQ' as const, base: 95_000, allowances: 10_000, ot: false },
    { employee: 'Accounts desk', dept: 'Finance', branch: 'HQ' as const, base: 110_000, allowances: 12_000, ot: false },
  ]
  for (let m = 1; m <= 10; m++) {
    employees.forEach((employee, index) => {
      const overtime = employee.ot ? 1_000 * m : 0
      const gross = employee.base + employee.allowances + overtime
      payroll.push({
        ...doc,
        id: `PRL-${mm(m)}-${index + 1}`,
        period: `2026-${mm(m)}`,
        payDate: day(m, 28),
        employee: employee.employee,
        dept: employee.dept,
        branch: employee.branch,
        currency: 'KES',
        base: employee.base,
        allowances: employee.allowances,
        overtime,
        withheldPaye: round2(gross * 0.18),
        withheldNssf: 2_160,
        otherDeduction: 1_500,
        paid: m < 10,
        bankRef: m < 10 ? `PAYROLL-${mm(m)}` : '',
        verify: 'estimated',
        pipeline: m === 10 ? 'submit' : 'reconcile',
        documents: m === 10 ? [] : ['payslip.pdf'],
        notes: 'Demo payroll. Gross is the salary expense. Deductions are not a second expense. Books were not provided.',
      })
    })
  }
  payroll.push({
    ...doc,
    id: 'PRL-07-GBP',
    period: '2026-07',
    payDate: '2026-07-28',
    employee: 'Contract captain (demo)',
    dept: 'Flight',
    branch: 'Mara',
    currency: 'GBP',
    base: 2_200,
    allowances: 0,
    overtime: 0,
    withheldPaye: 0,
    withheldNssf: 0,
    otherDeduction: 0,
    paid: true,
    bankRef: 'PAYROLL-GBP-07',
    verify: 'estimated',
    documents: ['contract-note.pdf'],
    notes: 'Foreign-currency contractor. Kept in GBP. Not converted.',
  })

  const statutory: StatutoryItem[] = []
  for (let m = 1; m <= 10; m++) {
    const lines = payroll.filter((line) => line.period === `2026-${mm(m)}` && line.currency === 'KES')
    const paye = round2(lines.reduce((sum, line) => sum + line.withheldPaye, 0))
    const nssf = round2(lines.reduce((sum, line) => sum + line.withheldNssf, 0))
    const employer = 2_160 * lines.length
    const paid = m < 10
    const paidDate = paid ? day(m, 26) : null
    statutory.push(
      {
        ...doc,
        id: `STAT-PAYE-${mm(m)}`,
        authority: 'Demo Revenue Authority',
        type: 'PAYE withheld',
        kind: 'withheld',
        period: `2026-${mm(m)}`,
        dueDate: day(m, 9),
        assessed: paye,
        paid: paid ? paye : 0,
        paidDate,
        currency: 'KES',
        branch: 'HQ',
        verify: 'estimated',
        payrollPeriod: `2026-${mm(m)}`,
        documents: paid ? ['paye-receipt.pdf'] : [],
        pipeline: m === 10 ? 'submit' : 'reconcile',
        notes: 'Withheld from payroll. This is a liability, not extra salary expense.',
      },
      {
        ...doc,
        id: `STAT-NSSF-${mm(m)}`,
        authority: 'Demo Social Fund',
        type: 'NSSF employee withheld',
        kind: 'withheld',
        period: `2026-${mm(m)}`,
        dueDate: day(m, 15),
        assessed: nssf,
        paid: paid ? nssf : 0,
        paidDate,
        currency: 'KES',
        branch: 'HQ',
        verify: 'estimated',
        payrollPeriod: `2026-${mm(m)}`,
        documents: paid ? ['nssf-receipt.pdf'] : [],
        pipeline: m === 10 ? 'submit' : 'reconcile',
        notes: 'Employee NSSF withheld in payroll. Not a second salary expense.',
      },
      {
        ...doc,
        id: `STAT-ER-${mm(m)}`,
        authority: 'Demo Social Fund',
        type: 'NSSF employer',
        kind: 'employer',
        period: `2026-${mm(m)}`,
        dueDate: day(m, 15),
        assessed: employer,
        paid: paid ? employer : 0,
        paidDate,
        currency: 'KES',
        branch: 'HQ',
        verify: 'estimated',
        payrollPeriod: `2026-${mm(m)}`,
        documents: paid ? ['nssf-employer.pdf'] : [],
        pipeline: m === 10 ? 'submit' : 'reconcile',
        notes: 'Employer contribution. Included once in statutory expense, and as a liability until paid.',
      },
    )
  }

  const mondays = ['', '2026-01-05', '2026-02-02', '2026-03-02', '2026-04-06', '2026-05-04', '2026-06-01', '2026-07-06', '2026-08-03', '2026-09-07', '2026-10-05']
  const hqWeeks: HqWeek[] = []
  for (let m = 1; m <= 10; m++) {
    const start = mondays[m]!
    const vouchersWeek = [
      { id: `HQV-${mm(m)}-1`, date: start, category: 'Transport', merchant: 'Demo fuel point', amount: 4_000 + m * 200, description: 'Staff transport', receiptAttached: true },
      { id: `HQV-${mm(m)}-2`, date: day(m, Math.min(Number(start.slice(8)) + 2, 28)), category: 'Office supplies', merchant: 'Demo stationer', amount: 3_500 + m * 150, description: 'Office supplies', receiptAttached: m !== 10 },
      { id: `HQV-${mm(m)}-3`, date: day(m, Math.min(Number(start.slice(8)) + 4, 28)), category: 'Staff welfare', merchant: 'Demo canteen', amount: 2_500 + m * 100, description: 'Staff tea', receiptAttached: true },
    ]
    const spend = vouchersWeek.reduce((sum, voucher) => sum + voucher.amount, 0)
    const opening = 50_000
    const replenishment = 20_000
    const closing = opening + replenishment - spend
    hqWeeks.push({
      ...doc,
      id: `HQW-${mm(m)}`,
      weekStart: start,
      currency: 'KES',
      opening,
      replenishments: [{ date: day(m, Math.min(Number(start.slice(8)) + 1, 27)), amount: replenishment, ref: `TOPUP-HQ-${mm(m)}` }],
      vouchers: vouchersWeek,
      adjustments: [],
      physicalCount: closing,
      custodian: 'Demo · HQ Cash Custodian',
      reviewer: 'Demo · Accountant',
      branch: 'HQ',
      verify: m === 10 ? 'unreconciled' : 'estimated',
      creatorId: 'hq-custodian',
      pipeline: m === 10 ? 'submit' : 'reconcile',
      documents: m === 10 ? ['week-sheet.pdf'] : ['week-sheet.pdf', 'receipts.pdf'],
      notes: m === 10 ? 'One voucher has no receipt image. Replenishment is a transfer, not an expense.' : 'Replenishment is a transfer, not an expense.',
    })
  }

  const maraDays: MaraDay[] = []
  for (let m = 1; m <= 10; m++) {
    for (const d of [4, 11, 18, 25]) {
      const spendA = 2_200 + m * 80 + d
      const spendB = 1_400 + m * 40
      const vouchersDay = [
        { id: `MRV-${mm(m)}-${d}A`, date: day(m, d), category: 'Camp supplies', merchant: 'Demo kiosk', amount: spendA, description: 'Camp supplies', receiptAttached: true },
        { id: `MRV-${mm(m)}-${d}B`, date: day(m, d), category: 'Ground transport', merchant: 'Demo driver', amount: spendB, description: 'Airfield run', receiptAttached: true },
      ]
      const topUp = d === 11 ? 5_000 : 0
      const opening = 20_000
      const spend = spendA + spendB
      const closing = opening + topUp - spend
      const shortage = m === 10 && d === 18
      maraDays.push({
        ...doc,
        id: `MRD-${mm(m)}-${d}`,
        date: day(m, d),
        currency: 'KES',
        opening,
        topUps: topUp ? [{ amount: topUp, ref: `TOPUP-MARA-${mm(m)}-${d}` }] : [],
        vouchers: vouchersDay,
        adjustments: [],
        physicalCount: shortage ? closing - 400 : closing,
        custodian: 'Demo · Mara Cashier',
        handover: 'Demo · Pilot crew',
        branch: 'Mara',
        verify: shortage ? 'unreconciled' : 'estimated',
        creatorId: 'mara-cashier',
        pipeline: shortage ? 'submit' : 'reconcile',
        documents: ['daily-sheet.pdf'],
        notes: shortage ? 'Physical count is KES 400 short. Shortage is not posted as an extra expense until an adjustment is approved.' : 'Daily float. Top-up is a transfer, not an expense.',
      })
    }
  }

  maraDays.push({
    ...doc,
    id: 'MRD-10-28',
    date: '2026-10-28',
    currency: 'KES',
    opening: 20_000,
    topUps: [],
    vouchers: [
      { id: 'MRV-10-28A', date: '2026-10-28', category: 'Camp supplies', merchant: 'Demo kiosk', amount: 4_800, description: 'Camp supplies', receiptAttached: true },
      { id: 'MRV-10-28B', date: '2026-10-28', category: 'Ground transport', merchant: 'Demo driver', amount: 2_600, description: 'Airfield run', receiptAttached: true },
    ],
    adjustments: [],
    physicalCount: 12_600,
    custodian: 'Demo · Mara Cashier',
    handover: 'Demo · Pilot crew',
    branch: 'Mara',
    verify: 'estimated',
    creatorId: 'mara-cashier',
    documents: ['daily-sheet.pdf'],
  })

  const landing: LandingFee[] = []
  for (let m = 1; m <= 10; m++) {
    const collected = 18_000 + m * 1_000
    landing.push({
      ...doc,
      id: `LF-${mm(m)}-1`,
      date: day(m, 9),
      flightRef: `FL-${mm(m)}-09`,
      operator: m % 2 ? 'Demo Conservancy Authority' : 'Demo County Treasury',
      currency: 'KES',
      collected,
      settled: m < 10 ? collected : 0,
      sourceReported: m === 7 ? collected + 2_000 : collected,
      branch: 'Mara',
      verify: 'source-reported',
      actualNote: 'ACTUAL — definition pending sign-off',
      documents: ['landing-slip.pdf'],
      notes: 'Kept outside ticket revenue. July source file differs from the recalculated slip.',
    })
  }
  landing.push({
    ...doc,
    id: 'LF-06-MISSING',
    date: '2026-06-19',
    flightRef: 'FL-06-19',
    operator: 'Demo Conservancy Authority',
    currency: null,
    collected: 15_000,
    settled: 0,
    sourceReported: 15_000,
    branch: 'Mara',
    verify: 'unreconciled',
    actualNote: 'Currency missing',
    documents: [],
    notes: 'Missing currency. Excluded from landing totals.',
  })
  landing.push({
    ...doc,
    id: 'LF-08-USD',
    date: '2026-08-16',
    flightRef: 'FL-08-16',
    operator: 'Demo Conservancy Authority',
    currency: 'USD',
    collected: 350,
    settled: 350,
    sourceReported: 350,
    branch: 'Mara',
    verify: 'source-reported',
    actualNote: 'ACTUAL — definition pending sign-off',
    documents: ['landing-slip.pdf'],
    notes: 'USD landing fee. Not converted and not mixed into the KES chart.',
  })

  const allocationRules: AllocationRule[] = [
    {
      id: 'AR-1',
      beneficiary: 'Balloon Safaris Ltd',
      percentage: 40,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-06-30',
      agreement: 'Draft heads of terms — unsigned',
      basis: 'Source-reported landing ACTUAL',
      rounding: 'Nearest shilling',
      approval: 'pending',
      notes: 'Not applied to every month. Posting is blocked.',
    },
    {
      id: 'AR-2',
      beneficiary: 'Unassigned 20% — County, Hemlab, or distinct',
      percentage: 20,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      agreement: 'No agreement on file',
      basis: 'Unknown',
      rounding: 'Unknown',
      approval: 'pending',
      notes: 'Beneficiary is an open decision. Nothing is posted.',
    },
    {
      id: 'AR-3',
      beneficiary: 'Counterparty not confirmed',
      percentage: 40,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-03-31',
      agreement: 'No agreement on file',
      basis: 'Unknown',
      rounding: 'Unknown',
      approval: 'pending',
      notes: 'Do not apply one 40/20/40 split to all months.',
    },
    {
      id: 'AR-4',
      beneficiary: 'County (named separately)',
      percentage: null,
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
      agreement: 'No executed agreement on file',
      basis: 'Pending',
      rounding: 'Pending',
      approval: 'pending',
      notes: 'County stays a separate named counterparty until documented.',
    },
    {
      id: 'AR-5',
      beneficiary: 'Hemlab (named separately)',
      percentage: null,
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
      agreement: 'No executed agreement on file',
      basis: 'Pending',
      rounding: 'Pending',
      approval: 'pending',
      notes: 'Hemlab stays a separate named counterparty until documented.',
    },
  ]

  const allocationMonths: AllocationMonth[] = []
  for (let m = 1; m <= 10; m++) {
    const actual = landing
      .filter((fee) => fee.currency === 'KES' && fee.date.slice(5, 7) === mm(m))
      .reduce((sum, fee) => sum + fee.collected, 0)
    allocationMonths.push({
      ...doc,
      id: `ALLOC-${mm(m)}`,
      month: `2026-${mm(m)}`,
      currency: 'KES',
      actual,
      reduced40: round2(actual * 0.4),
      dividedBy13: round2(actual / 13),
      allocated: null,
      paid: 0,
      beneficiary: m <= 6 ? 'Draft H1 — not posted' : 'Draft H2 — County and Hemlab unassigned',
      ruleId: m <= 3 ? 'AR-3' : 'AR-2',
      postingBlocked: true,
      verify: 'source-reported',
      documents: [],
      notes: 'Reduced 40% and Divided by 13 are source flags only. Automatic posting is prohibited.',
    })
  }

  const audit: AuditEvent[] = [
    { id: 'AUD-1', at: '2026-10-06T09:12:00', user: 'Demo · Accountant', action: 'Submit supplier bill', entity: 'CR-10-MAINT', before: 'Classify', after: 'Submit', reason: 'Maintenance invoice entered from a camp return.', source: 'Demo ledger' },
    { id: 'AUD-2', at: '2026-10-18T17:40:00', user: 'Demo · Mara Cashier', action: 'Record cash count', entity: 'MRD-10-18', before: 'Physical count pending', after: 'Shortage KES 400.00', reason: 'Count does not match the sheet. No adjustment posted.', source: 'Mara daily sheet' },
    { id: 'AUD-3', at: '2026-05-20T11:05:00', user: 'Demo · Finance Manager', action: 'Record refund', entity: 'VCH-05-A', before: 'Flown', after: 'Cancelled + refund', reason: 'Flight did not operate. Revenue reversed to zero.', source: 'Booking desk' },
    { id: 'AUD-4', at: '2026-04-18T15:22:00', user: 'Demo · Accountant', action: 'Credit note', entity: 'INV-04-A', before: 'Gross only', after: 'Credit note KES 10,000.00', reason: 'Approved concession. Balance reduced. No second invoice.', source: 'Invoice register' },
    { id: 'AUD-5', at: '2026-03-12T10:02:00', user: 'Demo · Accountant', action: 'Flag duplicate', entity: 'CR-03-CAT-DUP', before: 'Unreviewed', after: 'Excluded from totals', reason: 'Same supplier reference as CR-03-CAT.', source: 'Import review' },
    { id: 'AUD-6', at: '2026-01-31T18:00:00', user: 'Demo · Finance Manager', action: 'Close period', entity: '2026-01', before: 'Open', after: 'Closed', reason: 'Prototype close of January so posting locks can be demonstrated.', source: 'Period control' },
  ]

  return {
    vouchers,
    pd,
    invoices,
    receipts,
    creditorInvoices,
    supplierPayments,
    payroll,
    statutory,
    hqWeeks,
    maraDays,
    landing,
    allocationRules,
    allocationMonths,
    audit,
    customers: CUSTOMERS,
    suppliers: [
      'Mara Gas & Lift',
      'Camp Catering',
      'Balloon Workshop',
      'Ridge Cover',
      'Envelope Works',
      'Spares House',
      'Print Desk',
    ],
  }
}

function payment(id: string, date: string, invoice: CreditorInvoice, amount: number, ref: string): SupplierPayment {
  return {
    creatorId: 'accountant-1',
    pipeline: 'reconcile',
    documents: ['payment-advice.pdf'],
    notes: 'Allocation against one supplier invoice.',
    verify: invoice.verify,
    id,
    date,
    supplier: invoice.supplier,
    method: 'EFT',
    bankRef: ref,
    currency: invoice.currency || 'KES',
    branch: invoice.branch,
    amount,
    allocations: [{ invoiceId: invoice.id, amount }],
    unmatched: false,
  }
}

export const ledger: Ledger = build()
