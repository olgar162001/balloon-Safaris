import type { ReactNode } from 'react'

export function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex h-full flex-col gap-4 rounded-lg border border-line bg-white p-4 shadow-card">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold leading-none tracking-tight text-forest-900">{title}</h2>
          <p className="mt-0.5 truncate text-[12px] leading-none text-muted">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
