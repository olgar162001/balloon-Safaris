import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROLES, ROLE_USER } from '@/access'
import { SIGN_OFF } from '@/copy'
import { Button, inputClass, Toggle } from '@/components/ui'
import { PageHeader, VerifyBadge } from '@/components/widgets'
import { useFinance } from '@/finance'
import { formatDisplayDate, formatMoney } from '@/lib/format'
import { exportRows } from '@/lib/export'
import { hashBuffer, parseWorkbook, workbookSample } from '@/services/importService'
import { buildStatement, statementParties } from '@/services/receivableService'
import { useAppStore } from '@/store'
import type { CurrencyCode, ViewColumn } from '@/types'

const REPORTS = [
  ['Daily', 'Mara PD cash', '/revenue/pd'],
  ['Daily', 'Receipt match', '/receipts'],
  ['Daily', 'Mara petty cash', '/mara-petty-cash'],
  ['Daily', 'Exceptions', '/control/exceptions'],
  ['Weekly', 'HQ petty cash', '/hq-petty-cash'],
  ['Weekly', 'Creditor payments', '/creditors'],
  ['Weekly', 'Collection follow-ups', '/receivables'],
  ['Monthly', 'Revenue by stream', '/revenue'],
  ['Monthly', 'Collections', '/receipts'],
  ['Monthly', 'Debtor aging', '/receivables/aging'],
  ['Monthly', 'Expenses', '/expenses'],
  ['Monthly', 'Payroll', '/payroll'],
  ['Monthly', 'Creditors aging', '/payables/outstanding'],
  ['Monthly', 'Cash movement', '/ledger/cash'],
  ['Monthly', 'Provisional P&L', '/ledger/pnl'],
  ['Quarterly', 'Quarterly pack', '/reports'],
  ['Annual', 'Annual pack', '/revenue'],
] as const

export function ReportsPage() {
  const { href } = useFinance()
  return (
    <div className="w-full">
      <PageHeader eyebrow="Control" title="Reports" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map(([cadence, title, path]) => (
          <Link key={title} to={href(path)} className="rounded-lg border border-line bg-white p-4 shadow-card transition hover:border-forest-600">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">{cadence}</p>
            <h2 className="mt-2 text-[15px] font-semibold text-forest-900">{title}</h2>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ExceptionsPage() {
  const { model } = useFinance()
  return (
    <div className="w-full">
      <PageHeader eyebrow="Control" title="Exceptions" />
      <ul className="space-y-3">
        {model.exceptions.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-card">
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-forest-900">{item.title}</h2>
              <p className="mt-1 text-[12px] text-muted">{item.severity} · {item.owner}</p>
            </div>
            <div className="flex items-center gap-3">
              <VerifyBadge status={item.verify} />
              <Link className="text-[13px] font-medium text-forest-600" to={item.href}>Open</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AuditPage() {
  const { model } = useFinance()
  return (
    <div className="w-full">
      <PageHeader eyebrow="Control" title="Audit log" />
      <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-card">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wider text-muted"><tr>{['When', 'User', 'Action', 'Entity', 'Before', 'After', 'Reason'].map((header) => <th key={header} className="border-b border-line bg-[#F7F3E8] px-4 py-2.5">{header}</th>)}</tr></thead>
          <tbody>
            {model.audit.map((event) => (
              <tr key={event.id} className="hover:bg-forest-100/40">
                <td className="border-b border-line px-4 py-2.5 tabular">{event.at.replace('T', ' ').slice(0, 16)}</td>
                <td className="border-b border-line px-4 py-2.5">{event.user}</td>
                <td className="border-b border-line px-4 py-2.5">{event.action}</td>
                <td className="border-b border-line px-4 py-2.5">{event.entity}</td>
                <td className="border-b border-line px-4 py-2.5">{event.before}</td>
                <td className="border-b border-line px-4 py-2.5">{event.after}</td>
                <td className="border-b border-line px-4 py-2.5">{event.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ReconciliationPage() {
  const { model } = useFinance()
  return (
    <div className="w-full">
      <PageHeader eyebrow="Operations" title="Reconciliation" />
      <div className="overflow-x-auto rounded-lg border border-line bg-white shadow-card">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wider text-muted"><tr>{['Type', 'Party', 'Source', 'Recalculated', 'Difference', 'Reviewer', 'Status'].map((header) => <th key={header} className="border-b border-line bg-[#F7F3E8] px-4 py-2.5">{header}</th>)}</tr></thead>
          <tbody>
            {model.recon.map((item) => (
              <tr key={item.id + item.type} className="hover:bg-forest-100/40">
                <td className="border-b border-line px-4 py-2.5">{item.type}</td>
                <td className="border-b border-line px-4 py-2.5">{item.party}</td>
                <td className="border-b border-line px-4 py-2.5">{item.sourceText}</td>
                <td className="border-b border-line px-4 py-2.5">{item.recalcText}</td>
                <td className="border-b border-line px-4 py-2.5">{item.differenceText}</td>
                <td className="border-b border-line px-4 py-2.5">{item.reviewer}</td>
                <td className="border-b border-line px-4 py-2.5"><VerifyBadge status={item.verify} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function StatementsPage({ side }: { side: 'customer' | 'supplier' }) {
  const { ledger, filters } = useFinance()
  const parties = statementParties(ledger, side)
  const [party, setParty] = useState(parties[0] ?? '')
  const [currency, setCurrency] = useState<CurrencyCode>('KES')
  const statement = useMemo(() => party ? buildStatement(ledger, party, side, currency, filters) : null, [ledger, party, side, currency, filters])
  const columns: ViewColumn[] = [
    { key: 'date', header: 'Date', kind: 'date' },
    { key: 'description', header: 'Description', kind: 'text' },
    { key: 'debit', header: 'Debit', kind: 'money' },
    { key: 'credit', header: 'Credit', kind: 'money' },
    { key: 'balance', header: 'Balance', kind: 'money' },
  ]
  return (
    <div className="w-full">
      <PageHeader eyebrow={side === 'customer' ? 'Receivables' : 'Payables'} title={side === 'customer' ? 'Customer statements' : 'Supplier accounts'} extra={<Button onClick={() => window.print()}>Print</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <select className={inputClass + ' max-w-xs'} aria-label="Party" value={party} onChange={(event) => setParty(event.target.value)}>
          {parties.map((name) => <option key={name}>{name}</option>)}
        </select>
        {(['KES', 'USD', 'GBP'] as CurrencyCode[]).map((item) => <Button key={item} variant={currency === item ? 'primary' : 'outline'} onClick={() => setCurrency(item)}>{item}</Button>)}
        {statement && <Button onClick={() => exportRows('pdf', `${party} statement`, statement.note, columns, statement.lines.map((line) => ({
          id: line.id, date: line.date, month: line.date.slice(0, 7), branch: 'HQ' as const, party, category: 'Statement', group: 'statement', groupLabel: 'Statement', bucket: '', status: '', settle: 'na' as const, verify: line.verify, currency, amount: line.balance, included: true, creatorId: '', pipeline: 'post' as const, slotPaid: line.credit, slotOutstanding: line.debit, slotOverdue: 0,
          values: { date: line.date, description: line.description, debit: line.debit, credit: line.credit, balance: line.balance },
          detail: { title: line.description, subtitle: '', amount: line.balance, currency, verify: line.verify, dates: [], facts: [], allocations: [], documents: [], approvals: [], notes: '', audit: [], source: '', sourceHref: '/', pipeline: 'post' as const, creatorId: '', requiresEvidence: false, domain: 'general' as const },
        })))}>Export PDF</Button>}
      </div>
      {statement && (
        <section className="rounded-lg border border-line bg-white p-4 shadow-card">
          <h2 className="text-[15px] font-semibold text-forest-900">{party}</h2>
          <p className="mt-3 text-[13px]">Opening <span className="money tabular">{formatMoney(statement.opening, currency)}</span> <VerifyBadge status={statement.openingVerify} /></p>
          <table className="mt-4 w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted"><tr>{['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Status'].map((header) => <th key={header} className="border-b border-line py-2.5 pr-3">{header}</th>)}</tr></thead>
            <tbody>
              {statement.lines.map((line) => (
                <tr key={line.id} className="hover:bg-forest-100/40">
                  <td className="border-b border-line py-2.5 pr-3">{formatDisplayDate(line.date)}</td>
                  <td className="border-b border-line py-2.5 pr-3">{line.description}</td>
                  <td className="border-b border-line py-2.5 pr-3 money tabular">{line.debit ? formatMoney(line.debit, currency) : '-'}</td>
                  <td className="border-b border-line py-2.5 pr-3 money tabular">{line.credit ? formatMoney(line.credit, currency) : '-'}</td>
                  <td className="border-b border-line py-2.5 pr-3 money tabular">{formatMoney(line.balance, currency)}</td>
                  <td className="border-b border-line py-2.5"><VerifyBadge status={line.verify} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-[13px] font-medium">Closing <span className="money tabular">{formatMoney(statement.closing, currency)}</span></p>
        </section>
      )}
    </div>
  )
}

export function ImportPage() {
  const imports = useAppStore((state) => state.imports)
  const addImport = useAppStore((state) => state.addImport)
  const rememberDuplicate = useAppStore((state) => state.rememberDuplicate)
  const role = useAppStore((state) => state.role)
  const [active, setActive] = useState(imports[0]?.id ?? '')
  const batch = imports.find((item) => item.id === active) ?? imports[0]
  const readOnly = role === 'Auditor'
  return (
    <div className="w-full">
      <PageHeader eyebrow="Control" title="Import center" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={workbookSample}>Download sample workbook</Button>
        <label className={`inline-flex h-[34px] cursor-pointer items-center rounded-lg border border-line bg-white px-3 text-[13px] ${readOnly ? 'opacity-50' : ''}`}>
          Upload workbook
          <input className="sr-only" type="file" accept=".xlsx,.xls,.csv" disabled={readOnly} onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            const buffer = await file.arrayBuffer()
            const fileHash = await hashBuffer(buffer)
            if (useAppStore.getState().imports.some((item) => item.fileHash === fileHash)) {
              rememberDuplicate(file.name)
              event.target.value = ''
              return
            }
            const next = parseWorkbook(buffer, file.name, fileHash)
            addImport(next)
            setActive(next.id)
            event.target.value = ''
          }} />
        </label>
      </div>
      {imports.length === 0 && <p className="text-[13px] text-muted">No batch staged.</p>}
      {batch && (
        <section className="rounded-lg border border-line bg-white p-4 shadow-card">
          <h2 className="text-[15px] font-semibold text-forest-900">{batch.fileName}</h2>
          <p className="mt-1 text-[12px] text-muted">Uploaded {batch.uploadedAt} · hash {batch.fileHash.slice(0, 12)} · posted: no · cells {batch.cells.length}</p>
          {batch.exceptions.length > 0 && <p className="mt-2 text-[13px] text-unreconciled">{batch.exceptions.join(' ')}</p>}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-muted"><tr>{['File', 'Sheet', 'Cell', 'Original', 'Formula', 'Displayed', 'Row hash'].map((header) => <th key={header} className="border-b border-line bg-[#F7F3E8] px-3 py-2.5">{header}</th>)}</tr></thead>
              <tbody>
                {batch.cells.slice(0, 80).map((cell) => (
                  <tr key={cell.rowHash + cell.address} className="hover:bg-forest-100/40">
                    <td className="border-b border-line px-3 py-2.5">{cell.file}</td>
                    <td className="border-b border-line px-3 py-2.5">{cell.sheet}</td>
                    <td className="border-b border-line px-3 py-2.5">{cell.address}</td>
                    <td className="border-b border-line px-3 py-2.5">{cell.original}</td>
                    <td className="border-b border-line px-3 py-2.5">{cell.formula || '-'}</td>
                    <td className="border-b border-line px-3 py-2.5">{cell.displayed}</td>
                    <td className="border-b border-line px-3 py-2.5 tabular">{cell.rowHash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export function SettingsPage() {
  const { model } = useFinance()
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const role = useAppStore((state) => state.role)
  const month = model.filters.to.slice(0, 7)
  const locked = role === 'Auditor' || role === 'Mara Cashier' || role === 'HQ Cash Custodian'
  return (
    <div className="w-full space-y-4">
      <PageHeader eyebrow="Control" title="Settings" />
      <section id="signoff" className="rounded-lg border border-line bg-white p-4 shadow-card">
        <h2 className="text-[15px] font-semibold text-forest-900">Sign-off</h2>
        <ul className="mt-3 space-y-2">
          {SIGN_OFF.map((item, index) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-ivory px-3 py-2">
              <p className="text-[13px] font-medium">{index + 1}. {item.title}</p>
              <span className="text-[11px] uppercase tracking-wider text-estimated">Pending</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-lg border border-line bg-white p-4 shadow-card">
        <h2 className="text-[15px] font-semibold text-forest-900">Recognition and labels</h2>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span>On flight delivery</span>
          <Toggle.Root className="h-6 w-11 rounded-full bg-cream data-[state=checked]:bg-forest-600" checked={settings.recognition === 'on-payment'} disabled={locked} onCheckedChange={(checked) => updateSettings({ recognition: checked ? 'on-payment' : 'on-flight' })} aria-label="Recognition policy">
            <Toggle.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-[22px]" />
          </Toggle.Root>
          <span>On payment</span>
        </div>
        <label className="mt-4 block text-[13px]">PD label
          <input className={inputClass + ' mt-1 max-w-sm'} value={settings.pdLabel} disabled={locked} onChange={(event) => updateSettings({ pdLabel: event.target.value })} />
        </label>
        <label className="mt-3 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={settings.showDemoRibbon} onChange={(event) => updateSettings({ showDemoRibbon: event.target.checked })} /> Show DEMO DATA ribbon</label>
      </section>
      <section className="rounded-lg border border-line bg-white p-4 shadow-card">
        <h2 className="text-[15px] font-semibold text-forest-900">FX rates</h2>
        <table className="mt-3 text-[13px]">
          <thead className="text-[11px] uppercase tracking-wider text-muted"><tr>{['Date', 'Pair', 'Rate', 'Approved'].map((header) => <th key={header} className="py-1 pr-4 text-left">{header}</th>)}</tr></thead>
          <tbody>
            <tr><td className="py-1 pr-4">2026-10-01</td><td>USD/KES</td><td className="tabular">129.40</td><td>No</td></tr>
            <tr><td className="py-1 pr-4">2026-10-01</td><td>GBP/KES</td><td className="tabular">171.20</td><td>No</td></tr>
          </tbody>
        </table>
      </section>
      <section className="rounded-lg border border-line bg-white p-4 shadow-card">
        <h2 className="text-[15px] font-semibold text-forest-900">Roles</h2>
        <ul className="mt-3 space-y-2 text-[13px]">
          {ROLES.map((item) => <li key={item}><span className="font-medium">{ROLE_USER[item].name}</span> · {item}</li>)}
        </ul>
      </section>
      <section className="rounded-lg border border-line bg-white p-4 shadow-card">
        <h2 className="text-[15px] font-semibold text-forest-900">Period close</h2>
        <p className="mt-1 text-[13px] text-muted">Closed: {settings.closedPeriods.join(', ') || 'None'}</p>
        <Button className="mt-3" disabled={locked || settings.closedPeriods.includes(month)} onClick={() => updateSettings({ closedPeriods: [...settings.closedPeriods, month] })}>Close {month}</Button>
      </section>
    </div>
  )
}
