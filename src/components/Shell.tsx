import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  ClipboardList,
  FileText,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Mail,
  Menu,
  Plane,
  Receipt,
  Scale,
  Search,
  Settings,
  Tent,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { FilterBar } from '@/components/dashboard/FilterBar'
import { Pop } from '@/components/ui'
import { useFinance } from '@/finance'
import { useAppStore } from '@/store'
import { getCurrentUser } from '@/services/userService'
import { cn } from '@/lib/cn'
import type { SearchHit } from '@/types'

type Item = { to: string; label: string; icon: LucideIcon }

const NAV: { label?: string; items: Item[] }[] = [
  { items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Revenue',
    items: [
      { to: '/revenue', label: 'All Revenue', icon: Wallet },
      { to: '/revenue/vouchers', label: 'Advance Vouchers', icon: FileText },
      { to: '/revenue/pd', label: 'PD (Mara)', icon: Tent },
      { to: '/debtors', label: 'Debtors', icon: Users },
      { to: '/receipts', label: 'Receipts', icon: HandCoins },
      { to: '/invoices', label: 'Invoices', icon: FileText },
    ],
  },
  {
    label: 'Expenses',
    items: [
      { to: '/expenses', label: 'All Expenses', icon: Receipt },
      { to: '/payroll', label: 'Payroll', icon: Users },
      { to: '/statutory', label: 'Statutory', icon: Landmark },
      { to: '/creditor-payments', label: 'Creditor Payments', icon: HandCoins },
      { to: '/hq-petty-cash', label: 'HQ Petty Cash', icon: Wallet },
      { to: '/mara-petty-cash', label: 'Mara Petty Cash', icon: Tent },
    ],
  },
  {
    label: 'Payables',
    items: [
      { to: '/creditors', label: 'Creditors List', icon: Landmark },
      { to: '/payables/suppliers', label: 'Supplier Accounts', icon: Users },
      { to: '/payables/outstanding', label: 'Outstanding Payables', icon: Scale },
      { to: '/payables/payments', label: 'Payment History', icon: HandCoins },
    ],
  },
  {
    label: 'Receivables',
    items: [
      { to: '/receivables', label: 'Outstanding Debtors', icon: Users },
      { to: '/receivables/statements', label: 'Customer Statements', icon: FileText },
      { to: '/receivables/aging', label: 'Aging', icon: ClipboardList },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/operations/landing-fees', label: 'Landing Fees', icon: Plane },
      { to: '/operations/allocations', label: 'Beneficiary Allocations', icon: Scale },
      { to: '/operations/reconciliation', label: 'Reconciliation', icon: ClipboardList },
    ],
  },
  {
    label: 'Control',
    items: [
      { to: '/reports', label: 'Reports', icon: FileText },
      { to: '/control/import', label: 'Import Center', icon: ClipboardList },
      { to: '/control/exceptions', label: 'Exceptions', icon: Bell },
      { to: '/control/audit', label: 'Audit Log', icon: ClipboardList },
    ],
  },
]

export function Shell({ children }: { children: ReactNode }) {
  const collapsed = useAppStore((state) => state.sidebarCollapsed)
  const setCollapsed = useAppStore((state) => state.setCollapsed)
  const { model, href } = useFinance()
  const [mobile, setMobile] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const mail = getCurrentUser().unreadMail
  const alerts = model.exceptions.length
  const counts: Record<string, number> = {
    '/control/exceptions': alerts,
    '/debtors': model.views.debtors.rows.length,
    '/receivables': model.views.debtors.rows.length,
    '/creditors': model.views.creditors.rows.filter((row) => row.amount > 0.5).length,
  }

  const openHit = (target: string) => {
    navigate(target.replace('/revenue/invoices', '/invoices').replace('/revenue/receipts', '/receipts'))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ivory text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <aside className={cn('no-print hidden shrink-0 flex-col bg-forest-900 text-[#E7F2EC] md:flex', collapsed ? 'w-[60px]' : 'w-64')}>
        <SidebarBody collapsed={collapsed} counts={counts} href={href} onNavigate={() => undefined} onToggle={() => setCollapsed(!collapsed)} />
      </aside>
      <Dialog.Root open={mobile} onOpenChange={setMobile}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-forest-900/40 backdrop-blur-sm md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-64 bg-forest-900 text-[#E7F2EC] outline-none md:hidden" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <SidebarBody collapsed={false} counts={counts} href={href} onNavigate={() => setMobile(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div id="scroller" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto">
        <header className="no-print sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-2 bg-ivory px-6">
          <button type="button" className="flex h-[34px] w-[34px] items-center justify-center rounded-lg md:hidden" aria-label="Open navigation" onClick={() => setMobile(true)}>
            <Menu className="h-4 w-4" />
          </button>
          <HeaderSearch hits={model.search} onOpen={openHit} />
          <button type="button" className="relative ml-auto flex h-[34px] w-[34px] items-center justify-center rounded-lg text-forest-900" aria-label="Mail">
            <Mail className="h-4 w-4" />
            {mail > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-balloon" />}
          </button>
          <button type="button" className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg text-forest-900" aria-label="Notifications" onClick={() => navigate(href('/control/exceptions'))}>
            <Bell className="h-4 w-4" />
            {alerts > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-balloon" />}
          </button>
          <AccountMenu />
        </header>
        <div className="sticky top-[52px] z-20 bg-ivory px-6 pb-0 pt-0">
          <FilterBar embedded />
        </div>
        <main id="main" className="w-full flex-1 px-6 pb-6 pt-4">
          {children}
        </main>
      </div>
      <span className="sr-only">{location.pathname}</span>
    </div>
  )
}

function AccountMenu() {
  const { href } = useFinance()
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [open, setOpen] = useState(false)
  return (
    <Pop.Root open={open} onOpenChange={setOpen}>
      <Pop.Trigger asChild>
        <button type="button" className="flex h-[34px] items-center gap-2 rounded-lg border border-line bg-white px-1.5 pr-2.5 text-[13px] font-medium text-forest-900" aria-label="Account">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-forest-900 text-[11px] font-semibold text-ivory">{user.firstName.slice(0, 1)}</span>
          <span className="hidden sm:inline">{user.firstName}</span>
        </button>
      </Pop.Trigger>
      <Pop.Portal>
        <Pop.Content className="z-50 w-44 rounded-lg border border-line bg-white p-1 shadow-card" align="end" sideOffset={8}>
          <button type="button" className="flex h-8 w-full items-center rounded-md px-2 text-left text-[13px] text-forest-900 hover:bg-cream" onClick={() => { setOpen(false); navigate(href('/control/settings')) }}>Settings</button>
          <button type="button" className="flex h-8 w-full items-center rounded-md px-2 text-left text-[13px] text-forest-900 hover:bg-cream" onClick={() => { setOpen(false); navigate('/login') }}>Log out</button>
        </Pop.Content>
      </Pop.Portal>
    </Pop.Root>
  )
}

function HeaderSearch({ hits, onOpen }: { hits: SearchHit[]; onOpen: (href: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const q = query.trim().toLowerCase()
  const matches = q ? hits.filter((hit) => `${hit.label} ${hit.hint} ${hit.group}`.toLowerCase().includes(q)).slice(0, 8) : []

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        input.current?.focus()
      }
    }
    const onPointer = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [])

  const choose = (href: string) => {
    onOpen(href)
    setQuery('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div ref={box} className="relative w-[220px] max-w-[46vw] shrink">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      <input
        ref={input}
        value={query}
        aria-label="Search"
        placeholder="Search"
        className="h-[34px] w-full rounded-lg border border-line bg-white pl-8 pr-2 text-[13px] text-forest-900 shadow-card outline-none placeholder:text-muted"
        onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpen(false); input.current?.blur() }
          if (event.key === 'Enter' && matches[0]) choose(matches[0].href)
        }}
      />
      {open && q && (
        <div className="absolute left-0 top-[38px] z-40 w-[260px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-[rgba(11,61,46,0.06)] bg-white shadow-card">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-[12.5px] text-muted">No matches.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {matches.map((hit) => (
                <li key={hit.id}>
                  <button type="button" className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-cream" onClick={() => choose(hit.href)}>
                    <span className="truncate text-[13px] text-forest-900">{hit.label}</span>
                    <span className="truncate text-[11px] text-muted">{hit.group} · {hit.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function SidebarBody({ collapsed, counts, href, onNavigate, onToggle }: { collapsed: boolean; counts: Record<string, number>; href: (path: string) => string; onNavigate: () => void; onToggle?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <BalloonMark />
        {!collapsed && (
          <span className="min-w-0">
            <span className="block truncate font-display text-[15px] leading-none text-white">Balloon Safaris</span>
            <span className="mt-1 block text-[9px] font-semibold tracking-[0.16em] text-gold">FINANCE</span>
          </span>
        )}
        {onToggle && (
          <button type="button" className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#B7CBBF] hover:bg-white/10" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <ChevronLeft className={cn('h-4 w-4 transition duration-150', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>
      <nav className="nav-scroll min-h-0 flex-1 px-2 pb-2" aria-label="Primary">
        {NAV.map((group) => (
          <div key={group.label ?? 'home'} className={group.label ? 'mt-4' : undefined}>
            {group.label && !collapsed && <p className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/55">{group.label}</p>}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <SideLink key={item.to} item={item} collapsed={collapsed} count={counts[item.to] ?? 0} to={href(item.to)} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-2 py-2">
        <SideLink item={{ to: '/control/settings', label: 'Settings', icon: Settings }} collapsed={collapsed} count={0} to={href('/control/settings')} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

function SideLink({ item, collapsed, count, to, onNavigate }: { item: Item; collapsed: boolean; count: number; to: string; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <NavLink to={to} end onClick={onNavigate} title={item.label} className={({ isActive }) => cn('relative flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] transition duration-150', collapsed && 'justify-center px-0', isActive ? 'bg-white/10 text-white' : 'text-[#D7E6DE] hover:bg-white/[0.06]')}>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-gold" />}
          <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && count > 0 && <span className="ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold leading-none text-forest-900">{count}</span>}
        </>
      )}
    </NavLink>
  )
}

function BalloonMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <rect width="36" height="36" rx="10" fill="#1E6B50" />
      <ellipse cx="18" cy="14" rx="8" ry="9" fill="#E8832A" />
      <path d="M15 22h6l-1 3h-4z" fill="#C9A227" />
    </svg>
  )
}
