import { type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PIPELINE } from '@/access'
import { formatMoney, verifyLabel } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { KpiModel, PipelineStage, VerifyStatus } from '@/types'
import { Button } from '@/components/ui'

const BADGE: Record<VerifyStatus, string> = {
  verified: 'bg-[#E5F6EE] text-verified',
  'source-reported': 'bg-[#E7F0FA] text-reported',
  estimated: 'bg-[#FBF3E2] text-estimated',
  unreconciled: 'bg-[#FBEAEA] text-unreconciled',
}

export function VerifyBadge({ status }: { status: VerifyStatus }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium', BADGE[status])}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />{verifyLabel(status)}</span>
}

export function MoneyText({ amount, currency, className }: { amount: number; currency: KpiModel['totals'][number]['currency'] | 'MISSING'; className?: string }) {
  return <span className={cn('money', className)}>{formatMoney(amount, currency)}</span>
}

export function Pipeline({ stage }: { stage: PipelineStage }) {
  const index = PIPELINE.findIndex((item) => item.id === stage)
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Workflow">
      {PIPELINE.map((item, itemIndex) => (
        <li key={item.id} className={cn('min-w-[88px] rounded-control px-2 py-1 text-center text-[10px] uppercase tracking-wide', itemIndex < index && 'bg-forest-100 text-forest-800', itemIndex === index && 'bg-forest-900 text-white', itemIndex > index && 'bg-cream text-muted')}>
          {item.label}
        </li>
      ))}
    </ol>
  )
}

export function PageHeader({ eyebrow, title, extra }: { eyebrow?: string; title: string; description?: string; extra?: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{eyebrow}</p>}
        <h1 className={cn('font-display text-[24px] font-semibold leading-none tracking-tight text-forest-900', eyebrow && 'mt-1')}>{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        <Button onClick={() => navigate(-1)}>Back</Button>
      </div>
    </div>
  )
}

export function WarningList({ items }: { items: string[] }) {
  void items
  return null
}

export function ExportButtons({ onExport }: { onExport: (kind: 'xlsx' | 'pdf' | 'csv') => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => onExport('xlsx')}>Excel</Button>
      <Button onClick={() => onExport('pdf')}>PDF</Button>
      <Button onClick={() => onExport('csv')}>CSV</Button>
    </div>
  )
}

export function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
}
