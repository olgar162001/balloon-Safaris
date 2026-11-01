import { Fragment, useMemo, useState } from 'react'
import { Pop } from '@/components/ui'
import { Button, inputClass, Modal } from '@/components/ui'
import { DataTable } from '@/components/DataTable'
import { TransactionDrawer } from '@/components/Drawer'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageHeader, VerifyBadge } from '@/components/widgets'
import { FileText, Landmark, Scale } from 'lucide-react'
import { ChartCard } from '@/components/Charts'
import { useFinance } from '@/finance'
import { exportMatrix } from '@/lib/export'
import { formatDisplayDate, formatMoney } from '@/lib/format'
import { ROLE_USER, canOperateDomain } from '@/access'
import { useAppStore } from '@/store'
import type { CurrencyCode, HorizontalRow, LedgerRow } from '@/types'

const FIXED = [
  { key: 'category', label: 'Expense category', width: 170 },
  { key: 'supplier', label: 'Supplier', width: 220 },
  { key: 'invoiceDate', label: 'Invoice date', width: 140 },
  { key: 'amount', label: 'Invoice amount', width: 160 },
  { key: 'currency', label: 'Currency', width: 100 },
  { key: 'reference', label: 'Invoice reference', width: 160 },
]

export function CreditorsPage() {
  const { model, filters, ledger } = useFinance()
  const role = useAppStore((state) => state.role)
  const addInvoice = useAppStore((state) => state.addInvoice)
  const addPayment = useAppStore((state) => state.addPayment)
  const setAllocations = useAppStore((state) => state.setAllocations)
  const [mode, setMode] = useState<'horizontal' | 'normalized'>('horizontal')
  const [tab, setTab] = useState<CurrencyCode>(filters.currency === 'ALL' ? 'KES' : filters.currency)
  const currency = filters.currency === 'ALL' ? tab : filters.currency
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [row, setRow] = useState<LedgerRow | null>(null)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [allocOpen, setAllocOpen] = useState(false)
  const unmatched = ledger.supplierPayments.filter((payment) => payment.unmatched && payment.currency === currency)
  const live = model.sheet.filter((item) => item.included && item.currency === currency && `${item.supplier} ${item.reference} ${item.category}`.toLowerCase().includes(search.toLowerCase()))
  const slots = Math.max(3, ...live.map((item) => item.payments.length), 0)
  const groups = useMemo(() => {
    const map = new Map<string, HorizontalRow[]>()
    for (const item of live) map.set(item.supplier, [...(map.get(item.supplier) ?? []), item])
    return [...map.entries()]
  }, [live])
  const outstanding = live.reduce((sum, item) => sum + item.outstanding, 0)
  const invoiced = live.reduce((sum, item) => sum + item.amount, 0)
  const headers = [
    ...FIXED.map((column) => column.label),
    'Opening balance',
    ...Array.from({ length: slots }, (_, index) => [`Payment ${index + 1} date`, `Payment ${index + 1} amount`, `Payment ${index + 1} reference`]).flat(),
    'Total invoiced', 'Allocated payments', 'Credit notes', 'Outstanding', 'Payment status', 'Due date', 'Aging', 'Balance status',
  ]
  const body = live.map((item) => [
    item.category,
    item.supplier,
    formatDisplayDate(item.invoiceDate),
    formatMoney(item.amount, currency),
    currency,
    item.reference,
    'Not provided',
    ...Array.from({ length: slots }, (_, index) => {
      const payment = item.payments[index]
      return payment ? [formatDisplayDate(payment.date), formatMoney(payment.amount, currency), payment.reference] : ['', '', '']
    }).flat(),
    formatMoney(item.amount, currency),
    formatMoney(item.allocated, currency),
    formatMoney(item.creditNotes, currency),
    formatMoney(item.outstanding, currency),
    item.status,
    formatDisplayDate(item.dueDate),
    item.aging,
    'Unverified',
  ])
  const canEdit = canOperateDomain(role, 'general')
  return (
    <div className="w-full">
      <PageHeader eyebrow="Payables" title="Creditors list" extra={
        <div className="flex gap-2">
          <Button variant={mode === 'horizontal' ? 'primary' : 'outline'} onClick={() => setMode('horizontal')}>Horizontal</Button>
          <Button variant={mode === 'normalized' ? 'primary' : 'outline'} onClick={() => setMode('normalized')}>Normalized</Button>
        </div>
      } />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Outstanding" caption="Unverified" amount={outstanding} currency={currency} icon={Landmark} tint="orange" />
        <KpiCard label="Invoiced" caption="This period" amount={invoiced} currency={currency} icon={FileText} tint="blue" />
        <KpiCard label="Invoices" caption="Open rows" count={live.length} icon={Scale} tint="gold" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.currency === 'ALL' && (['KES', 'USD', 'GBP'] as CurrencyCode[]).map((item) => (
          <Button key={item} variant={currency === item ? 'primary' : 'outline'} onClick={() => setTab(item)}>{item}</Button>
        ))}
        <Button disabled={!canEdit} onClick={() => setInvoiceOpen(true)}>Add invoice</Button>
        <Button disabled={!canEdit} onClick={() => setPayOpen(true)}>Record payment</Button>
        <Button disabled={!canEdit || unmatched.length === 0} onClick={() => setAllocOpen(true)}>Allocate payment</Button>
        <Button onClick={() => exportMatrix('Creditors horizontal', `${currency} ${model.filters.from} to ${model.filters.to}`, headers, body, 'xlsx')}>Excel</Button>
        <Button onClick={() => exportMatrix('Creditors horizontal', `${currency} ${model.filters.from} to ${model.filters.to}`, headers, body, 'pdf')}>PDF</Button>
      </div>
      <input className="mb-3 h-[34px] w-full max-w-sm rounded-lg border border-line bg-white px-3 text-[13px]" placeholder="Search" aria-label="Search creditors" value={search} onChange={(event) => setSearch(event.target.value)} />
      {mode === 'normalized' ? (
        <DataTable title="Creditors normalized" filterSummary={`${currency} normalized`} columns={model.views.creditors.columns} rows={model.views.creditors.rows.filter((item) => item.currency === currency && item.party.toLowerCase().includes(search.toLowerCase()))} onRow={setRow} />
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-card border border-line bg-white shadow-card">
          <table className="min-w-max border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {FIXED.map((column, index) => (
                  <th key={column.key} className="sticky top-0 z-30 border-b border-forest-800 bg-forest-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white" style={{ left: offset(index), minWidth: column.width }}>{column.label}</th>
                ))}
                <th className="sticky top-0 z-20 border-b border-forest-800 bg-forest-800 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">Opening balance</th>
                {Array.from({ length: slots }, (_, index) => (
                  ['Date', 'Amount', 'Reference'].map((part) => (
                    <th key={`${index}-${part}`} className="sticky top-0 z-20 border-b border-forest-800 bg-forest-700 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">Payment {index + 1} {part}</th>
                  ))
                ))}
                {['Total invoiced', 'Allocated', 'Credit notes', 'Outstanding', 'Status', 'Due', 'Aging', 'Balance status'].map((label) => (
                  <th key={label} className="sticky top-0 z-20 border-b border-forest-800 bg-forest-900 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(([supplier, items]) => {
                const hidden = collapsed[supplier]
                const subOutstanding = items.reduce((sum, item) => sum + item.outstanding, 0)
                return (
                  <Fragment key={supplier}>
                    <tr className="bg-cream">
                      <td className="sticky left-0 z-10 bg-cream px-3 py-2 font-semibold" style={{ minWidth: FIXED[0]!.width }}>
                        <button type="button" onClick={() => setCollapsed({ ...collapsed, [supplier]: !hidden })} aria-expanded={!hidden}>{hidden ? '▸' : '▾'} {supplier}</button>
                      </td>
                      <td className="sticky z-10 bg-cream px-3 py-2" style={{ left: offset(1), minWidth: FIXED[1]!.width }}>{items.length} invoices</td>
                      <td colSpan={4 + 1 + slots * 3} />
                      <td className="px-3 py-2 money">{formatMoney(items.reduce((sum, item) => sum + item.amount, 0), currency)}</td>
                      <td />
                      <td />
                      <td className="px-3 py-2 money">{formatMoney(subOutstanding, currency)}</td>
                      <td colSpan={4} className="px-3 py-2 text-xs">Subtotal · Unverified</td>
                    </tr>
                    {!hidden && items.map((item) => (
                      <tr key={item.id} className="cursor-pointer hover:bg-ivory" onClick={() => setRow(model.views.creditors.rows.find((candidate) => candidate.id === item.id) ?? null)}>
                        <Sticky value={item.category} index={0} />
                        <Sticky value={item.supplier} index={1} />
                        <Sticky value={formatDisplayDate(item.invoiceDate)} index={2} />
                        <Sticky value={formatMoney(item.amount, currency)} index={3} money />
                        <Sticky value={currency} index={4} />
                        <Sticky value={item.reference} index={5} />
                        <td className="border-b border-line px-3 py-2 text-muted">Not provided</td>
                        {Array.from({ length: slots }, (_, index) => {
                          const payment = item.payments[index]
                          if (!payment) return [
                            <td key={`${item.id}-${index}-d`} className="border-b border-line px-3 py-2" />,
                            <td key={`${item.id}-${index}-a`} className="border-b border-line px-3 py-2" />,
                            <td key={`${item.id}-${index}-r`} className="border-b border-line px-3 py-2" />,
                          ]
                          return [
                            <td key={`${payment.paymentId}-${index}-d`} className="border-b border-line px-3 py-2">{formatDisplayDate(payment.date)}{payment.afterPeriod ? ' *' : ''}</td>,
                            <td key={`${payment.paymentId}-${index}-a`} className="border-b border-line px-3 py-2 money">
                              {payment.split.length > 0 ? (
                                <Pop.Root>
                                  <Pop.Trigger asChild><button type="button" className="underline" onClick={(event) => event.stopPropagation()}>{formatMoney(payment.amount, currency)}</button></Pop.Trigger>
                                  <Pop.Portal>
                                    <Pop.Content className="z-40 w-64 rounded-card bg-white p-3 text-xs shadow-card">
                                      This payment is split. {payment.split.map((part) => `${part.reference} ${formatMoney(part.amount, currency)}`).join('; ')}
                                    </Pop.Content>
                                  </Pop.Portal>
                                </Pop.Root>
                              ) : formatMoney(payment.amount, currency)}
                            </td>,
                            <td key={`${payment.paymentId}-${index}-r`} className="border-b border-line px-3 py-2">{payment.reference}</td>,
                          ]
                        })}
                        <td className="border-b border-line px-3 py-2 money">{formatMoney(item.amount, currency)}</td>
                        <td className="border-b border-line px-3 py-2 money">{formatMoney(item.allocated, currency)}</td>
                        <td className="border-b border-line px-3 py-2 money">{formatMoney(item.creditNotes, currency)}</td>
                        <td className="border-b border-line px-3 py-2 money">{formatMoney(item.outstanding, currency)}</td>
                        <td className="border-b border-line px-3 py-2">{item.status}</td>
                        <td className="border-b border-line px-3 py-2">{formatDisplayDate(item.dueDate)}</td>
                        <td className="border-b border-line px-3 py-2">{item.aging}</td>
                        <td className="border-b border-line px-3 py-2">Unverified <VerifyBadge status="unreconciled" /></td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {model.views.creditors.charts.map((chart) => <ChartCard key={chart.id} spec={chart} />)}
      </div>
      <TransactionDrawer row={row} onClose={() => setRow(null)} />
      <InvoiceDialog open={invoiceOpen} onOpenChange={setInvoiceOpen} currency={currency} references={ledger.creditorInvoices.map((invoice) => invoice.reference)} onSave={(invoice) => addInvoice({ ...invoice, creatorId: ROLE_USER[role].id })} />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} currency={currency} rows={live} onSave={(payment) => addPayment({ ...payment, creatorId: ROLE_USER[role].id })} />
      <AllocateDialog open={allocOpen} onOpenChange={setAllocOpen} payments={unmatched} rows={live} onSave={setAllocations} />
    </div>
  )
}

function offset(index: number) {
  return FIXED.slice(0, index).reduce((sum, column) => sum + column.width, 0)
}

function Sticky({ value, index, money }: { value: string; index: number; money?: boolean }) {
  return <td className={`sticky z-10 border-b border-line bg-white px-3 py-2 ${money ? 'money' : ''}`} style={{ left: offset(index), minWidth: FIXED[index]!.width }}>{value}</td>
}

function InvoiceDialog({ open, onOpenChange, currency, references, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; currency: CurrencyCode; references: string[]; onSave: (invoice: import('@/types').CreditorInvoice) => void }) {
  const closed = useAppStore((state) => state.settings.closedPeriods)
  const [supplier, setSupplier] = useState('Demo Gas & Lift Ltd')
  const [category, setCategory] = useState('Fuel & gas')
  const [amount, setAmount] = useState('10000')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState('2026-10-20')
  const [error, setError] = useState('')
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add supplier invoice">
      <div className="grid gap-3">
        {error && <p className="text-sm text-unreconciled">{error}</p>}
        <input className={inputClass} value={supplier} onChange={(event) => setSupplier(event.target.value)} aria-label="Supplier" />
        <input className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category" />
        <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Invoice date" />
        <input className={inputClass} value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Amount" />
        <input className={inputClass} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Invoice reference" aria-label="Reference" />
        <Button variant="primary" onClick={() => {
          if (!reference.trim()) { setError('Enter an invoice reference.'); return }
          if (references.includes(reference.trim())) { setError('That reference already exists. A duplicate was not added.'); return }
          if (closed.includes(date.slice(0, 7))) { setError('That month is closed. The invoice was not posted.'); return }
          onSave({
            id: `CR-SESSION-${Date.now()}`,
            supplier, category, invoiceDate: date, dueDate: date, amount: Number(amount) || 0, currency, reference,
            creditNotes: 0, branch: 'HQ', verify: 'estimated', exclude: false, creatorId: '', pipeline: 'submit',
            documents: ['session-entry.pdf'], notes: 'Session entry.',
          })
          onOpenChange(false)
        }}>Save invoice</Button>
      </div>
    </Modal>
  )
}

function AllocateDialog({ open, onOpenChange, payments, rows, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; payments: import('@/types').SupplierPayment[]; rows: HorizontalRow[]; onSave: (paymentId: string, allocations: { invoiceId: string; amount: number }[]) => void }) {
  const [paymentId, setPaymentId] = useState(payments[0]?.id ?? '')
  const [invoiceId, setInvoiceId] = useState(rows[0]?.id ?? '')
  const payment = payments.find((item) => item.id === paymentId) ?? payments[0]
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Allocate an unmatched payment">
      <div className="grid gap-3">
        <p className="text-sm text-muted">The payment stays one disbursement. This only records which invoice it settles.</p>
        <select className={inputClass} aria-label="Unmatched payment" value={payment?.id ?? ''} onChange={(event) => setPaymentId(event.target.value)}>
          {payments.map((item) => <option key={item.id} value={item.id}>{item.bankRef} · {formatMoney(item.amount, item.currency)}</option>)}
        </select>
        <select className={inputClass} aria-label="Invoice" value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)}>
          {rows.map((item) => <option key={item.id} value={item.id}>{item.reference}</option>)}
        </select>
        <Button variant="primary" disabled={!payment || !invoiceId} onClick={() => {
          if (!payment) return
          onSave(payment.id, [{ invoiceId, amount: payment.amount }])
          onOpenChange(false)
        }}>Save allocation</Button>
      </div>
    </Modal>
  )
}

function PaymentDialog({ open, onOpenChange, currency, rows, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; currency: CurrencyCode; rows: HorizontalRow[]; onSave: (payment: import('@/types').SupplierPayment) => void }) {
  const [supplier, setSupplier] = useState(rows[0]?.supplier ?? '')
  const [amount, setAmount] = useState('5000')
  const [invoiceId, setInvoiceId] = useState(rows[0]?.id ?? '')
  const [reference, setReference] = useState('')
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Record payment">
      <div className="grid gap-3">
        <input className={inputClass} value={supplier} onChange={(event) => setSupplier(event.target.value)} aria-label="Supplier" />
        <input className={inputClass} value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Amount" />
        <input className={inputClass} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Bank reference" aria-label="Bank reference" />
        <select className={inputClass} value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} aria-label="Allocate to invoice">
          <option value="">Leave unmatched</option>
          {rows.map((item) => <option key={item.id} value={item.id}>{item.reference}</option>)}
        </select>
        <Button variant="primary" onClick={() => {
          const value = Number(amount) || 0
          onSave({
            id: `PAY-SESSION-${Date.now()}`,
            date: '2026-10-26',
            supplier,
            method: 'EFT',
            bankRef: reference || 'SESSION',
            currency,
            branch: 'HQ',
            amount: value,
            allocations: invoiceId ? [{ invoiceId, amount: value }] : [],
            unmatched: !invoiceId,
            verify: 'estimated',
            creatorId: '',
            pipeline: 'submit',
            documents: reference ? ['payment-advice.pdf'] : [],
            notes: 'Session payment.',
          })
          onOpenChange(false)
        }}>Save payment</Button>
      </div>
    </Modal>
  )
}
