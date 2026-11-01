import { useState } from 'react'
import { Link } from 'react-router-dom'
import { actionFor, pipelineLabel, ROLE_USER } from '@/access'
import { formatDisplayDate, formatMoney } from '@/lib/format'
import { useAppStore } from '@/store'
import type { LedgerRow } from '@/types'
import { Sheet, Button, InfoTip, Modal } from '@/components/ui'
import { Pipeline, VerifyBadge } from '@/components/widgets'

function patchId(row: LedgerRow) {
  if (row.id.startsWith('REV-') || row.id.startsWith('EXP-')) return row.id.slice(4)
  if (row.id.startsWith('OUT-')) return row.id.slice(4)
  if (row.id.startsWith('IN-')) return row.id.slice(3)
  return row.id
}

export function TransactionDrawer({ row, onClose }: { row: LedgerRow | null; onClose: () => void }) {
  const role = useAppStore((state) => state.role)
  const settings = useAppStore((state) => state.settings)
  const patchEntity = useAppStore((state) => state.patchEntity)
  const [preview, setPreview] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const detail = row?.detail
  const action = row && detail ? actionFor({
    role,
    userId: ROLE_USER[role].id,
    creatorId: detail.creatorId,
    pipeline: row.pipeline,
    domain: detail.domain,
    evidence: detail.documents.length,
    amount: Math.abs(detail.amount),
    currency: detail.currency === 'MISSING' ? 'MISSING' : detail.currency,
    period: row.date.slice(0, 7),
    closedPeriods: settings.closedPeriods,
  }) : null
  return (
    <>
      <Sheet open={Boolean(row)} onOpenChange={(open) => { if (!open) onClose() }} title={detail?.title ?? 'Transaction'}>
        {row && detail && action && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-display text-3xl money">{formatMoney(detail.amount, detail.currency)}</p>
              <VerifyBadge status={detail.verify} />
            </div>
            {detail.subtitle ? <p className="text-[13px] text-muted">{detail.subtitle}</p> : null}
            <Pipeline stage={row.pipeline} />
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Dates</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {detail.dates.map((item) => <div key={item.label}><dt className="text-muted">{item.label}</dt><dd>{item.value.includes('-') && item.value.length >= 10 ? formatDisplayDate(item.value) : item.value}</dd></div>)}
              </dl>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Details</h3>
              <dl className="mt-2 space-y-1 text-sm">
                {detail.facts.map((item) => <div key={item.label} className="flex justify-between gap-3"><dt className="text-muted">{item.label}</dt><dd className="text-right">{item.value}</dd></div>)}
              </dl>
            </section>
            {detail.allocations.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Allocations</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {detail.allocations.map((item) => <li key={item.label} className="flex justify-between gap-3"><span>{item.label}{item.note ? ` · ${item.note}` : ''}</span><span className="money">{formatMoney(item.amount, item.currency)}</span></li>)}
                </ul>
              </section>
            )}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Evidence</h3>
              <ul className="mt-2 space-y-1">
                {detail.documents.length === 0 && <li className="text-[13px] text-muted">None</li>}
                {detail.documents.map((file) => <li key={file.name}><button type="button" className="text-sm text-forest-600 underline" onClick={() => setPreview(file.name)}>{file.name}</button></li>)}
              </ul>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Approvals</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {detail.approvals.length === 0 && <li className="text-[13px] text-muted">None</li>}
                {detail.approvals.map((item) => <li key={item.action}><span className="font-medium">{item.action}</span> · {item.by}<br /><span className="text-muted">{item.note}</span></li>)}
              </ul>
            </section>
            {detail.notes ? <p className="text-[13px] text-muted line-clamp-2">{detail.notes}</p> : null}
            <p className="text-[11px] text-muted">Source: {detail.source}</p>
            <div className="flex flex-wrap gap-2">
              {detail.documents.length === 0 && (
                <Button variant="primary" onClick={() => patchEntity(patchId(row), { documentsAdded: ['session-evidence.pdf'] }, { action: 'Attach evidence', entity: row.id, before: 'No evidence', after: 'session-evidence.pdf', reason: 'Evidence attached', source: 'Transaction drawer' })}>Attach evidence</Button>
              )}
              <InfoTip label={action.reason || `Advance to ${action.label}`}>
                <span>
                  <Button variant="gold" disabled={action.disabled} onClick={() => action.next && patchEntity(patchId(row), { pipeline: action.next }, { action: pipelineLabel(action.next), entity: row.id, before: pipelineLabel(row.pipeline), after: pipelineLabel(action.next), reason: 'Workflow step', source: 'Transaction drawer' })}>{action.label}</Button>
                </span>
              </InfoTip>
              <Button disabled={role === 'Auditor'} onClick={() => {
                if (role === 'Auditor' || !reason.trim()) return
                patchEntity(patchId(row), { note: `Adjustment: ${reason}` }, { action: 'Record adjustment', entity: row.id, before: formatMoney(detail.amount, detail.currency), after: 'Original amount unchanged', reason, source: 'Transaction drawer' })
                setReason('')
              }}>Record adjustment</Button>
            </div>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wide text-muted">Adjustment reason</span>
              <input className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-[13px]" value={reason} disabled={role === 'Auditor'} onChange={(event) => setReason(event.target.value)} placeholder="Required" />
            </label>
            <Link className="inline-block text-[13px] font-medium text-forest-600" to={detail.sourceHref}>Open source</Link>
          </div>
        )}
      </Sheet>
      <Modal open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null) }} title={preview ?? 'Attachment'}>
        <div className="rounded-lg border border-line bg-ivory p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Attachment</p>
          <p className="mt-2 font-display text-[20px] font-semibold text-forest-900">{preview}</p>
        </div>
      </Modal>
    </>
  )
}
