import { useState } from 'react'
import { Pop } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Preset } from '@/types'

const TABS = [
  ['today', 'Today'],
  ['this-week', 'Week'],
  ['this-month', 'Month'],
  ['custom', 'Custom'],
] as const

export function PeriodTabs({
  preset,
  from,
  to,
  onPreset,
  onCustom,
  compact,
}: {
  preset: Preset
  from: string
  to: string
  onPreset: (preset: 'today' | 'this-week' | 'this-month') => void
  onCustom: (from: string, to: string) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)
  return (
    <div className={cn('inline-flex h-[30px] items-center rounded-full bg-white p-0.5 shadow-card', compact && 'h-7 shadow-none')}>
      {TABS.map(([id, label]) => {
        const active = id === 'custom' ? preset === 'custom' : preset === id
        if (id !== 'custom') {
          return (
            <button key={id} type="button" className={tabClass(active, compact)} onClick={() => onPreset(id)}>
              {label}
            </button>
          )
        }
        return (
          <Pop.Root key={id} open={open} onOpenChange={(next) => { setOpen(next); if (next) { setDraftFrom(from); setDraftTo(to) } }}>
            <Pop.Trigger asChild>
              <button type="button" className={tabClass(active, compact)}>{label}</button>
            </Pop.Trigger>
            <Pop.Portal>
              <Pop.Content className="z-50 w-64 rounded-card bg-white p-4 shadow-card" sideOffset={8}>
                <div className="grid gap-2">
                  <input type="date" className="h-10 rounded-control border border-line px-3 text-sm" aria-label="From" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} />
                  <input type="date" className="h-10 rounded-control border border-line px-3 text-sm" aria-label="To" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} />
                  <button type="button" className="h-10 rounded-control bg-balloon text-sm font-semibold text-white" onClick={() => { onCustom(draftFrom, draftTo); setOpen(false) }}>Apply</button>
                </div>
              </Pop.Content>
            </Pop.Portal>
          </Pop.Root>
        )
      })}
    </div>
  )
}

function tabClass(active: boolean, compact?: boolean) {
  return cn(
    'h-full rounded-full px-2.5 font-medium leading-none transition duration-150',
    compact ? 'text-[11px]' : 'text-[12.5px]',
    active ? 'bg-forest-900 text-white' : 'text-forest-900 hover:bg-cream',
  )
}
