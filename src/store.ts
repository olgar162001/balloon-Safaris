import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ROLE_USER } from '@/access'
import type { AppSettings, AuditEvent, CreditorInvoice, EntityPatch, ImportBatch, Role, SupplierPayment } from '@/types'

function seedLocks() {
  const days: string[] = []
  for (let month = 1; month <= 9; month += 1) {
    for (const day of [4, 5, 11, 18]) days.push(`2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  days.push('2026-10-04', '2026-10-05', '2026-10-11')
  return days
}

const initialSettings = (): AppSettings => ({
  recognition: 'on-flight',
  pdLabel: 'PD (Mara)',
  showDemoRibbon: true,
  signoffDismissed: false,
  closedPeriods: ['2026-01'],
  lockedDays: seedLocks(),
})

interface AppState {
  role: Role
  sidebarCollapsed: boolean
  settings: AppSettings
  patches: Record<string, EntityPatch>
  addedInvoices: CreditorInvoice[]
  addedPayments: SupplierPayment[]
  allocationOverrides: Record<string, { invoiceId: string; amount: number }[]>
  audit: AuditEvent[]
  imports: ImportBatch[]
  notice: string | null
  setRole: (role: Role) => void
  setCollapsed: (value: boolean) => void
  setNotice: (notice: string | null) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  patchEntity: (id: string, patch: EntityPatch, audit: Omit<AuditEvent, 'id' | 'at' | 'user'>) => void
  addInvoice: (invoice: CreditorInvoice) => void
  addPayment: (payment: SupplierPayment) => void
  setAllocations: (paymentId: string, allocations: { invoiceId: string; amount: number }[]) => void
  addImport: (batch: ImportBatch) => void
  rememberDuplicate: (fileName: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      role: 'Director',
      sidebarCollapsed: false,
      settings: initialSettings(),
      patches: {},
      addedInvoices: [],
      addedPayments: [],
      allocationOverrides: {},
      audit: [],
      imports: [],
      notice: null,
      setRole: (role) => set({ role }),
      setCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setNotice: (notice) => set({ notice }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      patchEntity: (id, patch, audit) => {
        const user = ROLE_USER[get().role].name
        set({
          patches: { ...get().patches, [id]: { ...get().patches[id], ...patch } },
          audit: [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), user, ...audit }, ...get().audit],
          notice: audit.action,
        })
      },
      addInvoice: (invoice) => set({ addedInvoices: [...get().addedInvoices, invoice], notice: 'Invoice added to this session.' }),
      addPayment: (payment) => set({ addedPayments: [...get().addedPayments, payment], notice: 'Payment recorded in this session.' }),
      setAllocations: (paymentId, allocations) => set({
        allocationOverrides: { ...get().allocationOverrides, [paymentId]: allocations },
        notice: 'Allocation updated. The original payment was not overwritten.',
      }),
      addImport: (batch) => set({ imports: [batch, ...get().imports], notice: 'Batch staged. Nothing was posted to the ledger.' }),
      rememberDuplicate: (fileName) => set({
        notice: `Duplicate batch detected for ${fileName}. No second copy was created.`,
        audit: [{
          id: `AUD-${Date.now()}`,
          at: new Date().toISOString(),
          user: ROLE_USER[get().role].name,
          action: 'Duplicate batch detected',
          entity: fileName,
          before: 'Existing batch',
          after: 'Rejected',
          reason: 'The file hash matches a batch already stored.',
          source: 'Import center',
        }, ...get().audit],
      }),
    }),
    {
      name: 'balloon-safaris-prototype',
      partialize: (state) => ({
        role: state.role,
        sidebarCollapsed: state.sidebarCollapsed,
        settings: state.settings,
        patches: state.patches,
        addedInvoices: state.addedInvoices,
        addedPayments: state.addedPayments,
        allocationOverrides: state.allocationOverrides,
        audit: state.audit,
        imports: state.imports,
      }),
    },
  ),
)
