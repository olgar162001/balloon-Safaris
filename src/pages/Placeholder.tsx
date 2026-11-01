import { useNavigate } from 'react-router-dom'

export function Placeholder({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-semibold leading-none tracking-tight text-forest-900">{title}</h1>
        <button type="button" className="h-[34px] rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-forest-900" onClick={() => navigate(-1)}>Back</button>
      </div>
    </div>
  )
}
