import { useEffect, useState } from 'react'
import { Lock, CheckCircle2, Play, Clock, ArrowLeft } from 'lucide-react'
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

function StagePlayer({ stage, onBack }: { stage: Stage; onBack: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<{ correct: boolean; correctOption: number; selectedOption: number; points: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stageDone, setStageDone] = useState<{ completed: boolean; bonus: number } | null>(null)

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
        <div className="card p-8 text-center">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 font-display text-lg font-bold text-neutral-900">Bosqich yakunlandi!</p>
          {stageDone && stageDone.bonus > 0 && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">+{stageDone.bonus} bonus ball</p>}
        </div>
      ) : current ? (
        <div className="card p-5">
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
            <div className="mt-4 flex items-center justify-between">
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
