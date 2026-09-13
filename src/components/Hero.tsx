import { ArrowRight, Users, BookOpen, CalendarDays, MapPin } from 'lucide-react'

type Props = {
  teacherCount: number
  resourceCount: number
  eventCount: number
  onExplore: () => void
}

export function Hero({
  teacherCount,
  resourceCount,
  eventCount,
  onExplore,
}: Props) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary-500 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-accent-500 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-primary-400 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-primary-100 backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5" />
            Namangan, O'zbekiston
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            IT o'qituvchilarini birlashtiramiz
            <br />
            <span className="bg-gradient-to-r from-primary-200 to-accent-300 bg-clip-text text-transparent">
              Namangan bo'ylab
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-100">
            IT o'qituvchilari uchun resurslar ulashish, tadbirlarni topish va shahar bo'ylab hamkasblar bilan bog'lanish uchun jamoa markazi.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={onExplore} className="btn-primary">
              Jamoani ko'rish
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="https://t.me/it_teachers_namangan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Telegram guruhiga qo'shilish
            </a>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8">
            <StatCard
              icon={Users}
              value={teacherCount}
              label="O'qituvchilar"
            />
            <StatCard
              icon={BookOpen}
              value={resourceCount}
              label="Resurslar"
            />
            <StatCard
              icon={CalendarDays}
              value={eventCount}
              label="Tadbirlar"
            />
          </div>
        </div>
      </div>

      <div className="h-1 w-full bg-gradient-to-r from-primary-400 via-accent-400 to-primary-500" />
    </section>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users
  value: number
  label: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-sm sm:px-6">
      <Icon className="mx-auto h-5 w-5 text-primary-200" />
      <div className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-primary-200 sm:text-sm">
        {label}
      </div>
    </div>
  )
}
