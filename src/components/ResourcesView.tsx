import { useState } from 'react'
import { Plus, ExternalLink, Search, X } from 'lucide-react'
import type { Resource } from '../types'
import { ResourceFormModal } from './ResourceFormModal'

type Props = {
  resources: Resource[]
  onRefresh: () => void
}

const categoryColors: Record<string, string> = {
  "O'quv dasturi": 'bg-primary-50 text-primary-700',
  'Vositalar': 'bg-accent-50 text-accent-700',
  "Qo'llanmalar": 'bg-amber-50 text-amber-700',
  'Dars': 'bg-cyan-50 text-cyan-700',
  'Boshqa': 'bg-neutral-100 text-neutral-600',
}

export function ResourcesView({ resources, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const filtered = resources.filter((r) => {
    const q = search.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pt-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">
            O'qituv resurslari
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Jamoa tomonidan ulashilgan dars rejalari, vositalar va qo'llanmalar
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Resurs ulashish
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Resurslarni qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-11"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-20 text-center">
          <p className="text-sm font-medium text-neutral-500">
            {search
              ? 'Qidiruv bo\'yicha resurslar topilmadi.'
              : 'Hali resurslar ulashilmagan. Birinchisini ulashing!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <div
              key={resource.id}
              className="card group flex flex-col p-5 animate-slide-up"
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`badge ${
                    categoryColors[resource.category] || 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {resource.category}
                </span>
              </div>

              <h3 className="font-display text-base font-bold text-neutral-900">
                {resource.title}
              </h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-600">
                {resource.description}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                <span className="text-xs text-neutral-400">
                  muallif: {resource.author_name}
                </span>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
                >
                  Ochish
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ResourceFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
