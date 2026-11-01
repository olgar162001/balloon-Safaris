import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-6 py-10">
      <div className="w-full max-w-[400px] rounded-lg border border-line bg-white p-6 shadow-card">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-gold">BALLOON SAFARIS</p>
        <h1 className="mt-2 font-display text-[24px] font-semibold leading-none tracking-tight text-forest-900">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

const field = 'mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-forest-900 outline-none focus-visible:ring-2 focus-visible:ring-gold'

export function Login() {
  const navigate = useNavigate()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    navigate('/')
  }
  return (
    <Frame title="Sign in">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-[13px] font-medium text-forest-900">Email<input className={field} type="email" name="email" autoComplete="username" required /></label>
        <label className="block text-[13px] font-medium text-forest-900">Password<input className={field} type="password" name="password" autoComplete="current-password" required /></label>
        <button type="submit" className="h-10 w-full rounded-lg bg-forest-900 text-[13px] font-semibold text-white">Sign in</button>
      </form>
      <div className="mt-4 flex justify-between text-[12.5px]">
        <Link className="text-forest-600" to="/forgot">Forgot password</Link>
        <Link className="text-forest-600" to="/signup">Create account</Link>
      </div>
    </Frame>
  )
}

export function SignUp() {
  const navigate = useNavigate()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    navigate('/')
  }
  return (
    <Frame title="Create account">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-[13px] font-medium text-forest-900">Name<input className={field} name="name" autoComplete="name" required /></label>
        <label className="block text-[13px] font-medium text-forest-900">Email<input className={field} type="email" name="email" autoComplete="email" required /></label>
        <label className="block text-[13px] font-medium text-forest-900">Password<input className={field} type="password" name="password" autoComplete="new-password" required /></label>
        <button type="submit" className="h-10 w-full rounded-lg bg-forest-900 text-[13px] font-semibold text-white">Create account</button>
      </form>
      <p className="mt-4 text-[12.5px] text-muted">Already registered? <Link className="text-forest-600" to="/login">Sign in</Link></p>
    </Frame>
  )
}

export function Forgot() {
  const [sent, setSent] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSent(true)
  }
  return (
    <Frame title="Reset password">
      {sent ? <p className="text-[13px] text-forest-900">Check your email for the reset link.</p> : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-[13px] font-medium text-forest-900">Email<input className={field} type="email" name="email" autoComplete="email" required /></label>
          <button type="submit" className="h-10 w-full rounded-lg bg-forest-900 text-[13px] font-semibold text-white">Send reset link</button>
        </form>
      )}
      <p className="mt-4 text-[12.5px]"><Link className="text-forest-600" to="/login">Back to sign in</Link></p>
    </Frame>
  )
}
