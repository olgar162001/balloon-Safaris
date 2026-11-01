import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ledger as baseLedger } from '@/mock/ledger'
import { emptyDrill, rangeFor, readQuery, toSearch } from '@/lib/dates'
import { buildModel, type FinanceModel } from '@/services/dashboardService'
import { mergeLedger } from '@/services/ledgerService'
import { useAppStore } from '@/store'
import type { Drill, GlobalFilters, Ledger } from '@/types'

interface FinanceValue {
  model: FinanceModel
  ledger: Ledger
  loading: boolean
  filters: GlobalFilters
  drill: Drill
  setFilters: (patch: Partial<GlobalFilters>) => void
  setDrill: (patch: Partial<Drill>) => void
  clearDrill: () => void
  href: (path: string, extra?: Partial<Drill>) => string
}

const FinanceContext = createContext<FinanceValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const settings = useAppStore((state) => state.settings)
  const patches = useAppStore((state) => state.patches)
  const addedInvoices = useAppStore((state) => state.addedInvoices)
  const addedPayments = useAppStore((state) => state.addedPayments)
  const allocationOverrides = useAppStore((state) => state.allocationOverrides)
  const audit = useAppStore((state) => state.audit)
  const parsed = useMemo(() => readQuery(params), [params])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.get('from') || !params.get('to')) {
      setParams(toSearch(parsed.filters, parsed.drill), { replace: true })
    }
  }, [params, parsed.drill, parsed.filters, setParams])

  useEffect(() => {
    setLoading(true)
    const timer = window.setTimeout(() => setLoading(false), 160)
    return () => window.clearTimeout(timer)
  }, [params, settings.recognition, settings.pdLabel, settings.closedPeriods, settings.lockedDays])

  const ledger = useMemo(
    () => mergeLedger(baseLedger, { patches, addedInvoices, addedPayments, allocationOverrides }),
    [patches, addedInvoices, addedPayments, allocationOverrides],
  )
  const model = useMemo(
    () => buildModel(ledger, { filters: parsed.filters, drill: parsed.drill, settings }, audit),
    [ledger, parsed, settings, audit],
  )

  const setFilters = (patch: Partial<GlobalFilters>) => {
    const next = { ...parsed.filters, ...patch }
    if (patch.preset && patch.preset !== 'custom') {
      const range = rangeFor(patch.preset)
      next.from = range.from
      next.to = range.to
    }
    if ((patch.from || patch.to) && !patch.preset) next.preset = 'custom'
    setParams(toSearch(next, emptyDrill()))
  }
  const setDrill = (patch: Partial<Drill>) => setParams(toSearch(parsed.filters, { ...parsed.drill, ...patch }))
  const clearDrill = () => setParams(toSearch(parsed.filters, emptyDrill()))
  const href = (path: string, extra?: Partial<Drill>) => `${path}?${toSearch(parsed.filters, { ...emptyDrill(), ...extra })}`

  const value = { model, ledger, loading, filters: parsed.filters, drill: parsed.drill, setFilters, setDrill, clearDrill, href }
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const value = useContext(FinanceContext)
  if (!value) throw new Error('useFinance must be used in FinanceProvider')
  return value
}
