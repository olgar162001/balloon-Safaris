import { format, parseISO } from 'date-fns'
import type { CurrencyCode, MoneyCurrency, VerifyStatus, ViewColumn, LedgerRow } from '@/types'

export const CURRENCIES: CurrencyCode[] = ['KES', 'USD', 'GBP']

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function formatMoney(amount: number, currency: MoneyCurrency): string {
  if (currency === 'MISSING') return 'Currency missing'
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${amount < 0 ? '-' : ''}${currency} ${abs}`
}

export function formatCompact(amount: number) {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  const trim = (value: number) => {
    if (value >= 100) return value.toFixed(0)
    const text = value.toFixed(1)
    return text.endsWith('.0') ? text.slice(0, -2) : text
  }
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}M`
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}K`
  return `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatDisplayDate(iso: string) {
  if (!iso) return '-'
  const day = iso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso
  return format(parseISO(day), 'd MMM yyyy')
}

export function formatMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month
  return format(parseISO(`${month}-01`), 'MMM yyyy')
}

export function verifyLabel(status: VerifyStatus) {
  if (status === 'source-reported') return 'Source-reported'
  if (status === 'estimated') return 'Estimated'
  if (status === 'unreconciled') return 'Unreconciled'
  return 'Verified'
}

export function displayCell(row: LedgerRow, column: ViewColumn): string {
  if (column.kind === 'verify') return verifyLabel(row.verify)
  if (column.kind === 'pipeline') return String(row.values.pipelineLabel ?? row.pipeline)
  const raw = row.values[column.key]
  if (raw === undefined || raw === '') return '-'
  if (column.kind === 'money') {
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isNaN(n)) return String(raw)
    return formatMoney(n, row.currency)
  }
  if (column.kind === 'date') return formatDisplayDate(String(raw))
  return String(raw)
}
