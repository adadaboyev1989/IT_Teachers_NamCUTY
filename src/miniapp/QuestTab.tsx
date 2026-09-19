import { useEffect, useState, type CSSProperties } from 'react'
import { Lock, CheckCircle2, Play, Clock, ArrowLeft, Sparkles, Unlock, Trophy, PartyPopper } from 'lucide-react'
import { callMiniApi } from './lib/api'

type Stage = {
  id: string
  title: string
  description: string | null
  order_index: number
  time_limit_seconds: number | null
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed'
  score: number
}

type Question = {
  id: string
  question: string
  options: string[]
  points: number
  order_index: number
  answer: { selected_option: number; is_correct: boolean } | null
}

export function QuestTab({ onPointsChanged }: { onPointsChanged: () => void }) {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [openStage, setOpenStage] = useState<Stage | null>(null)

  const loadStages = async () => {
    setLoading(true)
    const res = await callMiniApi<{ stages: Stage[] }>('/quest/stages')
    if (res.ok) setStages(res.stages)
    setLoading(false)
  }

  useEffect(() => { loadStages() }, [])

  if (openStage) {
    return (
      <StagePlayer
        stage={openStage}
        onBack={() => { setOpenStage(null); loadStages(); onPointsChanged() }}
        onNextStage={(next) => { setOpenStage(next); loadStages(); onPointsChanged() }}
      />
    )
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>
  }

  return (
    <div>
      <h2 className="mb-4 font-display text-lg font-bold text-neutral-900">Quest — Escape Room</h2>
      {stages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-surface py-16 text-center text-sm text-neutral-400">Hali bosqich yo'q</div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage) => (
            <button
              key={stage.id}
              disabled={stage.status === 'locked'}
              onClick={() => setOpenStage(stage)}
              className="card flex w-full items-center gap-3 p-4 text-left transition-all disabled:opacity-50"
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                stage.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : stage.status === 'locked' ? 'bg-neutral-100 text-neutral-400' : 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400'
              }`}>
                {stage.status === 'locked' ? <Lock className="h-5 w-5" /> : stage.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900">{stage.title}</p>
                {stage.description && <p className="truncate text-xs text-neutral-500">{stage.description}</p>}
              </div>
              <div className="flex-shrink-0 text-right">
                {stage.status === 'completed' && <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stage.score} ball</p>}
                {stage.time_limit_seconds && (
                  <p className="flex items-center gap-1 text-xs text-neutral-400"><Clock className="h-3 w-3" />{stage.time_limit_seconds}s</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const CONFETTI_COLORS = ['bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-400', 'bg-cyan-500']

function Confetti() {
  const pieces = Array.from({ length: 16 })
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {pieces.map((_, i) => {
        const angle = (i / pieces.length) * 360 + (i % 2 === 0 ? 10 : -10)
        const distance = 60 + ((i * 37) % 50)
        const rad = (angle * Math.PI) / 180
        const x = Math.cos(rad) * distance
        const y = Math.sin(rad) * distance - 30
        return (
          <span
            key={i}
            className={`absolute left-1/2 top-16 h-2 w-2 rounded-sm ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]} animate-confetti-pop`}
            style={{ '--confetti-x': `${x}px`, '--confetti-y': `${y}px`, animationDelay: `${i * 30}ms`, zIndex: 10 } as CSSProperties}
          />
        )
      })}
    </div>
  )
}

function PointToast({ points, toastKey }: { points: number; toastKey: number }) {
  return (
    <div key={toastKey} className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
      <div className="animate-float-up-fade mt-1 flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30">
        <Sparkles className="h-4 w-4" />+{points} ball
      </div>
    </div>
  )
}

function StageCelebration({ stage, bonus, onBack, onNextStage }: { stage: Stage; bonus: number; onBack: () => void; onNextStage: (next: Stage) => void }) {
  const [nextStage, setNextStage] = useState<Stage | null | undefined>(undefined)
  const [showUnlock, setShowUnlock] = useState(false)

  useEffect(() => {
    callMiniApi<{ stages: Stage[] }>('/quest/stages').then((res) => {
      if (res.ok) {
        const ns = res.stages.find((s) => s.order_index === stage.order_index + 1)
        setNextStage(ns && ns.status !== 'locked' ? ns : null)
      } else {
        setNextStage(null)
      }
    })
    const t = setTimeout(() => setShowUnlock(true), 750)
    return () => clearTimeout(t)
  }, [stage.id, stage.order_index])

  return (
    <div className="card relative p-8 text-center">
      <Confetti />
      <div className="animate-pop-in relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
        <Trophy className="h-9 w-9" />
      </div>
      <p className="mt-4 font-display text-xl font-bold text-neutral-900">Bosqich yakunlandi!</p>
      {bonus > 0 && (
        <p className="animate-fade-in mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{bonus} bonus ball 🎁</p>
      )}

      {showUnlock && nextStage !== undefined && (
        <div className="animate-fade-in mt-6 border-t border-neutral-200 pt-6">
          {nextStage ? (
            <>
              <div className="animate-unlock-shake mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                <Unlock className="h-6 w-6" />
              </div>
              <p className="mt-2 text-sm font-semibold text-neutral-900">🔓 Keyingi bosqich ochildi!</p>
              <p className="text-sm text-neutral-500">{nextStage.title}</p>
              <button onClick={() => onNextStage(nextStage)} className="btn-primary mt-4 w-full">Keyingi bosqichga o'tish</button>
              <button onClick={onBack} className="btn-ghost mt-2 w-full">Ro'yxatga qaytish</button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <PartyPopper className="h-6 w-6" />
              </div>
              <p className="mt-2 text-sm font-semibold text-neutral-900">Barcha bosqichlarni yakunladingiz!</p>
              <button onClick={onBack} className="btn-primary mt-4 w-full">Ro'yxatga qaytish</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StagePlayer({ stage, onBack, onNextStage }: { stage: Stage; onBack: () => void; onNextStage: (next: Stage) => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<{ correct: boolean; correctOption: number; selectedOption: number; points: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stageDone, setStageDone] = useState<{ completed: boolean; bonus: number } | null>(null)
  const [pointToast, setPointToast] = useState<{ points: number; key: number } | null>(null)

  useEffect(() => {
    callMiniApi<{ questions: Question[] }>('/quest/questions', { stage_id: stage.id }).then((res) => {
      if (res.ok) {
        setQuestions(res.questions)
        const firstUnanswered = res.questions.findIndex((q) => !q.answer)
        setIndex(firstUnanswered === -1 ? res.questions.length : firstUnanswered)
      }
      setLoading(false)
    })
  }, [stage.id])

  useEffect(() => {
    if (!pointToast) return
    const t = setTimeout(() => setPointToast(null), 1300)
    return () => clearTimeout(t)
  }, [pointToast])

  const current = questions[index]

  const handleAnswer = async (optionIndex: number) => {
    if (!current || submitting) return
    setSubmitting(true)
    const res = await callMiniApi<{ correct: boolean; correct_option: number; points_awarded: number; stage_completed: boolean; bonus_awarded: number }>('/quest/answer', {
      question_id: current.id,
      selected_option: optionIndex,
    })
    setSubmitting(false)
    if (!res.ok) return
    setFeedback({ correct: res.correct, correctOption: res.correct_option, selectedOption: optionIndex, points: res.points_awarded })
    if (res.correct && res.points_awarded > 0) setPointToast({ points: res.points_awarded, key: Date.now() })
    if (res.stage_completed) setStageDone({ completed: true, bonus: res.bonus_awarded })
  }

  const next = () => {
    setFeedback(null)
    setIndex((i) => i + 1)
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-neutral-500"><ArrowLeft className="h-4 w-4" />Orqaga</button>
      <h2 className="mb-4 font-display text-lg font-bold text-neutral-900">{stage.title}</h2>

      {stageDone || index >= questions.length ? (
        <StageCelebration stage={stage} bonus={stageDone?.bonus || 0} onBack={onBack} onNextStage={onNextStage} />
      ) : current ? (
        <div className="card relative overflow-hidden p-5">
          {pointToast && <PointToast points={pointToast.points} toastKey={pointToast.key} />}
          <p className="mb-1 text-xs font-medium text-neutral-400">{index + 1} / {questions.length}</p>
          <p className="mb-4 text-base font-semibold text-neutral-900">{current.question}</p>
          <div className="space-y-2">
            {current.options.map((opt, i) => {
              const showFeedback = feedback !== null
              const isCorrectOption = showFeedback && i === feedback.correctOption
              const isWrongPick = showFeedback && !feedback.correct && i === feedback.selectedOption
              return (
                <button
                  key={i}
                  disabled={submitting || showFeedback}
                  onClick={() => handleAnswer(i)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                    isCorrectOption ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400' : isWrongPick ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-400' : 'border-neutral-200 bg-surface hover:border-primary-300'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {feedback && (
            <div className="animate-fade-in mt-4 flex items-center justify-between">
              <p className={`text-sm font-medium ${feedback.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {feedback.correct ? `✅ To'g'ri! +${feedback.points} ball` : "❌ Noto'g'ri javob"}
              </p>
              <button onClick={next} className="btn-primary">Keyingisi</button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
