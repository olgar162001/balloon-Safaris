import { AGING_BUCKETS } from '@/lib/dates'
import { formatMonth, round2 } from '@/lib/format'
import type { ChartPoint, ChartSpec, CurrencyCode, HorizontalRow, LedgerRow } from '@/types'

const CURRENCIES: CurrencyCode[] = ['KES', 'USD', 'GBP']
const PALETTE = ['#0F4A38', '#1E6B50', '#C9A227', '#E8832A', '#2F6DB5', '#6B4A2F', '#3E8F6E', '#8A8175', '#A33B24']

const NAMED: Record<string, string> = {
  'advance-voucher': '#0F4A38',
  'pd-mara': '#E8832A',
  'paid-later': '#C9A227',
  operating: '#1E6B50',
  payroll: '#245C48',
  statutory: '#8A8175',
  'hq-petty': '#C9A227',
  'mara-petty': '#E8832A',
  'cash-in': '#1E6B50',
  'cash-out': '#8C3E2A',
  recognized: '#0F4A38',
  collected: '#C9A227',
  paid: '#1E6B50',
  partial: '#C9A227',
  overdue: '#C0392B',
  open: '#8A8175',
  'Not due': '#1E6B50',
  '1-30': '#C9A227',
  '31-60': '#E8832A',
  '61-90': '#2F6DB5',
  '>90': '#C0392B',
}

export function seriesColor(id: string, index: number) {
  return NAMED[id] ?? PALETTE[index % PALETTE.length]!
}

function currenciesOf(rows: LedgerRow[]) {
  return CURRENCIES.filter((currency) => rows.some((row) => row.included && row.currency === currency))
}

function spec(partial: Omit<ChartSpec, 'byCurrency'> & { byCurrency: ChartSpec['byCurrency'] }): ChartSpec {
  return partial
}

export function doughnutChart(rows: LedgerRow[], id: string, title: string, href: string, mode: 'group' | 'category' = 'group'): ChartSpec {
  const byCurrency: ChartSpec['byCurrency'] = {}
  for (const currency of currenciesOf(rows)) {
    const map = new Map<string, { name: string; amount: number }>()
    for (const row of rows) {
      if (!row.included || row.currency !== currency) continue
      const key = mode === 'group' ? row.group : row.category
      const name = mode === 'group' ? row.groupLabel : row.category
      const entry = map.get(key) ?? { name, amount: 0 }
      entry.amount = round2(entry.amount + row.amount)
      map.set(key, entry)
    }
    const points: ChartPoint[] = [...map.entries()]
      .filter(([, value]) => Math.abs(value.amount) > 0.004)
      .map(([key, value]) => ({ id: key, name: value.name, values: { amount: value.amount } }))
    byCurrency[currency] = { series: [{ key: 'amount', label: title, color: '#0F4A38' }], points }
  }
  return spec({ id, title, aria: title, kind: 'doughnut', drillParam: 'drill', href, byCurrency })
}

export function monthChart(rows: LedgerRow[], id: string, title: string, href: string, kind: ChartSpec['kind'] = 'bar'): ChartSpec {
  const byCurrency: ChartSpec['byCurrency'] = {}
  for (const currency of currenciesOf(rows)) {
    const map = new Map<string, number>()
    for (const row of rows) {
      if (!row.included || row.currency !== currency) continue
      map.set(row.month, round2((map.get(row.month) ?? 0) + row.amount))
    }
    const points = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ id: month, name: formatMonth(month), values: { amount } }))
    byCurrency[currency] = { series: [{ key: 'amount', label: title, color: '#0F4A38' }], points }
  }
  return spec({ id, title, aria: title, kind, drillParam: 'month', href, byCurrency })
}

export function allocationChart(rows: LedgerRow[]): ChartSpec {
  const byCurrency: ChartSpec['byCurrency'] = {}
  for (const currency of currenciesOf(rows)) {
    const map = new Map<string, { actual: number; allocated: number; paid: number }>()
    for (const row of rows) {
      if (!row.included || row.currency !== currency) continue
      const entry = map.get(row.month) ?? { actual: 0, allocated: 0, paid: 0 }
      entry.actual = round2(entry.actual + Number(row.values.actual ?? 0))
      entry.paid = round2(entry.paid + Number(row.values.paid ?? 0))
      map.set(row.month, entry)
    }
    const points = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ id: month, name: formatMonth(month), values: value }))
    byCurrency[currency] = {
      series: [
        { key: 'actual', label: 'Actual', color: '#0F4A38' },
        { key: 'allocated', label: 'Allocated (not posted)', color: '#C9A227' },
        { key: 'paid', label: 'Paid', color: '#E8832A' },
      ],
      points,
    }
  }
  return spec({
    id: 'alloc-stack',
    title: 'Actual, allocated and paid',
    aria: 'Actual, allocated and paid',
    kind: 'stacked-bar',
    drillParam: 'month',
    href: '/operations/allocations',
    byCurrency,
  })
}

export function performanceChart(revenue: LedgerRow[], receipts: LedgerRow[]): ChartSpec {
  const byCurrency: ChartSpec['byCurrency'] = {}
  const currencies = CURRENCIES.filter((currency) =>
    revenue.some((row) => row.included && row.currency === currency) || receipts.some((row) => row.included && row.currency === currency),
  )
  for (const currency of currencies) {
    const months = new Set<string>()
    const recognized = new Map<string, number>()
    const collected = new Map<string, number>()
    for (const row of revenue) {
      if (!row.included || row.currency !== currency) continue
      months.add(row.month)
      recognized.set(row.month, round2((recognized.get(row.month) ?? 0) + row.amount))
    }
    for (const row of receipts) {
      if (!row.included || row.currency !== currency) continue
      months.add(row.month)
      collected.set(row.month, round2((collected.get(row.month) ?? 0) + row.amount))
    }
    const points = [...months].sort().map((month) => ({
      id: month,
      name: formatMonth(month),
      values: { recognized: recognized.get(month) ?? 0, collected: collected.get(month) ?? 0 },
    }))
    byCurrency[currency] = {
      series: [
        { key: 'recognized', label: 'Recognized revenue', color: '#0F4A38' },
        { key: 'collected', label: 'Cash collected', color: '#C9A227' },
      ],
      points,
    }
  }
  return spec({
    id: 'performance',
    title: 'Revenue performance',
    aria: 'Revenue performance',
    kind: 'bar-line',
    drillParam: 'month',
    href: '/ledger/revenue',
    byCurrency,
  })
}

export function agingChart(rows: LedgerRow[], href: string, title = 'Receivables aging', aria = 'Receivables aging'): ChartSpec {
  const byCurrency: ChartSpec['byCurrency'] = {}
  for (const currency of currenciesOf(rows)) {
    const parties = new Map<string, Record<string, number>>()
    for (const row of rows) {
      if (!row.included || row.currency !== currency || row.bucket === 'Settled' || !row.bucket) continue
      const entry = parties.get(row.party) ?? {}
      entry[row.bucket] = round2((entry[row.bucket] ?? 0) + row.amount)
      parties.set(row.party, entry)
    }
    const points = [...parties.entries()].map(([party, values]) => ({ id: party, name: party, values }))
    byCurrency[currency] = {
      series: AGING_BUCKETS.map((bucket) => ({ key: bucket, label: bucket, color: seriesColor(bucket, 0) })),
      points,
    }
  }
  return spec({
    id: 'aging',
    title,
    aria,
    kind: 'horizontal-bar',
    drillParam: 'drill',
    seriesDrill: 'bucket',
    href,
    byCurrency,
  })
}

export function cashChart(rows: LedgerRow[]): ChartSpec {
  const byCurrency: ChartSpec['byCurrency'] = {}
  for (const currency of currenciesOf(rows)) {
    const months = new Map<string, { in: number; out: number }>()
    for (const row of rows) {
      if (!row.included || row.currency !== currency) continue
      const entry = months.get(row.month) ?? { in: 0, out: 0 }
      if (row.group === 'cash-in') entry.in = round2(entry.in + row.amount)
      else entry.out = round2(entry.out + row.amount)
      months.set(row.month, entry)
    }
    const points = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ id: month, name: formatMonth(month), values: { 'cash-in': value.in, 'cash-out': value.out } }))
    byCurrency[currency] = {
      series: [
        { key: 'cash-in', label: 'Cash in', color: '#1E6B50' },
        { key: 'cash-out', label: 'Cash out', color: '#8C3E2A' },
      ],
      points,
    }
  }
  return spec({
    id: 'cash-movement',
    title: 'Cash movement',
    aria: 'Cash movement',
    kind: 'grouped-bar',
    drillParam: 'month',
    href: '/ledger/cash',
    byCurrency,
  })
}

export function rankingChart(sheet: HorizontalRow[]): ChartSpec {
  const byCurrency: ChartSpec['byCurrency'] = {}
  for (const currency of CURRENCIES) {
    const map = new Map<string, number>()
    for (const row of sheet) {
      if (!row.included || row.currency !== currency || row.outstanding <= 0.004) continue
      map.set(row.supplier, round2((map.get(row.supplier) ?? 0) + row.outstanding))
    }
    const points = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([supplier, amount]) => ({ id: supplier, name: supplier, values: { amount } }))
    if (points.length) byCurrency[currency] = { series: [{ key: 'amount', label: 'Unverified outstanding', color: '#0F4A38' }], points }
  }
  return spec({
    id: 'creditor-rank',
    title: 'Creditors by outstanding',
    aria: 'Creditors by outstanding',
    kind: 'horizontal-bar',
    drillParam: 'drill',
    href: '/payables/creditors',
    byCurrency,
  })
}

export function statusChart(rows: LedgerRow[], href: string): ChartSpec {
  const byCurrency: ChartSpec['byCurrency'] = {}
  const keys = ['paid', 'partial', 'overdue', 'open'] as const
  for (const currency of currenciesOf(rows)) {
    const months = new Map<string, Record<string, number>>()
    for (const row of rows) {
      if (!row.included || row.currency !== currency) continue
      const key = keys.includes(row.settle as (typeof keys)[number]) ? row.settle : 'open'
      const entry = months.get(row.month) ?? {}
      entry[key] = round2((entry[key] ?? 0) + row.amount)
      months.set(row.month, entry)
    }
    const points = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ id: month, name: formatMonth(month), values }))
    byCurrency[currency] = {
      series: [
        { key: 'paid', label: 'Paid', color: '#1E6B50' },
        { key: 'partial', label: 'Partial', color: '#C9A227' },
        { key: 'open', label: 'Open', color: '#8A8175' },
        { key: 'overdue', label: 'Overdue', color: '#C0392B' },
      ],
      points,
    }
  }
  return spec({
    id: 'invoice-status',
    title: 'Invoice collection',
    aria: 'Invoice collection',
    kind: 'stacked-bar',
    drillParam: 'month',
    href,
    byCurrency,
  })
}
