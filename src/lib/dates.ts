import {
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns'
import type { CurrencyFilter, Drill, GlobalFilters, Preset, StatusFilter } from '@/types'

const PRESETS: Preset[] = ['today', 'this-week', 'this-month', 'last-month', 'this-quarter', 'this-year', 'custom']
const STATUSES: StatusFilter[] = ['all', 'open', 'paid', 'partial', 'overdue', 'disputed', 'verified', 'source-reported', 'estimated', 'unreconciled']

export function iso(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

export function rangeFor(preset: Preset, today = new Date()) {
  if (preset === 'today') return { from: iso(today), to: iso(today) }
  if (preset === 'this-week') {
    return {
      from: iso(startOfWeek(today, { weekStartsOn: 1 })),
      to: iso(endOfWeek(today, { weekStartsOn: 1 })),
    }
  }
  if (preset === 'this-month') return { from: iso(startOfMonth(today)), to: iso(endOfMonth(today)) }
  if (preset === 'last-month') {
    const start = startOfMonth(subMonths(today, 1))
    return { from: iso(start), to: iso(endOfMonth(start)) }
  }
  if (preset === 'this-quarter') return { from: iso(startOfQuarter(today)), to: iso(endOfQuarter(today)) }
  if (preset === 'this-year') return { from: iso(startOfYear(today)), to: iso(endOfYear(today)) }
  return { from: iso(startOfMonth(today)), to: iso(today) }
}

export function defaultFilters(today = new Date()): GlobalFilters {
  return {
    preset: 'today',
    ...rangeFor('today', today),
    branch: 'All',
    party: '',
    status: 'all',
    currency: 'KES',
  }
}

export const emptyDrill = (): Drill => ({ drill: '', month: '', bucket: '', txn: '' })

function isPreset(value: string | null): value is Preset {
  return PRESETS.includes(value as Preset)
}

function isStatus(value: string | null): value is StatusFilter {
  return STATUSES.includes(value as StatusFilter)
}

function isCurrency(value: string | null): value is CurrencyFilter {
  return value === 'ALL' || value === 'KES' || value === 'USD' || value === 'GBP'
}

export function readQuery(params: URLSearchParams) {
  const base = defaultFilters()
  const presetParam = params.get('preset')
  const branchParam = params.get('branch')
  const statusParam = params.get('status')
  const currencyParam = params.get('currency')
  const preset: Preset = isPreset(presetParam) ? presetParam : base.preset
  const branch: GlobalFilters['branch'] = branchParam === 'HQ' || branchParam === 'Mara' ? branchParam : 'All'
  const status: StatusFilter = isStatus(statusParam) ? statusParam : 'all'
  const currency: CurrencyFilter = isCurrency(currencyParam) ? currencyParam : 'ALL'
  return {
    filters: {
      preset,
      from: params.get('from') || base.from,
      to: params.get('to') || base.to,
      branch,
      party: params.get('party') ?? '',
      status,
      currency,
    } satisfies GlobalFilters,
    drill: {
      drill: params.get('drill') ?? '',
      month: params.get('month') ?? '',
      bucket: params.get('bucket') ?? '',
      txn: params.get('txn') ?? '',
    } satisfies Drill,
  }
}

export function toSearch(filters: GlobalFilters, drill: Drill) {
  const params = new URLSearchParams()
  params.set('preset', filters.preset)
  params.set('from', filters.from)
  params.set('to', filters.to)
  params.set('branch', filters.branch)
  if (filters.party) params.set('party', filters.party)
  params.set('status', filters.status)
  params.set('currency', filters.currency)
  if (drill.drill) params.set('drill', drill.drill)
  if (drill.month) params.set('month', drill.month)
  if (drill.bucket) params.set('bucket', drill.bucket)
  if (drill.txn) params.set('txn', drill.txn)
  return params.toString()
}

export function previousFilters(filters: GlobalFilters): GlobalFilters {
  const days = differenceInCalendarDays(parseISO(filters.to), parseISO(filters.from)) + 1
  const prevTo = subDays(parseISO(filters.from), 1)
  const prevFrom = subDays(prevTo, Math.max(days - 1, 0))
  return { ...filters, preset: 'custom', from: iso(prevFrom), to: iso(prevTo) }
}

export function inRange(date: string, from: string, to: string) {
  const day = date.slice(0, 10)
  return day >= from && day <= to
}

export function daysPast(asOf: string, due: string) {
  return differenceInCalendarDays(parseISO(asOf), parseISO(due))
}

export function bucketFor(due: string, asOf: string, balance: number) {
  if (balance <= 0.004) return 'Settled'
  const days = daysPast(asOf, due)
  if (days <= 0) return 'Not due'
  if (days <= 30) return '1-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '>90'
}

export const AGING_BUCKETS = ['Not due', '1-30', '31-60', '61-90', '>90'] as const
