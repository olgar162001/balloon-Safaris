import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import * as Switch from '@radix-ui/react-switch'
import * as Tabs from '@radix-ui/react-tabs'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-control text-sm font-medium transition duration-180 ease-out disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-forest-900 text-white hover:bg-forest-800',
        gold: 'bg-gold text-forest-900 hover:brightness-95',
        ghost: 'bg-transparent text-forest-900 hover:bg-cream',
        outline: 'border border-line bg-white text-forest-900 hover:bg-ivory',
      },
      size: { sm: 'h-8 px-3', md: 'h-10 px-4' },
    },
    defaultVariants: { variant: 'outline', size: 'sm' },
  },
)

export function Button({ className, variant, size, asChild, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonStyles({ variant, size }), className)} {...props} />
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  )
}

export const inputClass = 'h-10 w-full rounded-control border border-line bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold'

export function Sheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-forest-900/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-card" aria-describedby={undefined}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Dialog.Title className="font-display text-xl text-forest-900">{title}</Dialog.Title>
            <Dialog.Close className="rounded-control p-2 hover:bg-cream" aria-label="Close">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Modal({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-forest-900/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(560px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-white p-5 shadow-card" aria-describedby={undefined}>
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="font-display text-xl">{title}</Dialog.Title>
            <Dialog.Close className="rounded-control p-2 hover:bg-cream" aria-label="Close"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const Menu = DropdownMenu
export const Pop = Popover
export const Tip = Tooltip
export const TabSet = Tabs
export const Toggle = Switch

export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tip.Root>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content className="z-50 max-w-xs rounded-control bg-forest-900 px-3 py-2 text-xs text-white shadow-card" sideOffset={6}>
          {label}
          <Tip.Arrow className="fill-forest-900" />
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  )
}
