import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="w-full">
      <h1 className="font-display text-[24px] font-semibold leading-none tracking-tight text-forest-900">Page not found</h1>
      <p className="mt-2 text-[13px] text-muted">That address is not in this workspace.</p>
      <Link to="/" className="mt-6 inline-flex h-[34px] items-center rounded-lg bg-forest-900 px-3 text-[13px] font-medium text-white">Back to dashboard</Link>
    </div>
  )
}
