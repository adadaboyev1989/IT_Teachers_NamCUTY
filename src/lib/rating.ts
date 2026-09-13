import type { PedagogData } from '../types'

// Mirrors the scoring formula in supabase/functions/miniapp-data/index.ts
// (buildMiniAppHtml -> calcRating). Keep both in sync if the formula changes
// — there's no shared module between the Vite frontend and the Deno edge
// function to enforce this automatically.
const CATEGORY_SCORES: Record<string, number> = {
  Oliy: 40,
  Birinchi: 30,
  Ikkinchi: 20,
  Mutaxassis: 15,
}

export function calculateRating(p: PedagogData): number {
  let score = CATEGORY_SCORES[p.category] ?? 15
  score += Math.min(p.lesson_hours || 0, 30)
  if (p.certificate_name) score += 15
  if (p.certificate_expiry_date && new Date(p.certificate_expiry_date) > new Date()) score += 15
  return Math.min(score, 100)
}
