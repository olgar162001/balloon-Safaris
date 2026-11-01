export type CurrencyCode = 'KES' | 'USD' | 'GBP'
export type MoneyCurrency = CurrencyCode | 'MISSING'
export type Branch = 'HQ' | 'Mara'
export type VerifyStatus = 'verified' | 'source-reported' | 'estimated' | 'unreconciled'
export type Role =
  | 'Director'
  | 'Finance Manager'
  | 'Accountant'
  | 'HQ Cash Custodian'
  | 'Mara Cashier'
  | 'Auditor'
  | 'System Admin'

export type PipelineStage =
  | 'capture'
  | 'validate'
  | 'classify'
  | 'attach'
  | 'submit'
  | 'approve'
  | 'post'
  | 'reconcile'
  | 'close'

export type Preset =
  | 'today'
  | 'this-week'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'this-year'
  | 'custom'

export type BranchFilter = 'All' | Branch
export type CurrencyFilter = 'ALL' | CurrencyCode
export type StatusFilter =
  | 'all'
  | 'open'
  | 'paid'
  | 'partial'
  | 'overdue'
  | 'disputed'
  | VerifyStatus

export type Settle = 'paid' | 'partial' | 'open' | 'overdue' | 'na'

export interface GlobalFilters {
  preset: Preset
  from: string
  to: string
  branch: BranchFilter
  party: string
  status: StatusFilter
  currency: CurrencyFilter
}

export interface Drill {
  drill: string
  month: string
  bucket: string
  txn: string
}

export interface DocFields {
  creatorId: string
  pipeline: PipelineStage
  documents: string[]
  notes: string
  verify: VerifyStatus
}

export interface Voucher extends DocFields {
  id: string
  bookingId: string
  customer: string
  agent: string
  pax: number
  flightDate: string
  bookingDate: string
  currency: CurrencyCode
  price: number
  discount: number
  billed: number
  received: number
  receiptDate: string | null
  bankAccount: string
  settlementRef: string
  refund: number
  refundDate: string | null
  flightStatus: 'booked' | 'payment-confirmed' | 'flown' | 'cancelled'
  creditNote: number
  branch: Branch
}

export interface PdTxn extends DocFields {
  id: string
  date: string
  flightRef: string
  bookingRef: string
  pax: number
  rate: number
  currency: CurrencyCode
  gross: number
  discount: number
  method: string
  cashier: string
  receiptNo: string
  depositRef: string
  shift: 'AM' | 'PM'
  settlement: 'deposited' | 'pending'
  branch: 'Mara'
}

export interface DebtorInvoice extends DocFields {
  id: string
  number: string
  customer: string
  issueDate: string
  dueDate: string
  flightDate: string
  bookingId: string
  currency: CurrencyCode
  gross: number
  tax: number
  discount: number
  creditNote: number
  creditNoteRef: string
  voided: boolean
  disputed: boolean
  flightStatus: 'flown' | 'scheduled' | 'void'
  pay: 'full' | 'half' | 'none' | 'later'
  laterReceipt?: { date: string; amount: number; ref: string }
  branch: Branch
  contact: string
}

export interface Receipt extends DocFields {
  id: string
  date: string
  payer: string
  channel: string
  bankRef: string
  currency: CurrencyCode
  branch: Branch
  amount: number
  allocations: { targetType: 'invoice' | 'voucher' | 'pd'; targetId: string; amount: number }[]
  kind: 'collection' | 'refund' | 'unapplied'
}

export interface CreditorInvoice extends DocFields {
  id: string
  supplier: string
  category: string
  invoiceDate: string
  dueDate: string
  amount: number
  currency: CurrencyCode | null
  reference: string
  creditNotes: number
  branch: Branch
  exclude: boolean
  duplicateOf?: string
  sourceReported?: number
}

export interface SupplierPayment extends DocFields {
  id: string
  date: string
  supplier: string
  method: string
  bankRef: string
  currency: CurrencyCode
  branch: Branch
  amount: number
  allocations: { invoiceId: string; amount: number }[]
  unmatched: boolean
}

export interface PayrollLine extends DocFields {
  id: string
  period: string
  payDate: string
  employee: string
  dept: string
  branch: Branch
  currency: CurrencyCode
  base: number
  allowances: number
  overtime: number
  withheldPaye: number
  withheldNssf: number
  otherDeduction: number
  paid: boolean
  bankRef: string
}

export interface StatutoryItem extends DocFields {
  id: string
  authority: string
  type: string
  kind: 'withheld' | 'employer'
  period: string
  dueDate: string
  assessed: number
  paid: number
  paidDate: string | null
  currency: CurrencyCode
  branch: Branch
  payrollPeriod: string
}

export interface PettyVoucher {
  id: string
  date: string
  category: string
  merchant: string
  amount: number
  description: string
  receiptAttached: boolean
}

export interface HqWeek extends DocFields {
  id: string
  weekStart: string
  currency: CurrencyCode
  opening: number
  replenishments: { date: string; amount: number; ref: string }[]
  vouchers: PettyVoucher[]
  adjustments: { date: string; amount: number; reason: string; approved: boolean }[]
  physicalCount: number
  custodian: string
  reviewer: string
  branch: 'HQ'
}

export interface MaraDay extends DocFields {
  id: string
  date: string
  currency: CurrencyCode
  opening: number
  topUps: { amount: number; ref: string }[]
  vouchers: PettyVoucher[]
  adjustments: { amount: number; reason: string; approved: boolean }[]
  physicalCount: number
  custodian: string
  handover: string
  branch: 'Mara'
}

export interface LandingFee extends DocFields {
  id: string
  date: string
  flightRef: string
  operator: string
  currency: CurrencyCode | null
  collected: number
  settled: number
  sourceReported: number | null
  branch: 'Mara'
  actualNote: string
}

export interface AllocationRule {
  id: string
  beneficiary: string
  percentage: number | null
  effectiveFrom: string
  effectiveTo: string | null
  agreement: string
  basis: string
  rounding: string
  approval: 'pending' | 'approved'
  notes: string
}

export interface AllocationMonth extends DocFields {
  id: string
  month: string
  currency: CurrencyCode
  actual: number
  reduced40: number
  dividedBy13: number
  allocated: number | null
  paid: number
  beneficiary: string
  ruleId: string
  postingBlocked: true
}

export interface AuditEvent {
  id: string
  at: string
  user: string
  action: string
  entity: string
  before: string
  after: string
  reason: string
  source: string
}

export interface CustomerParty {
  id: string
  name: string
  limitKes: number | null
  contact: string
}

export interface Ledger {
  vouchers: Voucher[]
  pd: PdTxn[]
  invoices: DebtorInvoice[]
  receipts: Receipt[]
  creditorInvoices: CreditorInvoice[]
  supplierPayments: SupplierPayment[]
  payroll: PayrollLine[]
  statutory: StatutoryItem[]
  hqWeeks: HqWeek[]
  maraDays: MaraDay[]
  landing: LandingFee[]
  allocationRules: AllocationRule[]
  allocationMonths: AllocationMonth[]
  audit: AuditEvent[]
  customers: CustomerParty[]
  suppliers: string[]
}

export interface EntityPatch {
  pipeline?: PipelineStage
  documentsAdded?: string[]
  note?: string
}

export interface DrawerDetail {
  title: string
  subtitle: string
  amount: number
  currency: MoneyCurrency
  verify: VerifyStatus
  dates: { label: string; value: string }[]
  facts: { label: string; value: string }[]
  allocations: { label: string; amount: number; currency: MoneyCurrency; note?: string }[]
  documents: { name: string }[]
  approvals: { by: string; action: string; at: string; note: string }[]
  notes: string
  audit: { at: string; user: string; action: string; before: string; after: string; reason: string }[]
  source: string
  sourceHref: string
  pipeline: PipelineStage
  creatorId: string
  requiresEvidence: boolean
  domain: 'pd' | 'mara' | 'hq' | 'general'
}

export interface LedgerRow {
  id: string
  date: string
  month: string
  branch: Branch
  party: string
  category: string
  group: string
  groupLabel: string
  bucket: string
  status: string
  settle: Settle
  verify: VerifyStatus
  currency: MoneyCurrency
  amount: number
  included: boolean
  creatorId: string
  pipeline: PipelineStage
  values: Record<string, string | number>
  slotPaid: number
  slotOutstanding: number
  slotOverdue: number
  detail: DrawerDetail
}

export type ColumnKind = 'text' | 'date' | 'money' | 'verify' | 'status' | 'pipeline'

export interface ViewColumn {
  key: string
  header: string
  kind: ColumnKind
}

export interface SummaryCardModel {
  id: string
  label: string
  hint: string
  lines: { currency: CurrencyCode; amount: number; verify: VerifyStatus }[]
  count?: number
}

export type ChartKind = 'doughnut' | 'bar' | 'line' | 'bar-line' | 'stacked-bar' | 'horizontal-bar' | 'grouped-bar'

export interface ChartPoint {
  id: string
  name: string
  values: Record<string, number>
}

export interface ChartSpec {
  id: string
  title: string
  aria: string
  note?: string
  kind: ChartKind
  drillParam: 'drill' | 'month' | 'bucket'
  seriesDrill?: 'bucket'
  href: string
  byCurrency: Partial<Record<CurrencyCode, { series: { key: string; label: string; color: string }[]; points: ChartPoint[] }>>
}

export interface LedgerView {
  kind: LedgerKind
  title: string
  eyebrow: string
  description: string
  formula: string
  warnings: string[]
  columns: ViewColumn[]
  rows: LedgerRow[]
  excluded: LedgerRow[]
  charts: ChartSpec[]
  summaries: SummaryCardModel[]
}

export type LedgerKind =
  | 'revenue'
  | 'vouchers'
  | 'pd'
  | 'debtors'
  | 'receipts'
  | 'invoices'
  | 'expenses'
  | 'payroll'
  | 'statutory'
  | 'payments'
  | 'hq-petty'
  | 'mara-petty'
  | 'pnl'
  | 'landing'
  | 'allocations'
  | 'cash'
  | 'creditors'

export interface KpiModel {
  id: string
  label: string
  href: string
  formula: string
  hint: string
  totals: { currency: CurrencyCode; amount: number; verify: VerifyStatus }[]
  count: number
  spark: { month: string; amount: number }[]
  sparkCurrency: CurrencyCode | null
}

export interface PayCell {
  date: string
  amount: number
  reference: string
  paymentId: string
  afterPeriod: boolean
  split: { invoiceId: string; reference: string; amount: number }[]
}

export interface HorizontalRow {
  id: string
  supplier: string
  category: string
  invoiceDate: string
  dueDate: string
  amount: number
  currency: CurrencyCode | 'MISSING'
  reference: string
  payments: PayCell[]
  creditNotes: number
  allocated: number
  outstanding: number
  status: string
  aging: string
  verify: VerifyStatus
  balanceStatus: 'Unverified'
  included: boolean
  branch: Branch
  creatorId: string
  pipeline: PipelineStage
  documents: string[]
  notes: string
  sample: boolean
  duplicateOf?: string
}

export interface ExceptionItem {
  id: string
  date: string
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  owner: string
  href: string
  standing: boolean
  verify: VerifyStatus
}

export interface SearchHit {
  id: string
  group: 'Invoices' | 'Vouchers' | 'Receipts' | 'Suppliers' | 'Customers'
  label: string
  hint: string
  href: string
}

export interface ReconItem {
  id: string
  date: string
  type: string
  party: string
  sourceText: string
  recalcText: string
  differenceText: string
  reviewer: string
  verify: VerifyStatus
  href: string
}

export interface StatementLine {
  id: string
  date: string
  description: string
  debit: number
  credit: number
  balance: number
  verify: VerifyStatus
}

export interface StatementModel {
  party: string
  currency: CurrencyCode
  opening: number
  openingVerify: VerifyStatus
  lines: StatementLine[]
  closing: number
  note: string
}

export interface CollectionRate {
  currency: CurrencyCode
  numerator: number
  denominator: number
  rate: number | null
  verify: VerifyStatus
}

export interface ImportCell {
  file: string
  sheet: string
  address: string
  original: string
  formula: string
  displayed: string
  rowHash: string
}

export interface ImportBatch {
  id: string
  fileName: string
  fileHash: string
  uploadedAt: string
  cells: ImportCell[]
  exceptions: string[]
  posted: false
}

export interface AppSettings {
  recognition: 'on-flight' | 'on-payment'
  pdLabel: string
  showDemoRibbon: boolean
  signoffDismissed: boolean
  closedPeriods: string[]
  lockedDays: string[]
}
