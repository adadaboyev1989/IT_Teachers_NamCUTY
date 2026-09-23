import { useEffect, useState } from 'react'
import { Lock, CheckCircle2, Play, Clock, ArrowLeft, Unlock, Trophy, PartyPopper, Heart } from 'lucide-react'
import { callMiniApi } from './lib/api'
import { Confetti, PointToast } from './lib/effects'

const QUEST_LIVES = 3

type Stage = {
  id: string
  title: string
  description: string | null
  order_index: number
  time_limit_seconds: number | null
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed'
  score: number
  locked_until: string | null
}

type Question = {
  id: string
  question: string
  options: string[]
  points: number
  order_index: number
  answer: { selected_option: number; is_correct: boolean } | null
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function Hearts({ lives, total = QUEST_LIVES }: { lives: number; total?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <Heart key={i} className={`h-4 w-4 ${i < lives ? 'fill-red-500 text-red-500' : 'fill-neutral-200 text-neutral-200 dark:fill-neutral-700 dark:text-neutral-700'}`} />
      ))}
    </div>
  )
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
          {stages.map((stage) => {
            const failLocked = !!stage.locked_until
            return (
              <button
                key={stage.id}
                disabled={stage.status === 'locked' || failLocked}
                onClick={() => setOpenStage(stage)}
                className="card flex w-full items-center gap-3 p-4 text-left transition-all disabled:opacity-50"
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                  failLocked ? 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400' :
                  stage.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : stage.status === 'locked' ? 'bg-neutral-100 text-neutral-400' : 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400'
                }`}>
                  {failLocked || stage.status === 'locked' ? <Lock className="h-5 w-5" /> : stage.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{stage.title}</p>
                  {failLocked ? (
                    <p className="text-xs font-medium text-red-500 dark:text-red-400">Bloklangan — {formatCountdown(new Date(stage.locked_until!).getTime() - Date.now())}</p>
                  ) : stage.description && <p className="truncate text-xs text-neutral-500">{stage.description}</p>}
                </div>
                <div className="flex-shrink-0 text-right">
                  {stage.status === 'completed' && <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stage.score} ball</p>}
                  {stage.time_limit_seconds && (
                    <p className="flex items-center gap-1 text-xs text-neutral-400"><Clock className="h-3 w-3" />{stage.time_limit_seconds}s</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
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

function LockedScreen({ lockedUntil, onBack, onRetry }: { lockedUntil: string; onBack: () => void; onRetry: () => void }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const remaining = new Date(lockedUntil).getTime() - now
  const expired = remaining <= 0

  return (
    <div className="card p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400">
        <Lock className="h-8 w-8" />
      </div>
      <p className="mt-4 font-display text-lg font-bold text-neutral-900">Bosqich vaqtincha bloklangan</p>
      <p className="mt-1 text-sm text-neutral-500">3 marta xato javob berildi. Qayta urinish uchun kuting:</p>
      <p className="mt-4 font-display text-3xl font-extrabold tabular-nums text-red-500 dark:text-red-400">{formatCountdown(remaining)}</p>
      {expired ? (
        <button onClick={onRetry} className="btn-primary mt-6 w-full">Qayta urinish</button>
      ) : (
        <button onClick={onBack} className="btn-ghost mt-6 w-full">Ro'yxatga qaytish</button>
      )}
    </div>
  )
}

function StagePlayer({ stage, onBack, onNextStage }: { stage: Stage; onBack: () => void; onNextStage: (next: Stage) => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [lives, setLives] = useState(QUEST_LIVES)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; correctOption: number; selectedOption: number; points: number; lockInfo: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stageDone, setStageDone] = useState<{ completed: boolean; bonus: number } | null>(null)
  const [pointToast, setPointToast] = useState<{ points: number; key: number } | null>(null)

  const loadQuestions = async () => {
    setLoading(true)
    setFeedback(null)
    const res = await callMiniApi<{ questions: Question[]; lives_remaining?: number; locked?: boolean; locked_until?: string }>('/quest/questions', { stage_id: stage.id })
    if (res.ok) {
      if (res.locked && res.locked_until) {
        setLockedUntil(res.locked_until)
        setQuestions([])
      } else {
        setLockedUntil(null)
        setLives(res.lives_remaining ?? QUEST_LIVES)
        setQuestions(res.questions)
        const firstUnanswered = res.questions.findIndex((q) => !q.answer)
        setIndex(firstUnanswered === -1 ? res.questions.length : firstUnanswered)
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadQuestions() }, [stage.id])

  useEffect(() => {
    if (!pointToast) return
    const t = setTimeout(() => setPointToast(null), 1300)
    return () => clearTimeout(t)
  }, [pointToast])

  const current = questions[index]

  const handleAnswer = async (optionIndex: number) => {
    if (!current || submitting) return
    setSubmitting(true)
    const res = await callMiniApi<{
      correct: boolean; correct_option: number; points_awarded: number; stage_completed: boolean; bonus_awarded: number
      lives_remaining?: number; locked?: boolean; locked_until?: string
    }>('/quest/answer', { question_id: current.id, selected_option: optionIndex })
    setSubmitting(false)
    if (!res.ok) return
    setFeedback({ correct: res.correct, correctOption: res.correct_option, selectedOption: optionIndex, points: res.points_awarded, lockInfo: res.locked && res.locked_until ? res.locked_until : null })
    if (typeof res.lives_remaining === 'number') setLives(res.lives_remaining)
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

      {lockedUntil ? (
        <LockedScreen lockedUntil={lockedUntil} onBack={onBack} onRetry={loadQuestions} />
      ) : stageDone || index >= questions.length ? (
        <StageCelebration stage={stage} bonus={stageDone?.bonus || 0} onBack={onBack} onNextStage={onNextStage} />
      ) : current ? (
        <div className="card relative overflow-hidden p-5">
          {pointToast && <PointToast points={pointToast.points} toastKey={pointToast.key} />}
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-400">{index + 1} / {questions.length}</p>
            <Hearts lives={lives} />
          </div>
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
            <div className="animate-fade-in mt-4">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${feedback.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {feedback.correct ? `✅ To'g'ri! +${feedback.points} ball` : "❌ Noto'g'ri javob"}
                </p>
                {!feedback.lockInfo && <button onClick={next} className="btn-primary">Keyingisi</button>}
              </div>
              {feedback.lockInfo && (
                <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  <p className="font-semibold">💔 Jonlar tugadi! Bosqich 3 soatga bloklandi.</p>
                  <button onClick={() => setLockedUntil(feedback.lockInfo)} className="btn-primary mt-3 w-full">Tushunarli</button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
