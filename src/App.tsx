import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Tip } from '@/components/ui'
import { ModuleScreen } from '@/components/ModuleScreen'
import { Shell } from '@/components/Shell'
import { FinanceProvider } from '@/finance'
import { Forgot, Login, SignUp } from '@/pages/Auth'
import { CreditorsPage } from '@/pages/CreditorsPage'
import { Dashboard } from '@/pages/Dashboard'
import {
  AuditPage,
  ExceptionsPage,
  ImportPage,
  ReconciliationPage,
  ReportsPage,
  SettingsPage,
  StatementsPage,
} from '@/pages/MorePages'
import { NotFound } from '@/pages/NotFound'
import type { LedgerKind } from '@/types'

function Ledger({ kind }: { kind: LedgerKind }) {
  return <ModuleScreen kind={kind} />
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename || undefined}>
      <Tip.Provider delayDuration={200}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/*" element={<Workspace />} />
        </Routes>
      </Tip.Provider>
    </BrowserRouter>
  )
}

function Workspace() {
  return (
    <FinanceProvider>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/revenue" element={<Ledger kind="revenue" />} />
          <Route path="/revenue/vouchers" element={<Ledger kind="vouchers" />} />
          <Route path="/revenue/pd" element={<Ledger kind="pd" />} />
          <Route path="/debtors" element={<Ledger kind="debtors" />} />
          <Route path="/receipts" element={<Ledger kind="receipts" />} />
          <Route path="/invoices" element={<Ledger kind="invoices" />} />
          <Route path="/expenses" element={<Ledger kind="expenses" />} />
          <Route path="/payroll" element={<Ledger kind="payroll" />} />
          <Route path="/statutory" element={<Ledger kind="statutory" />} />
          <Route path="/creditor-payments" element={<Ledger kind="payments" />} />
          <Route path="/hq-petty-cash" element={<Ledger kind="hq-petty" />} />
          <Route path="/mara-petty-cash" element={<Ledger kind="mara-petty" />} />
          <Route path="/creditors" element={<CreditorsPage />} />
          <Route path="/payables/suppliers" element={<StatementsPage side="supplier" />} />
          <Route path="/payables/outstanding" element={<Ledger kind="creditors" />} />
          <Route path="/payables/payments" element={<Ledger kind="payments" />} />
          <Route path="/receivables" element={<Ledger kind="debtors" />} />
          <Route path="/receivables/statements" element={<StatementsPage side="customer" />} />
          <Route path="/receivables/aging" element={<Ledger kind="debtors" />} />
          <Route path="/operations/landing-fees" element={<Ledger kind="landing" />} />
          <Route path="/operations/allocations" element={<Ledger kind="allocations" />} />
          <Route path="/operations/reconciliation" element={<ReconciliationPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/control/import" element={<ImportPage />} />
          <Route path="/control/exceptions" element={<ExceptionsPage />} />
          <Route path="/control/audit" element={<AuditPage />} />
          <Route path="/control/settings" element={<SettingsPage />} />
          <Route path="/ledger/pnl" element={<Ledger kind="pnl" />} />
          <Route path="/ledger/cash" element={<Ledger kind="cash" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </FinanceProvider>
  )
}
