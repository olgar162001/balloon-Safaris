import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  Banknote,
  FileText,
  Landmark,
  Scale,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useFinance } from '@/finance'
import { useAppStore } from '@/store'
import type { AllocationRule, CurrencyCode, LedgerKind, LedgerRow, SummaryCardModel } from '@/types'
import { ChartCard } from '@/components/Charts'
import { DataTable } from '@/components/DataTable'
import { KpiCard, type KpiTint } from '@/components/dashboard/KpiCard'
import { TransactionDrawer } from '@/components/Drawer'
import { PageHeader } from '@/components/widgets'
import { Button } from '@/components/ui'

const CARD_META: Record<string, { icon: LucideIcon; tint: KpiTint; caption: string }> = {
  total: { icon: Wallet, tint: 'orange', caption: 'This period' },
  count: { icon: FileText, tint: 'blue', caption: 'Included' },
  paid: { icon: Banknote, tint: 'green', caption: 'Settled' },
  outstanding: { icon: Scale, tint: 'gold', caption: 'Open' },
  overdue: { icon: Landmark, tint: 'orange', caption: 'Past due' },
  variance: { icon: ArrowLeftRight, tint: 'blue', caption: 'vs prior' },
}

const SHOW = ['total', 'paid', 'outstanding', 'overdue'] as const

export function ModuleScreen({ kind }: { kind: LedgerKind }) {
  const { model, ledger, loading, drill, filters } = useFinance()
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const view = model.views[kind]
  const [search, setSearch] = useState('')
  const [slice, setSlice] = useState<'all' | 'paid' | 'outstanding' | 'overdue'>('all')
  const [row, setRow] = useState<LedgerRow | null>(null)
  const currency: CurrencyCode = filters.currency === 'ALL' ? 'KES' : filters.currency

  useEffect(() => {
    if (!drill.txn) return
    const match = [...view.rows, ...view.excluded].find((item) => item.id === drill.txn || item.id.endsWith(drill.txn))
    if (match) setRow(match)
  }, [drill.txn, view.rows, view.excluded])

  const rows = useMemo(() => view.rows.filter((item) => {
    if (search && !JSON.stringify(item.values).toLowerCase().includes(search.toLowerCase())) return false
    if (slice === 'paid') return item.settle === 'paid'
    if (slice === 'outstanding') return item.slotOutstanding > 0.004
    if (slice === 'overdue') return item.slotOverdue !== 0
    return true
  }), [view.rows, search, slice])

  const cards = view.summaries.filter((card) => (SHOW as readonly string[]).includes(card.id))
  const collection = (kind === 'revenue' || kind === 'invoices') ? model.collection : []
  const kpiCount = cards.length + collection.length
  const filterSummary = `${model.filters.from} to ${model.filters.to}, ${model.filters.branch}, ${model.filters.currency}`

  return (
    <div className="w-full">
      <PageHeader title={view.title} eyebrow={view.eyebrow} />
      {loading ? (
        <div className="mb-6 flex flex-wrap gap-4">
          {Array.from({ length: Math.max(4, kpiCount) }, (_, index) => (
            <div key={index} className="h-[118px] min-w-[10.5rem] flex-1 animate-pulse rounded-lg border border-line bg-white shadow-card" />
          ))}
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap gap-4">
          {cards.map((card) => (
            <div key={card.id} className="min-w-[10.5rem] flex-1">
              <SummaryKpi
                card={card}
                currency={currency}
                selected={slice === card.id || ((card.id === 'total') && slice === 'all')}
                onClick={() => {
                  if (card.id === 'paid' || card.id === 'outstanding' || card.id === 'overdue') setSlice(card.id)
                  else setSlice('all')
                }}
              />
            </div>
          ))}
          {collection.map((rate) => (
            <div key={rate.currency} className="min-w-[10.5rem] flex-1">
              <KpiCard
                label={`${rate.currency} collection`}
                caption="Applied to billed"
                value={rate.rate === null ? '-' : `${rate.rate.toFixed(0)}%`}
                icon={Banknote}
                tint="green"
              />
            </div>
          ))}
        </div>
      )}

      {kind === 'vouchers' && <VoucherExtras rows={view.rows} />}
      {kind === 'pd' && <PdExtras rows={view.rows} locked={settings.lockedDays} onLock={(date) => updateSettings({ lockedDays: settings.lockedDays.includes(date) ? settings.lockedDays : [...settings.lockedDays, date] })} />}
      {kind === 'allocations' && <Rules rules={ledger.allocationRules} />}
      {kind === 'hq-petty' && <PettyWaterfall rows={view.rows} />}

      {view.charts.length > 0 && (
        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          {view.charts.map((chart) => <ChartCard key={chart.id} spec={chart} />)}
        </div>
      )}

      <div className="mb-3">
        <input
          className="h-[34px] w-full max-w-sm rounded-lg border border-line bg-white px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-gold"
          placeholder="Search"
          aria-label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <DataTable title={view.title} filterSummary={filterSummary} columns={view.columns} rows={rows} onRow={setRow} />
      {view.excluded.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-[13px] font-medium text-muted">Excluded ({view.excluded.length})</p>
          <DataTable title={`${view.title} excluded`} filterSummary={filterSummary} columns={view.columns} rows={view.excluded} onRow={setRow} />
        </div>
      )}
      <TransactionDrawer row={row} onClose={() => setRow(null)} />
    </div>
  )
}

function SummaryKpi({
  card,
  currency,
  selected,
  onClick,
}: {
  card: SummaryCardModel
  currency: CurrencyCode
  selected?: boolean
  onClick: () => void
}) {
  const meta = CARD_META[card.id] ?? CARD_META.total
  const line = card.lines.find((item) => item.currency === currency) ?? card.lines[0]
  if (card.count !== undefined) {
    return (
      <KpiCard
        label={card.label}
        caption={meta.caption}
        count={card.count}
        icon={meta.icon}
        tint={meta.tint}
        selected={selected}
        onClick={onClick}
      />
    )
  }
  return (
    <KpiCard
      label={card.label}
      caption={meta.caption}
      amount={line?.amount ?? 0}
      currency={(line?.currency as CurrencyCode | undefined) ?? currency}
      icon={meta.icon}
      tint={meta.tint}
      selected={selected}
      onClick={onClick}
    />
  )
}

function VoucherExtras({ rows }: { rows: LedgerRow[] }) {
  const stages = [
    ['Issued', rows.length],
    ['Paid', rows.filter((row) => Number(row.values.received) > 0 && row.status !== 'cancelled').length],
    ['Flown', rows.filter((row) => row.values.flightStatus === 'flown').length],
  ] as const
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      {stages.map(([label, count], index) => (
        <KpiCard key={label} label={label} caption={`Stage ${index + 1}`} count={count} icon={FileText} tint={index === 2 ? 'green' : index === 1 ? 'gold' : 'blue'} />
      ))}
    </div>
  )
}

function PdExtras({ rows, locked, onLock }: { rows: LedgerRow[]; locked: string[]; onLock: (date: string) => void }) {
  const days = [...new Set(rows.map((row) => row.date))].sort()
  if (!days.length) return null
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {days.map((day) => (
        <Button key={day} variant={locked.includes(day) ? 'primary' : 'outline'} onClick={() => onLock(day)}>
          {day} {locked.includes(day) ? 'locked' : 'open'}
        </Button>
      ))}
    </div>
  )
}

function Rules({ rules }: { rules: AllocationRule[] }) {
  if (!rules.length) return null
  return (
    <div className="mb-6 rounded-lg border border-line bg-white p-4 shadow-card">
      <h2 className="text-[15px] font-semibold text-forest-900">Allocation rules</h2>
      <ul className="mt-3 space-y-2 text-[13px]">
        {rules.map((rule) => (
          <li key={rule.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
            <span>{rule.beneficiary}</span>
            <span className="tabular font-medium">{rule.percentage == null ? 'n/a' : `${rule.percentage}%`}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PettyWaterfall({ rows }: { rows: LedgerRow[] }) {
  const week = [...rows].reverse().find((item) => item.currency === 'KES') ?? rows[0]
  if (!week) return null
  const opening = Number(week.values.opening ?? 0)
  const topUp = Number(week.values.topups ?? week.values.inflow ?? 0)
  const spent = Number(week.values.vouchers ?? week.values.outflow ?? week.amount)
  const closing = Number(week.values.balance ?? week.values.closing ?? opening + topUp - spent)
  const code = (week.currency === 'MISSING' ? 'KES' : week.currency) as CurrencyCode
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-4">
      <KpiCard label="Opening" caption="Float" amount={opening} currency={code} icon={Wallet} tint="blue" />
      <KpiCard label="Top-up" caption="Transfer" amount={topUp} currency={code} icon={Banknote} tint="green" />
      <KpiCard label="Spent" caption="Vouchers" amount={spent} currency={code} icon={FileText} tint="orange" />
      <KpiCard label="Closing" caption="Balance" amount={closing} currency={code} icon={Scale} tint="gold" />
    </div>
  )
}
