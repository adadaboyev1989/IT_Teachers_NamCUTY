import { Plus, Search, X, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function SectionHeader({ title, subtitle, onAdd, addLabel }: { title: string; subtitle: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold text-neutral-900">{title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      {onAdd && (
        <button onClick={onAdd} className="btn-primary">
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      )}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-6">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="input-field pl-11" />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-surface py-20 text-center">
      <p className="text-sm font-medium text-neutral-500">{message}</p>
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface shadow-2xl animate-scale-in">
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-100 bg-surface px-6 py-4">
          <h3 className="font-display text-lg font-bold text-neutral-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-500/15 dark:text-red-400">{message}</div>
}

export function FormActions({ onClose, saving, saveLabel }: { onClose: () => void; saving: boolean; saveLabel: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="btn-ghost">Bekor qilish</button>
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Saqlanmoqda...</>) : (saveLabel)}
      </button>
    </div>
  )
}
