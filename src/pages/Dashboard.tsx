import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  Banknote,
  FileText,
  Landmark,
  Receipt,
  Scale,
  Tent,
  Users,
  Wallet,
  WalletCards,
} from 'lucide-react'
import { ChartCard } from '@/components/dashboard/ChartCard'
import { rangeCaption } from '@/components/dashboard/FilterBar'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { AgingChart, CashChart, MixDonut, TrendChart } from '@/components/dashboard/MoneyCharts'
import { useFinance } from '@/finance'
import { formatCompact } from '@/lib/format'
import { cn } from '@/lib/cn'
import { getHomeDashboard } from '@/services/homeService'
import type { CurrencyCode, Preset } from '@/types'

function periodWord(preset: Preset) {
  if (preset === 'today') return 'today'
  if (preset === 'this-week') return 'this week'
  if (preset === 'this-month') return 'this month'
  if (preset === 'this-quarter') return 'this quarter'
  if (preset === 'this-year') return 'this year'
  return 'this period'
}

function changeClass(pct: number) {
  if (pct > 0) return 'text-[#1E6B50]'
  if (pct < 0) return 'text-[#C0562A]'
  return 'text-muted'
}

function changeText(pct: number) {
  if (pct === 0) return 'Flat on previous period'
  return `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% on previous period`
}

export function Dashboard() {
  const { filters, loading, href } = useFinance()
  const navigate = useNavigate()
  const path = useLocation().pathname
  const currency: CurrencyCode = filters.currency === 'ALL' ? 'KES' : filters.currency
  const when = periodWord(filters.preset)
  const home = useMemo(() => getHomeDashboard(currency, filters), [currency, filters])
  const cards = [
    { id: 'revenue', label: 'Total Revenue', caption: `Earned · ${when}`, amount: home.revenue.amount, pct: home.revenue.pct, href: '/revenue', icon: Wallet, tint: 'orange' as const },
    { id: 'receipts', label: 'Cash Received', caption: `Collected · ${when}`, amount: home.receipts.amount, pct: home.receipts.pct, href: '/receipts', icon: Banknote, tint: 'green' as const },
    { id: 'debtors', label: 'Outstanding Debtors', caption: 'Pending collection', amount: home.debtors.amount, pct: home.debtors.pct, href: '/debtors', icon: Users, tint: 'gold' as const },
    { id: 'invoices', label: 'Invoices Issued', caption: `Raised · ${when}`, amount: home.invoices.amount, pct: home.invoices.pct, href: '/invoices', icon: FileText, tint: 'blue' as const },
    { id: 'expenses', label: 'Expenses', caption: `Incurred · ${when}`, amount: home.expenses.amount, pct: home.expenses.pct, href: '/expenses', icon: Receipt, tint: 'orange' as const },
    { id: 'creditors', label: 'Creditors Outstanding', caption: 'Owed to suppliers', amount: home.creditors.amount, pct: home.creditors.pct, href: '/creditors', icon: Landmark, tint: 'green' as const },
    { id: 'payments', label: 'Creditor Payments', caption: `Paid · ${when}`, amount: home.payments.amount, pct: home.payments.pct, href: '/creditor-payments', icon: ArrowLeftRight, tint: 'gold' as const },
    { id: 'pnl', label: 'Net Operating Result', caption: 'Revenue less costs', amount: home.pnl.amount, pct: home.pnl.pct, href: '/reports', icon: Scale, tint: 'blue' as const },
    { id: 'payroll', label: 'Payroll', caption: 'Net pay · period', amount: home.payroll.amount, pct: home.payroll.pct, href: '/payroll', icon: WalletCards, tint: 'orange' as const },
    { id: 'statutory', label: 'Statutory', caption: 'Due · period', amount: home.statutory.amount, pct: home.statutory.pct, href: '/statutory', icon: Landmark, tint: 'green' as const },
    { id: 'hq', label: 'HQ Petty Cash', caption: 'Weekly float', amount: home.hq.amount, pct: home.hq.pct, href: '/hq-petty-cash', icon: Wallet, tint: 'gold' as const },
    { id: 'mara', label: 'Mara Petty Cash', caption: 'Daily float', amount: home.mara.amount, pct: home.mara.pct, href: '/mara-petty-cash', icon: Tent, tint: 'blue' as const },
  ]
  return (
    <div>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-[24px] font-semibold leading-none tracking-tight text-forest-900">Dashboard</h1>
        <p className="text-[12.5px] leading-none text-muted">{rangeCaption(filters)}</p>
      </div>
      {loading ? <DashboardSkeleton /> : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {cards.map((card) => (
              <KpiCard key={card.id} {...card} currency={currency} href={href(card.href)} selected={path === card.href} />
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="h-full xl:col-span-2">
              <ChartCard title="Revenue Overview" subtitle="Revenue against cost, last 6 months" action={<Link className="text-[12px] font-medium leading-none text-forest-600" to={href('/reports')}>View report →</Link>}>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Mini label="Revenue" amount={home.revenue.amount} pct={home.revenue.pct} currency={currency} />
                  <Mini label="Cash received" amount={home.receipts.amount} pct={home.receipts.pct} currency={currency} />
                  <Mini label="Expenses" amount={home.expenses.amount} pct={home.expenses.pct} currency={currency} />
                  <Mini label="Net result" amount={home.pnl.amount} pct={home.pnl.pct} currency={currency} />
                </div>
                <TrendChart
                  points={home.trend}
                  currency={currency}
                  empty={home.empty}
                  onOpen={(month, series) => navigate(href(series === 'cost' ? '/expenses' : '/revenue', { month }))}
                />
              </ChartCard>
            </div>
            <ChartCard title="Revenue Mix" subtitle="Revenue by stream" action={<Link className="text-[12px] font-medium leading-none text-forest-600" to={href('/revenue')}>View all →</Link>}>
              <MixDonut slices={home.mix.map((slice) => ({ ...slice, href: href(slice.href) }))} currency={currency} totalLabel="Revenue" empty={home.empty} />
            </ChartCard>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <ChartCard title="Receivables Aging" subtitle="Open balances">
              <AgingChart bars={home.aging.map((bar) => ({ ...bar, href: href('/debtors') }))} currency={currency} empty={home.empty} onOpen={(bucket) => navigate(href('/debtors', { bucket }))} />
            </ChartCard>
            <ChartCard title="Expense Mix" subtitle="Cost by stream">
              <MixDonut slices={home.costs.map((slice) => ({ ...slice, href: href(slice.href) }))} currency={currency} totalLabel="Costs" empty={home.empty} />
            </ChartCard>
            <ChartCard title="Cash Movement" subtitle="Received and paid, last 6 months">
              <CashChart points={home.cash} currency={currency} empty={home.empty} onOpen={(month, series) => navigate(href(series === 'paid' ? '/creditor-payments' : '/receipts', { month }))} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}

function Mini({ label, amount, pct, currency }: { label: string; amount: number; pct: number; currency: CurrencyCode }) {
  return (
    <div className="rounded-[10px] border border-[#D7E6DE] bg-white px-3 py-3">
      <p className="truncate text-[11.5px] leading-none text-muted">{label}</p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-[11px] font-medium leading-none text-muted">{currency}</span>
        <span className="money font-display text-[18px] leading-none text-forest-900">{formatCompact(amount)}</span>
      </p>
      <p className={cn('mt-1.5 truncate text-[11px] leading-none', changeClass(pct))}>{changeText(pct)}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, index) => <div key={index} className="h-[118px] animate-pulse rounded-lg border border-line bg-white shadow-card" />)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="h-[457px] animate-pulse rounded-lg border border-line bg-white shadow-card xl:col-span-2" />
        <div className="h-[457px] animate-pulse rounded-lg border border-line bg-white shadow-card" />
      </div>
    </>
  )
}
