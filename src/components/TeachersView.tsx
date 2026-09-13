import { useState } from 'react'
import { Plus, Search, Mail, Phone, X } from 'lucide-react'
import type { Teacher } from '../types'
import { TeacherCard } from './TeacherCard'
import { TeacherFormModal } from './TeacherFormModal'

type Props = {
  teachers: Teacher[]
  onRefresh: () => void
}

export function TeachersView({ teachers, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase()
    return (
      t.full_name.toLowerCase().includes(q) ||
      t.school.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q)
    )
  })

  return (
    <div className="pt-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">
            O'qituvchilar reestri
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Namangan IT o'qituvchilari bilan tanishing
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          O'qituvchi qo'shish
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Ism, maktab yoki fan bo'yicha qidirish..."
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
              ? 'Qidiruv bo\'yicha o\'qituvchilar topilmadi.'
              : 'Hali o\'qituvchilar ro\'yxatga olinmagan. Birinchi bo\'ling!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      )}

      {showForm && (
        <TeacherFormModal
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
