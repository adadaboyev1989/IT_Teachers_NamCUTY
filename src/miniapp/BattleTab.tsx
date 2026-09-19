import { useEffect, useRef, useState } from 'react'
import { Swords, Users, Loader2, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { callMiniApi } from './lib/api'
import { Confetti, PointToast } from './lib/effects'
import type { Profile } from './MiniApp'
import type { RealtimeChannel } from '@supabase/supabase-js'

type OnlineTeacher = { pedagog_data_id: string; full_name: string; school: string }
type IncomingChallenge = { from_id: string; from_name: string }
type RoundQuestion = { id: string; question: string; options: string[] }
type MatchResult = {
  finished: true
  winner_id: string | null
  win_points?: number
  draw_points?: number
  player1?: { id: string; correct: number }
  player2?: { id: string; correct: number }
}

type Phase = 'lobby' | 'incoming' | 'waiting' | 'in-match' | 'finished'

export function BattleTab({ profile, onPointsChanged }: { profile: Profile; onPointsChanged: () => void }) {
  const [online, setOnline] = useState<OnlineTeacher[]>([])
  const [phase, setPhase] = useState<Phase>('lobby')
  const [incoming, setIncoming] = useState<IncomingChallenge | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [result, setResult] = useState<MatchResult | null>(null)
  const myChannelRef = useRef<RealtimeChannel | null>(null)

  // Presence: announce ourselves as online and see who else is, plus a
  // personal channel (keyed by our own pedagog_data_id) for incoming
  // challenge/match invitations. Both are lightweight Realtime primitives —
  // no database writes involved, so no RLS concerns here.
  useEffect(() => {
    const presenceChannel = supabase.channel('online-teachers', { config: { presence: { key: profile.pedagog_data_id } } })
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<OnlineTeacher>()
        const list = Object.values(state)
          .flat()
          .filter((p) => p.pedagog_data_id !== profile.pedagog_data_id)
        setOnline(list)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ pedagog_data_id: profile.pedagog_data_id, full_name: profile.full_name, school: profile.school })
        }
      })

    const myChannel = supabase.channel(`challenge-${profile.pedagog_data_id}`)
    myChannel
      .on('broadcast', { event: 'challenge' }, ({ payload }) => {
        setIncoming(payload as IncomingChallenge)
        setPhase('incoming')
      })
      .on('broadcast', { event: 'matched' }, ({ payload }) => {
        setMatchId((payload as { match_id: string }).match_id)
        setPhase('in-match')
      })
      .subscribe()
    myChannelRef.current = myChannel

    return () => {
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(myChannel)
    }
  }, [profile.pedagog_data_id, profile.full_name, profile.school])

  const sendChallenge = async (opponent: OnlineTeacher) => {
    const ch = supabase.channel(`challenge-${opponent.pedagog_data_id}`)
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.send({ type: 'broadcast', event: 'challenge', payload: { from_id: profile.pedagog_data_id, from_name: profile.full_name } })
        setTimeout(() => supabase.removeChannel(ch), 2000)
      }
    })
    setPhase('waiting')
  }

  const acceptChallenge = async () => {
    if (!incoming) return
    const res = await callMiniApi<{ match_id: string }>('/battle/create', { opponent_id: incoming.from_id })
    if (!res.ok) { setPhase('lobby'); return }

    const ch = supabase.channel(`challenge-${incoming.from_id}`)
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.send({ type: 'broadcast', event: 'matched', payload: { match_id: res.match_id } })
        setTimeout(() => supabase.removeChannel(ch), 2000)
      }
    })
    setMatchId(res.match_id)
    setPhase('in-match')
  }

  const declineChallenge = () => {
    setIncoming(null)
    setPhase('lobby')
  }

  const handleMatchFinished = (res: MatchResult) => {
    setResult(res)
    setPhase('finished')
    onPointsChanged()
  }

  if (phase === 'finished' && result) {
    return (
      <MatchResultCard
        result={result}
        myId={profile.pedagog_data_id}
        onBack={() => { setPhase('lobby'); setResult(null); setMatchId(null) }}
      />
    )
  }

  if (phase === 'in-match' && matchId) {
    return <MatchView matchId={matchId} onFinished={handleMatchFinished} />
  }

  if (phase === 'incoming' && incoming) {
    return (
      <div className="card p-8 text-center">
        <Swords className="mx-auto h-10 w-10 text-primary-600" />
        <p className="mt-3 font-display text-lg font-bold text-neutral-900">{incoming.from_name} sizni battle'ga chaqirmoqda!</p>
        <div className="mt-5 flex justify-center gap-3">
          <button onClick={declineChallenge} className="btn-ghost">Rad etish</button>
          <button onClick={acceptChallenge} className="btn-primary">Qabul qilish</button>
        </div>
      </div>
    )
  }

  if (phase === 'waiting') {
    return (
      <div className="card p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
        <p className="mt-3 text-sm text-neutral-500">Qarshi tomon javobini kutmoqdamiz...</p>
        <button onClick={() => setPhase('lobby')} className="btn-ghost mt-4">Bekor qilish</button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary-600" />
        <h2 className="font-display text-lg font-bold text-neutral-900">Onlayn o'qituvchilar</h2>
      </div>
      {online.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-surface py-16 text-center text-sm text-neutral-400">Hozircha hech kim onlayn emas</div>
      ) : (
        <div className="space-y-2">
          {online.map((t) => (
            <div key={t.pedagog_data_id} className="card flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{t.full_name}</p>
                  <p className="text-xs text-neutral-400">{t.school}</p>
                </div>
              </div>
              <button onClick={() => sendChallenge(t)} className="btn-primary !px-3 !py-1.5 text-xs"><Swords className="h-3.5 w-3.5" />Chaqirish</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MatchResultCard({ result, myId, onBack }: { result: MatchResult; myId: string; onBack: () => void }) {
  const won = result.winner_id === myId
  const draw = !result.winner_id
  const earned = draw ? result.draw_points || 0 : won ? result.win_points || 0 : 0

  return (
    <div className="card relative p-8 text-center">
      {won && <Confetti />}
      <div className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
        won ? 'animate-pop-in bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30' : draw ? 'bg-primary-50 dark:bg-primary-500/15' : 'bg-neutral-100'
      }`}>
        <Trophy className={`h-9 w-9 ${won ? 'text-white' : draw ? 'text-primary-500 dark:text-primary-400' : 'text-neutral-400'}`} />
      </div>
      <p className="mt-4 font-display text-xl font-bold text-neutral-900">{draw ? 'Durang!' : won ? "🎉 G'alaba!" : 'Mag\'lubiyat'}</p>
      {earned > 0 && (
        <p className="animate-fade-in mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{earned} ball {draw ? '(durang uchun)' : "(g'alaba uchun)"}</p>
      )}
      <button onClick={onBack} className="btn-primary mt-5 w-full">Lobiga qaytish</button>
    </div>
  )
}

function MatchView({ matchId, onFinished }: { matchId: string; onFinished: (res: MatchResult) => void }) {
  const [question, setQuestion] = useState<RoundQuestion | null>(null)
  const [roundId, setRoundId] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; correctOption: number; selected: number } | null>(null)
  const [pointToast, setPointToast] = useState<{ points: number; key: number } | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchNextRound = async () => {
    const res = await callMiniApi<{ round_id?: string; question?: RoundQuestion; finished?: boolean; winner_id?: string | null; win_points?: number; draw_points?: number; player1?: { id: string; correct: number }; player2?: { id: string; correct: number } }>('/battle/next-round', { match_id: matchId })
    if (!res.ok) return

    if (res.finished) {
      onFinished({ finished: true, winner_id: res.winner_id ?? null, win_points: res.win_points, draw_points: res.draw_points, player1: res.player1, player2: res.player2 })
      return
    }

    if (res.round_id && res.round_id !== roundId) {
      setRoundId(res.round_id)
      setQuestion(res.question || null)
      setAnswered(false)
      setFeedback(null)
      setPointToast(null)
    } else if (res.round_id === roundId && answered) {
      // Same round, we've already answered — keep polling until the
      // opponent answers too and the server hands us the next round.
      pollRef.current = setTimeout(fetchNextRound, 1500)
    }
  }

  useEffect(() => {
    fetchNextRound()
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  useEffect(() => {
    if (!pointToast) return
    const t = setTimeout(() => setPointToast(null), 1300)
    return () => clearTimeout(t)
  }, [pointToast])

  const handleAnswer = async (optionIndex: number) => {
    if (!roundId || answered) return
    setAnswered(true)
    const res = await callMiniApi<{ correct: boolean; correct_option: number; points_awarded?: number }>('/battle/answer', { round_id: roundId, selected_option: optionIndex })
    if (res.ok) {
      setFeedback({ correct: res.correct, correctOption: res.correct_option, selected: optionIndex })
      if (res.correct && res.points_awarded) setPointToast({ points: res.points_awarded, key: Date.now() })
    }
    pollRef.current = setTimeout(fetchNextRound, 1500)
  }

  if (!question) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
  }

  return (
    <div className="card relative p-5">
      {pointToast && <PointToast points={pointToast.points} toastKey={pointToast.key} />}
      <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary-600"><Swords className="h-4 w-4" />Battle</p>
      <p className="mb-4 text-base font-semibold text-neutral-900">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isCorrect = feedback && i === feedback.correctOption
          const isWrong = feedback && !feedback.correct && i === feedback.selected
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => handleAnswer(i)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400' : isWrong ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-400' : 'border-neutral-200 bg-surface hover:border-primary-300 disabled:opacity-60'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {answered && (
        <p className="mt-4 text-center text-sm text-neutral-400">
          {feedback ? (feedback.correct ? "✅ To'g'ri!" : "❌ Noto'g'ri") : ''} Qarshi tomonni kutmoqdamiz...
        </p>
      )}
    </div>
  )
}
