import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { addDays, addMonths, addYears, differenceInCalendarDays, endOfMonth, endOfQuarter, endOfYear, format, isSameDay, isWithinInterval, parseISO, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from 'date-fns'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { Pop } from '@/components/ui'
import { useFinance } from '@/finance'
import { cn } from '@/lib/cn'
import { defaultFilters, iso } from '@/lib/dates'
import type { CurrencyCode, GlobalFilters, Preset } from '@/types'

const PERIODS: { id: Preset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'Week' },
  { id: 'this-month', label: 'Month' },
  { id: 'this-quarter', label: 'Quarter' },
  { id: 'this-year', label: 'Year' },
  { id: 'custom', label: 'Custom' },
]

const LOCATIONS: { id: GlobalFilters['branch']; label: string }[] = [
  { id: 'All', label: 'All locations' },
  { id: 'HQ', label: 'HQ' },
  { id: 'Mara', label: 'Mara' },
]

export function rangeCaption(filters: GlobalFilters) {
  const start = parseISO(filters.from)
  const end = parseISO(filters.to)
  if (filters.preset === 'this-month') return format(start, 'MMMM yyyy')
  if (filters.preset === 'this-quarter') return `Q${format(start, 'Q')} ${format(start, 'yyyy')}`
  if (filters.preset === 'this-year') return format(start, 'yyyy')
  if (filters.from === filters.to) return format(start, 'd MMM yyyy')
  if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) return `${format(start, 'd')} - ${format(end, 'd MMM yyyy')}`
  if (start.getFullYear() === end.getFullYear()) return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`
  return `${format(start, 'd MMM yyyy')} - ${format(end, 'd MMM yyyy')}`
}

function chipLabel(from: string, to: string) {
  const start = parseISO(from)
  const end = parseISO(to)
  if (from === to) return format(start, 'MMM d, yyyy')
  if (start.getFullYear() === end.getFullYear()) return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`
}

function step(filters: GlobalFilters, direction: -1 | 1) {
  const start = parseISO(filters.from)
  if (filters.preset === 'this-month') {
    const next = addMonths(start, direction)
    return { from: iso(startOfMonth(next)), to: iso(endOfMonth(next)) }
  }
  if (filters.preset === 'this-quarter') {
    const next = addMonths(start, direction * 3)
    return { from: iso(startOfQuarter(next)), to: iso(endOfQuarter(next)) }
  }
  if (filters.preset === 'this-year') {
    const next = addYears(start, direction)
    return { from: iso(startOfYear(next)), to: iso(endOfYear(next)) }
  }
  const days = differenceInCalendarDays(parseISO(filters.to), start) + 1
  return { from: iso(addDays(start, direction * days)), to: iso(addDays(parseISO(filters.to), direction * days)) }
}

export function FilterBar({ embedded = false }: { embedded?: boolean }) {
  const { filters, setFilters } = useFinance()
  const currency: CurrencyCode = filters.currency === 'ALL' ? 'KES' : filters.currency
  const [stuck, setStuck] = useState(false)
  const [calendar, setCalendar] = useState(false)
  const defaults = defaultFilters()
  const dirty = filters.preset !== 'today' || filters.branch !== 'All' || currency !== 'KES' || filters.from !== defaults.from || filters.to !== defaults.to
  const location = LOCATIONS.find((item) => item.id === filters.branch)?.label ?? 'All locations'

  useEffect(() => {
    if (filters.currency === 'ALL') setFilters({ currency: 'KES' })
  }, [filters.currency, setFilters])

  useEffect(() => {
    const scroller = document.getElementById('scroller')
    const onScroll = () => setStuck((scroller?.scrollTop ?? 0) > 24)
    onScroll()
    scroller?.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller?.removeEventListener('scroll', onScroll)
  }, [])

  const bar = (
      <div className="flex h-[44px] items-center gap-2 rounded-lg border border-line bg-white px-1.5 py-[5px]">
        <div className="toolbar-scroll flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <Segmented
            value={filters.preset}
            options={PERIODS}
            onChange={(preset) => {
              if (preset === 'custom') {
                setCalendar(true)
                return
              }
              setFilters({ preset })
            }}
          />
          <button type="button" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-forest-900 hover:bg-cream" aria-label="Previous period" onClick={() => setFilters({ ...step(filters, -1), preset: 'custom' })}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Pop.Root open={calendar} onOpenChange={setCalendar}>
            <Pop.Trigger asChild>
              <button type="button" className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-forest-900 hover:bg-cream">
                <Calendar className="h-4 w-4 text-muted" />
                <span className="whitespace-nowrap">{chipLabel(filters.from, filters.to)}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted" />
              </button>
            </Pop.Trigger>
            <Pop.Portal>
              <Pop.Content className="z-50 max-w-[calc(100vw-24px)] overflow-x-auto rounded-card border border-[rgba(11,61,46,0.06)] bg-white p-3 shadow-card" sideOffset={8} align="start">
                <RangeCalendar from={filters.from} to={filters.to} onApply={(from, to) => { setFilters({ from, to, preset: 'custom' }); setCalendar(false) }} />
              </Pop.Content>
            </Pop.Portal>
          </Pop.Root>
          <button type="button" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-forest-900 hover:bg-cream" aria-label="Next period" onClick={() => setFilters({ ...step(filters, 1), preset: 'custom' })}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="h-5 w-px shrink-0 bg-[rgba(11,61,46,0.12)]" />
          <LocationMenu label={location} value={filters.branch} onChange={(branch) => setFilters({ branch })} />
        </div>
        <Segmented
          value={currency}
          options={(['KES', 'USD', 'GBP'] as CurrencyCode[]).map((id) => ({ id, label: id }))}
          onChange={(code) => setFilters({ currency: code })}
          compact
        />
        {dirty && (
          <button type="button" className="shrink-0 px-1 text-[12px] text-muted hover:text-forest-900" onClick={() => setFilters({ preset: 'today', branch: 'All', currency: 'KES', party: '', status: 'all' })}>
            Reset
          </button>
        )}
      </div>
  )

  if (embedded) {
    return (
      <div className={cn('py-3', stuck && 'shadow-[0_8px_16px_rgba(11,61,46,0.06)]')}>
        {bar}
      </div>
    )
  }

  return (
    <div className={cn('sticky top-[52px] z-20 -mx-6 mt-6 px-6', stuck && 'bg-ivory shadow-[0_8px_16px_rgba(11,61,46,0.06)]')}>
      {bar}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  compact,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (id: T) => void
  compact?: boolean
}) {
  const track = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ left: 4, width: 0 })
  useLayoutEffect(() => {
    const root = track.current
    const active = root?.querySelector<HTMLElement>('[data-active="true"]')
    if (!root || !active) return
    setBox({ left: active.offsetLeft, width: active.offsetWidth })
  }, [value, options.length])
  return (
    <div ref={track} className={cn('relative inline-flex h-[34px] shrink-0 items-center rounded-full bg-cream p-0.5', compact && 'ml-auto')} role="group">
      <span className="absolute top-0.5 h-[30px] rounded-full bg-forest-900 shadow-[0_1px_2px_rgba(11,61,46,0.25)] transition-all duration-150" style={{ left: box.left, width: box.width }} />
      {options.map((option) => {
        const active = option.id === value
        return (
          <button key={option.id} type="button" data-active={active} className={cn('relative z-10 h-[30px] rounded-full px-3 text-[12.5px] font-medium transition-colors duration-150', compact && 'px-2.5 text-[12px]', active ? 'text-white' : 'text-muted hover:bg-white/60 hover:text-forest-900')} onClick={() => onChange(option.id)}>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function LocationMenu({ label, value, onChange }: { label: string; value: GlobalFilters['branch']; onChange: (branch: GlobalFilters['branch']) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Pop.Root open={open} onOpenChange={setOpen}>
      <Pop.Trigger asChild>
        <button type="button" className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-forest-900 hover:bg-cream">
          <MapPin className="h-4 w-4 text-muted" />
          <span className="whitespace-nowrap">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </button>
      </Pop.Trigger>
      <Pop.Portal>
        <Pop.Content className="z-50 w-40 rounded-card border border-[rgba(11,61,46,0.06)] bg-white p-1 shadow-card" sideOffset={8}>
          {LOCATIONS.map((item) => (
            <button key={item.id} type="button" className={cn('flex h-8 w-full items-center rounded-lg px-2 text-left text-[12.5px]', item.id === value ? 'bg-forest-900 text-white' : 'text-forest-900 hover:bg-cream')} onClick={() => { onChange(item.id); setOpen(false) }}>
              {item.label}
            </button>
          ))}
        </Pop.Content>
      </Pop.Portal>
    </Pop.Root>
  )
}

function RangeCalendar({ from, to, onApply }: { from: string; to: string; onApply: (from: string, to: string) => void }) {
  const [cursor, setCursor] = useState(startOfMonth(parseISO(from)))
  const [anchor, setAnchor] = useState<string | null>(null)
  const months = [cursor, addMonths(cursor, 1)]
  const pick = (day: string) => {
    if (!anchor) {
      setAnchor(day)
      return
    }
    const start = anchor < day ? anchor : day
    const end = anchor < day ? day : anchor
    setAnchor(null)
    onApply(start, end)
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="rounded-lg p-1 hover:bg-cream" aria-label="Previous months" onClick={() => setCursor(addMonths(cursor, -1))}><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" className="rounded-lg p-1 hover:bg-cream" aria-label="Next months" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="flex gap-4">
        {months.map((month) => <MonthGrid key={month.toISOString()} month={month} from={anchor ?? from} to={anchor ? anchor : to} onPick={pick} />)}
      </div>
    </div>
  )
}

function MonthGrid({ month, from, to, onPick }: { month: Date; from: string; to: string; onPick: (day: string) => void }) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const days = Array.from({ length: 42 }, (_, index) => addDays(start, index))
  const rangeStart = parseISO(from)
  const rangeEnd = parseISO(to < from ? from : to)
  return (
    <div className="w-[224px]">
      <p className="mb-2 text-center text-[12.5px] font-medium text-forest-900">{format(month, 'MMMM yyyy')}</p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-muted">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7">
        {days.map((day) => {
          const key = iso(day)
          const inMonth = day.getMonth() === month.getMonth()
          const selected = isSameDay(day, rangeStart) || isSameDay(day, rangeEnd)
          const inside = inMonth && isWithinInterval(day, { start: rangeStart, end: rangeEnd })
          return (
            <button key={key} type="button" className={cn('h-8 text-[12px]', !inMonth && 'text-transparent', inMonth && inside && 'bg-[#E7F2EC] text-forest-900', inMonth && selected && 'rounded-full bg-forest-900 text-white')} onClick={() => inMonth && onPick(key)}>
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
