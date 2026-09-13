import { GraduationCap, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-primary-800">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-neutral-600">
              IT O'qituvchilar Namangan
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#admin" className="text-sm text-neutral-400 transition-colors hover:text-primary-600">
              Admin
            </a>
            <p className="flex items-center gap-1.5 text-sm text-neutral-400">
              Namangan IT o'qituvchilari uchun <Heart className="h-3.5 w-3.5 text-red-400" /> bilan yaratildi
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
