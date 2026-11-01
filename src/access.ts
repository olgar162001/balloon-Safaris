import type { CurrencyCode, PipelineStage, Role } from '@/types'

export const ROLES: Role[] = [
  'Director',
  'Finance Manager',
  'Accountant',
  'HQ Cash Custodian',
  'Mara Cashier',
  'Auditor',
  'System Admin',
]

export const ROLE_USER: Record<Role, { id: string; name: string }> = {
  Director: { id: 'director-1', name: 'Demo · Director' },
  'Finance Manager': { id: 'finance-manager', name: 'Demo · Finance Manager' },
  Accountant: { id: 'accountant-1', name: 'Demo · Accountant' },
  'HQ Cash Custodian': { id: 'hq-custodian', name: 'Demo · HQ Cash Custodian' },
  'Mara Cashier': { id: 'mara-cashier', name: 'Demo · Mara Cashier' },
  Auditor: { id: 'auditor-1', name: 'Demo · Auditor' },
  'System Admin': { id: 'admin-1', name: 'Demo · System Admin' },
}

export const PIPELINE: { id: PipelineStage; label: string }[] = [
  { id: 'capture', label: 'Capture' },
  { id: 'validate', label: 'Validate' },
  { id: 'classify', label: 'Classify' },
  { id: 'attach', label: 'Attach evidence' },
  { id: 'submit', label: 'Submit' },
  { id: 'approve', label: 'Approve' },
  { id: 'post', label: 'Post' },
  { id: 'reconcile', label: 'Reconcile' },
  { id: 'close', label: 'Close period' },
]

const NEXT: Record<PipelineStage, PipelineStage | null> = {
  capture: 'validate',
  validate: 'classify',
  classify: 'attach',
  attach: 'submit',
  submit: 'approve',
  approve: 'post',
  post: 'reconcile',
  reconcile: 'close',
  close: null,
}

export function pipelineLabel(stage: PipelineStage) {
  return PIPELINE.find((item) => item.id === stage)?.label ?? stage
}

export function nextStage(stage: PipelineStage) {
  return NEXT[stage]
}

const APPROVE_LIMIT: Partial<Record<Role, Partial<Record<CurrencyCode, number>>>> = {
  'Finance Manager': { KES: 2_000_000, USD: 15_000, GBP: 12_000 },
  Director: { KES: Number.POSITIVE_INFINITY, USD: Number.POSITIVE_INFINITY, GBP: Number.POSITIVE_INFINITY },
  'System Admin': { KES: Number.POSITIVE_INFINITY, USD: Number.POSITIVE_INFINITY, GBP: Number.POSITIVE_INFINITY },
}

export function canOperateDomain(role: Role, domain: 'pd' | 'mara' | 'hq' | 'general') {
  if (role === 'Auditor') return false
  if (role === 'Mara Cashier') return domain === 'pd' || domain === 'mara'
  if (role === 'HQ Cash Custodian') return domain === 'hq'
  return true
}

export interface ActionState {
  label: string
  disabled: boolean
  reason: string
  next: PipelineStage | null
}

export function actionFor(input: {
  role: Role
  userId: string
  creatorId: string
  pipeline: PipelineStage
  domain: 'pd' | 'mara' | 'hq' | 'general'
  evidence: number
  amount: number
  currency: CurrencyCode | 'MISSING'
  period: string
  closedPeriods: string[]
}): ActionState {
  const next = nextStage(input.pipeline)
  if (!next) return { label: 'Period closed', disabled: true, reason: 'This transaction is in a closed stage.', next: null }
  if (input.closedPeriods.includes(input.period)) {
    return { label: 'Posting locked', disabled: true, reason: `${input.period} is closed. Postings are locked.`, next }
  }
  if (input.role === 'Auditor') {
    return { label: pipelineLabel(next), disabled: true, reason: 'Auditor is read-only.', next }
  }
  if (!canOperateDomain(input.role, input.domain)) {
    return { label: pipelineLabel(next), disabled: true, reason: 'This action is outside your role.', next }
  }
  if ((next === 'submit' || next === 'approve') && input.evidence < 1) {
    return { label: 'Attach evidence', disabled: true, reason: 'Evidence is required before submit or approval.', next }
  }
  if (next === 'approve') {
    const approvers: Role[] = ['Director', 'Finance Manager', 'System Admin']
    if (!approvers.includes(input.role)) {
      return {
        label: 'Approve',
        disabled: true,
        reason: input.role === 'HQ Cash Custodian' || input.role === 'Mara Cashier'
          ? 'Your role can submit but not approve.'
          : 'Your role can submit but not approve.',
        next,
      }
    }
    if (input.creatorId === input.userId) {
      return {
        label: 'Approve',
        disabled: true,
        reason: 'Maker-checker: you cannot approve a transaction you created.',
        next,
      }
    }
    if (input.currency === 'MISSING') {
      return { label: 'Approve', disabled: true, reason: 'Currency is missing. Approval is blocked.', next }
    }
    const limit = APPROVE_LIMIT[input.role]?.[input.currency]
    if (limit !== undefined && Math.abs(input.amount) > limit) {
      return { label: 'Approve', disabled: true, reason: `Amount is above your ${input.currency} approval limit.`, next }
    }
  }
  if (next === 'close' && !['Director', 'Finance Manager', 'System Admin'].includes(input.role)) {
    return { label: 'Close period', disabled: true, reason: 'Only Finance leadership can close the period on a transaction.', next }
  }
  return { label: pipelineLabel(next), disabled: false, reason: '', next }
}
