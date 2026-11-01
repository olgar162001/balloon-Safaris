import type { CurrencyCode } from '@/types'

/** One day's activity. Week and month totals are this day repeated on the active dates. */
export const HOME_DAY: Record<CurrencyCode, {
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
}> = {
  KES: { vouchers: 48_000, pd: 18_000, debtors: 22_000, payroll: 28_800, statutory: 8_400, creditors: 14_000, owed: 9_500, payments: 4_500, hq: 6_200, mara: 4_800 },
  USD: { vouchers: 420, pd: 160, debtors: 190, payroll: 310, statutory: 70, creditors: 120, owed: 80, payments: 40, hq: 55, mara: 40 },
  GBP: { vouchers: 310, pd: 120, debtors: 140, payroll: 240, statutory: 55, creditors: 90, owed: 60, payments: 32, hq: 40, mara: 28 },
}

/** Active dates are the 7th through the end of May–October 2026. Today, the week, and the month then scale about 1×, 6×, and 25×. */
export function homeDayFactor(iso: string, salt = 0) {
  if (iso < '2026-05-07' || iso > '2026-10-31') return 0
  const day = Number(iso.slice(8, 10))
  if (day < 7) return 0
  const month = Number(iso.slice(5, 7))
  const wave = [1, 1.04, 0.97, 1.08, 0.96, 1.08]
  return (0.9 + ((day * 3 + month + salt) % 11) / 50) * (wave[month - 5] ?? 1)
}
