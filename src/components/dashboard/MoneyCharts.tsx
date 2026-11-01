import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { formatCompact, formatMoney } from '@/lib/format'
import type { CurrencyCode } from '@/types'

const COLORS = ['#0F4A38', '#E8832A', '#C9A227', '#1E6B50', '#8A8175']

function pointId(state: unknown) {
  const item = state as { id?: string; payload?: { id?: string } }
  return String(item?.id ?? item?.payload?.id ?? '')
}

function pointHref(state: unknown) {
  const item = state as { href?: string; payload?: { href?: string } }
  return String(item?.href ?? item?.payload?.href ?? '/revenue')
}

type Slice = { id: string; name: string; amount: number; href: string; share?: number }

const EMPTY = <p className="py-10 text-center text-[12px] text-muted">Nothing in this period.</p>

function axis(max: number) {
  const safe = Math.max(max, 1)
  const pow = 10 ** Math.floor(Math.log10(safe))
  const candidates = [pow / 2, pow, pow * 2, pow * 5, pow * 10]
  const step = candidates.find((item) => safe / item <= 4) ?? pow * 2
  const top = Math.ceil(safe / step) * step
  const ticks: number[] = []
  for (let value = 0; value <= top + step * 0.01; value += step) ticks.push(Math.round(value))
  return { top, ticks }
}

function HoverTip({
  active,
  payload,
  currency,
  totals,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; dataKey?: string; payload?: { name?: string } }[]
  currency: CurrencyCode
  totals: Record<string, number>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-card">
      {payload.map((item) => {
        const value = Number(item.value ?? 0)
        const key = String(item.dataKey ?? 'amount')
        const total = totals[key] ?? 0
        const share = total ? (value / total) * 100 : 0
        return (
          <p key={key} className="mt-1 first:mt-0">
            <span className="font-medium text-forest-900">{item.name || item.payload?.name}</span>
            <span className="money mt-0.5 block">{formatMoney(value, currency)} · {share.toFixed(0)}%</span>
          </p>
        )
      })}
    </div>
  )
}

export function TrendChart({
  points,
  currency,
  empty,
  onOpen,
}: {
  points: { id: string; name: string; revenue: number; cost: number; net: number }[]
  currency: CurrencyCode
  empty?: boolean
  onOpen: (id: string, series: string) => void
}) {
  if (empty) return EMPTY
  const totals = {
    revenue: points.reduce((sum, point) => sum + point.revenue, 0),
    cost: points.reduce((sum, point) => sum + point.cost, 0),
    net: points.reduce((sum, point) => sum + Math.abs(point.net), 0),
  }
  const legend = [
    ['revenue', 'Revenue', '#0F4A38', totals.revenue],
    ['cost', 'Cost', '#E8832A', totals.cost],
    ['net', 'Net', '#C9A227', points.reduce((sum, point) => sum + point.net, 0)],
  ] as const
  const scale = axis(Math.max(...points.flatMap((point) => [point.revenue, point.cost, point.net, 0])))
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 text-[12px]">
        {legend.map(([key, label, color, value]) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
            <span className="money font-semibold text-forest-900">{formatCompact(value)}</span>
          </span>
        ))}
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} barGap={3} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E4DDD0" strokeDasharray="3 3" strokeWidth={0.8} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7A72' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, scale.top]} ticks={scale.ticks} tickFormatter={(value) => formatCompact(Number(value))} tick={{ fontSize: 11, fill: '#6B7A72' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<HoverTip currency={currency} totals={totals} />} />
            <Bar dataKey="revenue" name="Revenue" fill="#0F4A38" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(state) => onOpen(pointId(state), 'revenue')} />
            <Bar dataKey="cost" name="Cost" fill="#E8832A" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(state) => onOpen(pointId(state), 'cost')} />
            <Line type="monotone" dataKey="net" name="Net" stroke="#C9A227" strokeWidth={2} dot={{ r: 3, fill: '#C9A227', strokeWidth: 0 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function MixDonut({ slices, currency, totalLabel, empty }: { slices: Slice[]; currency: CurrencyCode; totalLabel: string; empty?: boolean }) {
  const navigate = useNavigate()
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  if (empty || !total) return EMPTY
  return (
    <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-[160px] w-[160px] shrink-0">
        <PieChart width={160} height={160}>
          <Pie data={slices} dataKey="amount" nameKey="name" cx={80} cy={80} innerRadius={54} outerRadius={72} paddingAngle={2} stroke="none" cursor="pointer" onClick={(slice) => navigate(pointHref(slice))}>
            {slices.map((slice, index) => <Cell key={slice.id} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<HoverTip currency={currency} totals={{ amount: total }} />} />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] leading-none text-muted">{currency}</span>
          <span className="mt-1 font-display text-[20px] leading-none text-forest-900">{formatCompact(total)}</span>
          <span className="mt-1 text-[11px] leading-none text-muted">{totalLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 w-full flex-1 space-y-[10px]">
        {slices.map((slice, index) => (
          <li key={slice.id}>
            <button type="button" className="flex w-full items-center gap-2 text-left text-[12.5px]" onClick={() => navigate(slice.href)}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
              <span className="truncate text-forest-900">{slice.name}</span>
              <span className="money ml-auto font-semibold text-forest-900">{formatCompact(slice.amount)}</span>
              <span className="w-8 text-right text-muted">{slice.share ?? 0}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AgingChart({ bars, currency, empty, onOpen }: { bars: Slice[]; currency: CurrencyCode; empty?: boolean; onOpen: (id: string) => void }) {
  const total = bars.reduce((sum, bar) => sum + bar.amount, 0)
  if (empty || !total) return EMPTY
  return (
    <div className="h-[210px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} layout="vertical" margin={{ top: 0, left: 0, right: 4, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={48} tick={{ fontSize: 11, fill: '#6B7A72' }} axisLine={false} tickLine={false} />
          <Tooltip content={<HoverTip currency={currency} totals={{ amount: total }} />} />
          <Bar dataKey="amount" name="Balance" fill="#0F4A38" radius={[0, 4, 4, 0]} barSize={10} cursor="pointer" onClick={(state) => onOpen(pointId(state))}>
            {bars.map((bar, index) => <Cell key={bar.id} fill={COLORS[index % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CashChart({
  points,
  currency,
  empty,
  onOpen,
}: {
  points: { id: string; name: string; received: number; paid: number }[]
  currency: CurrencyCode
  empty?: boolean
  onOpen: (id: string, series: string) => void
}) {
  if (empty || !points.some((point) => point.received || point.paid)) return EMPTY
  const totals = {
    received: points.reduce((sum, point) => sum + point.received, 0),
    paid: points.reduce((sum, point) => sum + point.paid, 0),
  }
  return (
    <div className="h-[210px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} barGap={3} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E4DDD0" strokeDasharray="3 3" strokeWidth={0.8} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7A72' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(value) => formatCompact(Number(value))} tick={{ fontSize: 11, fill: '#6B7A72' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<HoverTip currency={currency} totals={totals} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#6B7A72' }} />
          <Bar dataKey="received" name="Received" fill="#0F4A38" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(state) => onOpen(pointId(state), 'received')} />
          <Bar dataKey="paid" name="Paid" fill="#E8832A" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(state) => onOpen(pointId(state), 'paid')} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
