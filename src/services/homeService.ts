import { addDays, format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { iso, previousFilters } from '@/lib/dates'
import { round2 } from '@/lib/format'
import { HOME_DAY, homeDayFactor } from '@/mock/homeSeries'
import type { CurrencyCode, GlobalFilters } from '@/types'

export type HomeSlice = { id: string; name: string; amount: number; href: string; share: number }
export type HomePoint = { id: string; name: string; revenue: number; cost: number; net: number }
export type HomeCash = { id: string; name: string; received: number; paid: number }
export type HomeKpi = { amount: number; pct: number }

export type HomeDashboard = {
  empty: boolean
  revenue: HomeKpi
  receipts: HomeKpi
  debtors: HomeKpi
  invoices: HomeKpi
  expenses: HomeKpi
  creditors: HomeKpi
  payments: HomeKpi
  pnl: HomeKpi
  payroll: HomeKpi
  statutory: HomeKpi
  hq: HomeKpi
  mara: HomeKpi
  trend: HomePoint[]
  mix: HomeSlice[]
  costs: HomeSlice[]
  aging: HomeSlice[]
  cash: HomeCash[]
}

type Totals = {
  vouchers: number
  pd: number
  debtors: number
  payroll: number
  statutory: number
  creditors: number
  owed: number
  payments: number
  hq: number
  mara: number
}

const ZERO: Totals = { vouchers: 0, pd: 0, debtors: 0, payroll: 0, statutory: 0, creditors: 0, owed: 0, payments: 0, hq: 0, mara: 0 }
const SALT: Record<keyof Totals, number> = { vouchers: 0, pd: 3, debtors: 5, payroll: 1, statutory: 7, creditors: 2, owed: 4, payments: 6, hq: 8, mara: 9 }

function eachIso(from: string, to: string) {
  const days: string[] = []
  let cursor = parseISO(from)
  const end = parseISO(to)
  while (cursor.getTime() <= end.getTime()) {
    days.push(iso(cursor))
    cursor = addDays(cursor, 1)
  }
  return days
}

const BRANCH_SHARE: Record<'HQ' | 'Mara', Record<keyof Totals, number>> = {
  HQ: { vouchers: 0.7, pd: 0.2, debtors: 0.62, payroll: 0.68, statutory: 0.75, creditors: 0.58, owed: 0.58, payments: 0.6, hq: 0.82, mara: 0.18 },
  Mara: { vouchers: 0.3, pd: 0.8, debtors: 0.38, payroll: 0.32, statutory: 0.25, creditors: 0.42, owed: 0.42, payments: 0.4, hq: 0.18, mara: 0.82 },
}

function sumDays(currency: CurrencyCode, from: string, to: string, branch: GlobalFilters['branch']): Totals {
  const base = HOME_DAY[currency]
  const totals = { ...ZERO }
  for (const day of eachIso(from, to)) {
    if (!homeDayFactor(day)) continue
    ;(Object.keys(totals) as (keyof Totals)[]).forEach((key) => {
      const share = branch === 'All' ? 1 : BRANCH_SHARE[branch][key]
      totals[key] = round2(totals[key] + base[key] * homeDayFactor(day, SALT[key]) * share)
    })
  }
  return totals
}

function revenueOf(totals: Totals) {
  return round2(totals.vouchers + totals.pd + totals.debtors)
}

function expensesOf(totals: Totals) {
  return round2(totals.payroll + totals.statutory + totals.creditors + totals.hq + totals.mara)
}

function cashOf(totals: Totals) {
  return round2(totals.vouchers + totals.pd)
}

function pct(current: number, previous: number) {
  if (Math.abs(previous) < 0.5) return current > 0.5 ? 100 : 0
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

function kpi(current: number, previous: number): HomeKpi {
  return { amount: current, pct: pct(current, previous) }
}

function shares(rows: { id: string; name: string; amount: number; href: string }[]): HomeSlice[] {
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  let used = 0
  return rows.map((row, index) => {
    const share = total ? (index === rows.length - 1 ? 100 - used : Math.round((row.amount / total) * 100)) : 0
    used += share
    return { ...row, amount: round2(row.amount), share }
  })
}

const AGING = [
  ['Not due', 'Current', 0.42],
  ['1-30', '1-30', 0.24],
  ['31-60', '31-60', 0.16],
  ['61-90', '61-90', 0.11],
  ['>90', '90+', 0.07],
] as const

function agingOf(amount: number): HomeSlice[] {
  let used = 0
  return AGING.map(([id, name, weight], index) => {
    const value = index === AGING.length - 1 ? round2(amount - used) : round2(amount * weight)
    used = round2(used + value)
    return { id, name, amount: value, href: '/debtors', share: 0 }
  })
}

function monthsEnding(to: string) {
  const end = parseISO(to)
  return Array.from({ length: 6 }, (_, index) => {
    const month = startOfMonth(subMonths(end, 5 - index))
    return { id: format(month, 'yyyy-MM'), name: format(month, 'MMM'), from: iso(month), to: iso(new Date(month.getFullYear(), month.getMonth() + 1, 0)) }
  })
}

export function getHomeDashboard(currency: CurrencyCode, filters: GlobalFilters): HomeDashboard {
  const current = sumDays(currency, filters.from, filters.to, filters.branch)
  const previousWindow = previousFilters(filters)
  const previous = sumDays(currency, previousWindow.from, previousWindow.to, filters.branch)
  const revenue = revenueOf(current)
  const expenses = expensesOf(current)
  const receipts = cashOf(current)
  const priorRevenue = revenueOf(previous)
  const priorExpenses = expensesOf(previous)
  const priorReceipts = cashOf(previous)
  const empty = filters.preset === 'custom' && revenue === 0 && expenses === 0 && current.owed === 0 && current.hq === 0 && current.mara === 0
  const trend = monthsEnding(filters.to).map((month) => {
    const totals = sumDays(currency, month.from, month.to, filters.branch)
    const monthRevenue = revenueOf(totals)
    const monthCost = expensesOf(totals)
    return { id: month.id, name: month.name, revenue: monthRevenue, cost: monthCost, net: round2(monthRevenue - monthCost) }
  })
  const cash = monthsEnding(filters.to).map((month) => {
    const totals = sumDays(currency, month.from, month.to, filters.branch)
    return { id: month.id, name: month.name, received: cashOf(totals), paid: totals.payments }
  })
  return {
    empty,
    revenue: kpi(revenue, priorRevenue),
    receipts: kpi(receipts, priorReceipts),
    debtors: kpi(current.debtors, previous.debtors),
    invoices: kpi(current.debtors, previous.debtors),
    expenses: kpi(expenses, priorExpenses),
    creditors: kpi(current.owed, previous.owed),
    payments: kpi(current.payments, previous.payments),
    pnl: kpi(round2(revenue - expenses), round2(priorRevenue - priorExpenses)),
    payroll: kpi(current.payroll, previous.payroll),
    statutory: kpi(current.statutory, previous.statutory),
    hq: kpi(current.hq, previous.hq),
    mara: kpi(current.mara, previous.mara),
    trend,
    mix: shares([
      { id: 'advance-voucher', name: 'Advance Vouchers', amount: current.vouchers, href: '/revenue/vouchers' },
      { id: 'pd-mara', name: 'PD (Mara)', amount: current.pd, href: '/revenue/pd' },
      { id: 'paid-later', name: 'Debtors', amount: current.debtors, href: '/debtors' },
    ]),
    costs: shares([
      { id: 'payroll', name: 'Payroll', amount: current.payroll, href: '/payroll' },
      { id: 'statutory', name: 'Statutory', amount: current.statutory, href: '/statutory' },
      { id: 'operating', name: 'Creditors', amount: current.creditors, href: '/creditors' },
      { id: 'hq-petty', name: 'HQ Petty Cash', amount: current.hq, href: '/hq-petty-cash' },
      { id: 'mara-petty', name: 'Mara Petty Cash', amount: current.mara, href: '/mara-petty-cash' },
    ]),
    aging: agingOf(current.debtors),
    cash,
  }
}
