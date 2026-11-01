import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useFinance } from '@/finance'
import { formatMoney } from '@/lib/format'
import { emptyDrill, toSearch } from '@/lib/dates'
import { seriesColor } from '@/services/charts'
import type { ChartSpec, CurrencyCode } from '@/types'
import { Button } from '@/components/ui'

export function ChartCard({ spec }: { spec: ChartSpec }) {
  const { filters } = useFinance()
  const navigate = useNavigate()
  const currencies = (Object.keys(spec.byCurrency) as CurrencyCode[])
  const locked = filters.currency !== 'ALL' ? filters.currency : null
  const [picked, setPicked] = useState<CurrencyCode>(locked ?? (currencies.includes('KES') ? 'KES' : currencies[0] ?? 'KES'))
  const currency = locked ?? picked
  const data = spec.byCurrency[currency]
  const open = (pointId: string, seriesKey?: string) => {
    const drill = { ...emptyDrill() }
    if (spec.drillParam === 'month') drill.month = pointId
    else if (spec.drillParam === 'bucket') drill.bucket = pointId
    else drill.drill = pointId
    if (spec.seriesDrill === 'bucket' && seriesKey && seriesKey !== 'amount') drill.bucket = seriesKey
    if (seriesKey === 'cash-in' || seriesKey === 'cash-out') drill.drill = seriesKey
    const next = { ...filters, currency }
    navigate(`${spec.href}?${toSearch(next, drill)}`)
  }
  const points = data?.points ?? []
  const chartData = useMemo(() => points.map((point) => ({ ...point, ...point.values })), [points])
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-card" aria-label={spec.aria}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-forest-900">{spec.title}</h3>
        </div>
        <div className="flex gap-1" role="tablist" aria-label={`${spec.title} currency`}>
          {(locked ? [locked] : currencies).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={item === currency} className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${item === currency ? 'bg-forest-900 text-white' : 'bg-cream text-forest-900'}`} onClick={() => setPicked(item)}>{item}</button>
          ))}
        </div>
      </div>
      {!data || points.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-muted">No data</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {spec.kind === 'doughnut' ? (
              <PieChart>
                <Pie data={chartData} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} onClick={(slice) => open(String((slice as { id?: string }).id ?? ''))}>
                  {chartData.map((point, index) => <Cell key={point.id} fill={seriesColor(point.id, index)} />)}
                </Pie>
                <Tooltip content={<MoneyTip currency={currency} points={points} />} />
                <Legend />
              </PieChart>
            ) : spec.kind === 'line' ? (
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="#E6E0D2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<MoneyTip currency={currency} points={points} />} />
                <Line type="monotone" dataKey="amount" stroke="#0F4A38" strokeWidth={2} dot={{ r: 3 }} onClick={(state) => open(String((state as { id?: string }).id ?? ''))} />
              </ComposedChart>
            ) : spec.kind === 'bar-line' ? (
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="#E6E0D2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<MoneyTip currency={currency} points={points} />} />
                <Legend />
                {data.series.map((series) => (
                  series.key === 'collected'
                    ? <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color} strokeWidth={2} />
                    : <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} radius={[4, 4, 0, 0]} onClick={(state) => open(String((state as { id?: string }).id ?? ''), series.key)} />
                ))}
              </ComposedChart>
            ) : (
              <BarChart data={chartData} layout={spec.kind === 'horizontal-bar' ? 'vertical' : 'horizontal'} margin={{ left: spec.kind === 'horizontal-bar' ? 24 : 0 }}>
                <CartesianGrid stroke="#E6E0D2" vertical={false} />
                {spec.kind === 'horizontal-bar' ? <XAxis type="number" tick={{ fontSize: 11 }} /> : <XAxis dataKey="name" tick={{ fontSize: 11 }} />}
                {spec.kind === 'horizontal-bar' ? <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} /> : <YAxis tick={{ fontSize: 11 }} />}
                <Tooltip content={<MoneyTip currency={currency} points={points} />} />
                <Legend />
                {data.series.map((series) => (
                  <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} stackId={spec.kind === 'stacked-bar' || spec.kind === 'horizontal-bar' ? 'stack' : undefined} radius={[4, 4, 0, 0]} onClick={(state) => open(String((state as { id?: string }).id ?? ''), series.key)} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {points.map((point, index) => (
          <button key={point.id} type="button" className="rounded-md bg-ivory px-2.5 py-1 text-[12px] text-forest-900" onClick={() => open(point.id)}>
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: seriesColor(point.id, index) }} />
            {point.name}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Button onClick={() => navigate(`${spec.href}?${toSearch({ ...filters, currency }, emptyDrill())}`)}>View transactions</Button>
      </div>
    </section>
  )
}

function MoneyTip({ active, payload, currency, points }: { active?: boolean; payload?: { name?: string; value?: number; dataKey?: string; payload?: { name?: string } }[]; currency: CurrencyCode; points: { values: Record<string, number> }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-control border border-line bg-white px-3 py-2 text-xs shadow-card">
      <p className="font-semibold">{payload[0]?.payload?.name}</p>
      {payload.map((item) => {
        const value = Number(item.value ?? 0)
        const key = String(item.dataKey ?? '')
        const seriesTotal = points.reduce((sum, point) => sum + Number(point.values[key] ?? 0), 0)
        const share = seriesTotal ? (value / seriesTotal) * 100 : 0
        return <p key={key} className="money mt-1">{item.name}: {formatMoney(value, currency)} · {share.toFixed(1)}%</p>
      })}
    </div>
  )
}
