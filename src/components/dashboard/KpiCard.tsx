import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { InfoTip } from '@/components/ui'
import { formatCompact, formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { CurrencyCode } from '@/types'

const TINTS = {
  orange: 'bg-[#FDE8DC] text-[#E8832A]',
  green: 'bg-[#E7F2EC] text-[#1E6B50]',
  gold: 'bg-[#F8F1D8] text-[#A68516]',
  blue: 'bg-[#E7F0FA] text-[#2F6DB5]',
} as const

export type KpiTint = keyof typeof TINTS

export function KpiCard({
  label,
  caption,
  amount,
  count,
  value,
  pct,
  currency,
  href,
  onClick,
  icon: Icon,
  tint,
  selected,
}: {
  label: string
  caption?: string
  amount?: number
  count?: number
  value?: string
  pct?: number
  currency?: CurrencyCode
  href?: string
  onClick?: () => void
  icon: LucideIcon
  tint: KpiTint
  selected?: boolean
}) {
  const navigate = useNavigate()
  const hasPct = typeof pct === 'number'
  const change = hasPct ? (pct === 0 ? '0%' : `${pct > 0 ? '+' : ''}${pct}%`) : ''
  const tip = value
    ?? (count !== undefined
      ? `${count}`
      : currency !== undefined && amount !== undefined
        ? `${formatMoney(amount, currency)}${hasPct ? ` · ${change}` : ''}`
        : label)
  return (
    <InfoTip label={tip}>
      <button
        type="button"
        onClick={() => {
          if (onClick) onClick()
          else if (href) navigate(href)
        }}
        aria-pressed={selected}
        className={cn(
          'flex h-full w-full cursor-pointer flex-col rounded-card border bg-white px-4 py-3.5 text-left shadow-card transition duration-150',
          selected ? 'border-forest-600' : 'border-line hover:border-forest-600',
        )}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="min-h-9 min-w-0 text-[13px] font-medium leading-snug text-[#3E5248]">{label}</span>
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', TINTS[tint])}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </span>
        {value !== undefined ? (
          <span className="mt-3 money font-display text-[22px] leading-none tracking-tight text-forest-900 tabular">{value}</span>
        ) : count !== undefined ? (
          <span className="mt-3 money font-display text-[22px] leading-none tracking-tight text-forest-900 tabular">{count}</span>
        ) : (
          <span className="mt-3 flex items-baseline gap-1 leading-none text-forest-900">
            <span className="text-[13px] font-medium">{currency}</span>
            <span className="money font-display text-[22px] tracking-tight">{formatCompact(amount ?? 0)}</span>
          </span>
        )}
        {(caption || hasPct) && (
          <span className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate text-[12px] leading-none text-muted">{caption ?? ''}</span>
            {hasPct && (
              <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none tabular-nums', pct! > 0 ? 'bg-forest-100 text-forest-600' : pct! < 0 ? 'bg-[#FDE8DC] text-[#C0562A]' : 'bg-cream text-muted')}>{change}</span>
            )}
          </span>
        )}
      </button>
    </InfoTip>
  )
}
