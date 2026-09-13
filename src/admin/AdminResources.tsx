import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Resource } from '../types'
import { Plus, Trash2, Edit3, ExternalLink } from 'lucide-react'
import { SectionHeader, SearchBar, LoadingSpinner, EmptyState, Modal, FormField, ErrorBox, FormActions } from './AdminTeachers'

const categories = ["O'quv dasturi", 'Vositalar', "Qo'llanmalar", 'Dars', 'Boshqa']

const categoryColors: Record<string, string> = {
  "O'quv dasturi": 'bg-primary-50 text-primary-700',
  'Vositalar': 'bg-accent-50 text-accent-700',
  "Qo'llanmalar": 'bg-amber-50 text-amber-700',
  'Dars': 'bg-cyan-50 text-cyan-700',
  'Boshqa': 'bg-neutral-100 text-neutral-600',
}

export function AdminResources() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Resource | null>(null)

  const fetchResources = useCallback(async () => {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setResources(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  const handleDelete = async (id: string) => {
    if (!confirm('Bu resursni o\'chirishni istaysizmi?')) return
    await supabase.from('resources').delete().eq('id', id)
    fetchResources()
  }

  const filtered = resources.filter((r) => {
    const q = search.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <SectionHeader
        title="Resurslar boshqaruvi"
        subtitle="Resurslarni qo'shish, tahrirlash va o'chirish"
        onAdd={() => { setEditing(null); setShowForm(true) }}
        addLabel="Resurs qo'shish"
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Resurslarni qidirish..." />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? 'Qidiruv bo\'yicha resurslar topilmadi.' : 'Hali resurslar yo\'q.'} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-neutral-700">Resurs</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 md:table-cell">Kategoriya</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 lg:table-cell">Muallif</th>
                  <th className="px-4 py-3 text-right font-semibold text-neutral-700">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((resource) => (
                  <tr key={resource.id} className="transition-colors hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{resource.title}</div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{resource.description}</div>
                      <div className="mt-1 md:hidden">
                        <span className={`badge ${categoryColors[resource.category] || 'bg-neutral-100 text-neutral-600'}`}>
                          {resource.category}
                        </span>
                      </div>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                        <ExternalLink className="h-3 w-3" /> {resource.url.length > 40 ? resource.url.slice(0, 40) + '...' : resource.url}
                      </a>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className={`badge ${categoryColors[resource.category] || 'bg-neutral-100 text-neutral-600'}`}>
                        {resource.category}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-neutral-600 lg:table-cell">{resource.author_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(resource); setShowForm(true) }}
                          className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-primary-50 hover:text-primary-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <ResourceForm
          resource={editing}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchResources() }}
        />
      )}
    </div>
  )
}

function ResourceForm({ resource, onClose, onSuccess }: { resource: Resource | null; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(resource?.title || '')
  const [description, setDescription] = useState(resource?.description || '')
  const [category, setCategory] = useState(resource?.category || "O'quv dasturi")
  const [url, setUrl] = useState(resource?.url || '')
  const [authorName, setAuthorName] = useState(resource?.author_name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !url.trim() || !authorName.trim()) {
      setError('Barcha maydonlar to\'ldirilishi shart.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      url: url.trim(),
      author_name: authorName.trim(),
    }

    const { error: upsertError } = resource
      ? await supabase.from('resources').update(payload).eq('id', resource.id)
      : await supabase.from('resources').insert(payload)

    setSaving(false)

    if (upsertError) {
      setError('Saqlab bo\'lmadi. Qaytadan urinib ko\'ring.')
      return
    }

    onSuccess()
  }

  return (
    <Modal title={resource ? 'Resursni tahrirlash' : 'Resurs qo\'shish'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Sarlavha *">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Python dasturlash asoslari" />
        </FormField>
        <FormField label="Tavsif *">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="Bu resurs nimani qamrab oladi?" />
        </FormField>
        <FormField label="Kategoriya">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Havola (URL) *">
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="input-field" placeholder="https://..." />
        </FormField>
        <FormField label="Muallif ismi *">
          <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="input-field" placeholder="Ali Valiyev" />
        </FormField>
        {error && <ErrorBox message={error} />}
        <FormActions onClose={onClose} saving={saving} saveLabel={resource ? 'Saqlash' : 'Qo\'shish'} />
      </form>
    </Modal>
  )
}
