import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { verifyTelegramInitData } from "../_shared/verifyInitData.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

// pedagog_data/quest/battle tables are locked down to service-role access
// only (see supabase/migrations), so this trusted server-side function uses
// the service-role key, never the anon key.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

type Pedagog = {
  id: string;
  full_name: string;
  school: string;
  category: string;
  certificate_name: string | null;
  certificate_issue_date: string | null;
  certificate_expiry_date: string | null;
};

// Verifies initData and resolves it to a registered teacher's pedagog_data
// row. This is the one chokepoint every route goes through — nothing here
// ever trusts a client-supplied id for "who am I".
async function resolveTeacher(initData: unknown): Promise<{ pedagog: Pedagog } | { error: string; status: number }> {
  if (typeof initData !== "string") return { error: "initData required", status: 400 };

  const tgUser = await verifyTelegramInitData(initData, BOT_TOKEN);
  if (!tgUser) return { error: "Telegram autentifikatsiyasi muvaffaqiyatsiz", status: 401 };

  const { data: botUser } = await supabase.from("bot_users").select("pedagog_data_id, is_registered").eq("telegram_id", tgUser.id).maybeSingle();
  if (!botUser || !botUser.is_registered || !botUser.pedagog_data_id) {
    return { error: "Ro'yxatdan o'tmagansiz. Iltimos, botda /start bosing.", status: 403 };
  }

  const { data: pedagog } = await supabase
    .from("pedagog_data")
    .select("id, full_name, school, category, certificate_name, certificate_issue_date, certificate_expiry_date")
    .eq("id", botUser.pedagog_data_id)
    .maybeSingle();
  if (!pedagog) return { error: "Pedagog ma'lumotlari topilmadi", status: 404 };

  return { pedagog };
}

async function getSetting(key: string, fallback: number): Promise<number> {
  const { data } = await supabase.from("rating_settings").select("points").eq("key", key).maybeSingle();
  return data?.points ?? fallback;
}

// --- Profile ---

// A certificate counts as "expiring soon" inside this many days of its
// expiry date — the Mini App shows an amber warning in that window, and red
// once it's actually passed, so a teacher notices before it lapses instead
// of finding out after.
const CERTIFICATE_EXPIRY_WARNING_DAYS = 30;

function certificateStatus(expiryDate: string | null): { days_until_expiry: number | null; is_expired: boolean; is_expiring_soon: boolean } {
  if (!expiryDate) return { days_until_expiry: null, is_expired: false, is_expiring_soon: false };
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / msPerDay);
  return { days_until_expiry: days, is_expired: days < 0, is_expiring_soon: days >= 0 && days <= CERTIFICATE_EXPIRY_WARNING_DAYS };
}

async function handleProfile(pedagog: Pedagog) {
  const { data: board } = await supabase.from("leaderboard").select("*").order("total_points", { ascending: false });
  const rank = (board || []).findIndex((r) => r.pedagog_data_id === pedagog.id) + 1;
  const me = (board || []).find((r) => r.pedagog_data_id === pedagog.id);

  return json({
    ok: true,
    profile: {
      pedagog_data_id: pedagog.id,
      full_name: pedagog.full_name,
      school: pedagog.school,
      category: pedagog.category,
      has_certificate: !!pedagog.certificate_name,
      certificate_name: pedagog.certificate_name,
      certificate_issue_date: pedagog.certificate_issue_date,
      certificate_expiry_date: pedagog.certificate_expiry_date,
      certificate_status: certificateStatus(pedagog.certificate_expiry_date),
      category_points: me?.category_points ?? 0,
      certificate_points: me?.certificate_points ?? 0,
      quest_points: me?.quest_points ?? 0,
      battle_points: me?.battle_points ?? 0,
      task_points: me?.task_points ?? 0,
      achievement_points: me?.achievement_points ?? 0,
      total_points: me?.total_points ?? 0,
      rank: rank || null,
      total_teachers: (board || []).length,
    },
  });
}

// --- Quest ---

async function handleQuestStages(pedagog: Pedagog) {
  const { data: stages } = await supabase.from("quest_stages").select("id, title, description, order_index, time_limit_seconds").eq("is_active", true).order("order_index");
  const { data: progress } = await supabase.from("quest_progress").select("stage_id, status, score").eq("pedagog_data_id", pedagog.id);

  const progressByStage = new Map<string, { status: string; score: number }>((progress || []).map((p) => [p.stage_id, p]));
  let previousCompleted = true;

  const result = (stages || []).map((stage) => {
    const p = progressByStage.get(stage.id);
    const status = p?.status || (previousCompleted ? "unlocked" : "locked");
    previousCompleted = p?.status === "completed";
    return { ...stage, status, score: p?.score ?? 0 };
  });

  return json({ ok: true, stages: result });
}

async function handleQuestQuestions(pedagog: Pedagog, stageId: unknown) {
  if (typeof stageId !== "string") return json({ ok: false, error: "stage_id required" }, 400);

  const { data: questions } = await supabase
    .from("quest_questions")
    .select("id, question, options, points, order_index")
    .eq("stage_id", stageId)
    .order("order_index");

  const { data: answered } = await supabase.from("quest_answers").select("question_id, selected_option, is_correct").eq("pedagog_data_id", pedagog.id);
  const answeredMap = new Map((answered || []).map((a) => [a.question_id, a]));

  const result = (questions || []).map((q) => ({ ...q, answer: answeredMap.get(q.id) || null }));
  return json({ ok: true, questions: result });
}

async function handleQuestAnswer(pedagog: Pedagog, questionId: unknown, selectedOption: unknown) {
  if (typeof questionId !== "string" || typeof selectedOption !== "number") {
    return json({ ok: false, error: "question_id va selected_option kerak" }, 400);
  }

  const { data: question } = await supabase.from("quest_questions").select("id, stage_id, correct_option, points").eq("id", questionId).maybeSingle();
  if (!question) return json({ ok: false, error: "Savol topilmadi" }, 404);

  const isCorrect = selectedOption === question.correct_option;

  const { error: insertError } = await supabase.from("quest_answers").insert({
    pedagog_data_id: pedagog.id,
    question_id: questionId,
    selected_option: selectedOption,
    is_correct: isCorrect,
  });
  if (insertError) {
    // 23505 = unique_violation: this question was already answered.
    if (insertError.code === "23505") return json({ ok: false, error: "Bu savolga allaqachon javob berilgan" }, 409);
    console.error("quest_answers insert failed:", insertError.message);
    return json({ ok: false, error: "Xatolik yuz berdi" }, 500);
  }

  let pointsAwarded = 0;
  if (isCorrect) {
    pointsAwarded = question.points;
    await supabase.from("points_history").insert({
      pedagog_data_id: pedagog.id,
      source: "quest_question",
      source_id: question.id,
      points: pointsAwarded,
    });
  }

  // Has every question in this stage now been answered? If so, mark the
  // stage complete and award the one-time completion bonus.
  const { data: allQuestions } = await supabase.from("quest_questions").select("id").eq("stage_id", question.stage_id);
  const { data: allAnswers } = await supabase.from("quest_answers").select("question_id").eq("pedagog_data_id", pedagog.id).in("question_id", (allQuestions || []).map((q) => q.id));

  let stageCompleted = false;
  let bonusAwarded = 0;
  if ((allQuestions || []).length > 0 && (allAnswers || []).length >= (allQuestions || []).length) {
    const { data: existingProgress } = await supabase.from("quest_progress").select("status").eq("pedagog_data_id", pedagog.id).eq("stage_id", question.stage_id).maybeSingle();

    if (existingProgress?.status !== "completed") {
      const { data: correctAnswers } = await supabase
        .from("quest_answers")
        .select("question_id")
        .eq("pedagog_data_id", pedagog.id)
        .eq("is_correct", true)
        .in("question_id", (allQuestions || []).map((q) => q.id));

      const { data: questionsWithPoints } = await supabase.from("quest_questions").select("id, points").in("id", (correctAnswers || []).map((a) => a.question_id));
      const totalScore = (questionsWithPoints || []).reduce((sum, q) => sum + q.points, 0);

      bonusAwarded = await getSetting("quest_stage_bonus", 10);

      await supabase.from("quest_progress").upsert(
        {
          pedagog_data_id: pedagog.id,
          stage_id: question.stage_id,
          status: "completed",
          score: totalScore,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "pedagog_data_id,stage_id" }
      );
      await supabase.from("points_history").insert({
        pedagog_data_id: pedagog.id,
        source: "quest_stage_bonus",
        source_id: question.stage_id,
        points: bonusAwarded,
      });
      stageCompleted = true;
    }
  } else {
    await supabase.from("quest_progress").upsert(
      { pedagog_data_id: pedagog.id, stage_id: question.stage_id, status: "in_progress" },
      { onConflict: "pedagog_data_id,stage_id" }
    );
  }

  return json({ ok: true, correct: isCorrect, correct_option: question.correct_option, points_awarded: pointsAwarded, stage_completed: stageCompleted, bonus_awarded: bonusAwarded });
}

// --- Battle ---

async function handleBattleCreate(pedagog: Pedagog, opponentId: unknown) {
  if (typeof opponentId !== "string" || opponentId === pedagog.id) {
    return json({ ok: false, error: "opponent_id noto'g'ri" }, 400);
  }

  const { data: match, error } = await supabase
    .from("battle_matches")
    .insert({ player1_id: pedagog.id, player2_id: opponentId, status: "active", started_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error || !match) {
    console.error("battle create failed:", error?.message);
    return json({ ok: false, error: "Battle boshlanmadi" }, 500);
  }

  return json({ ok: true, match_id: match.id });
}

async function handleBattleNextRound(pedagog: Pedagog, matchId: unknown) {
  if (typeof matchId !== "string") return json({ ok: false, error: "match_id required" }, 400);

  const { data: match } = await supabase.from("battle_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || (match.player1_id !== pedagog.id && match.player2_id !== pedagog.id)) {
    return json({ ok: false, error: "Match topilmadi" }, 404);
  }
  if (match.status === "finished") {
    return json({ ok: true, finished: true, winner_id: match.winner_id });
  }

  const roundsCount = await getSetting("battle_rounds_count", 5);

  const { data: rounds } = await supabase.from("battle_rounds").select("id, round_index, question_id").eq("match_id", matchId).order("round_index", { ascending: false }).limit(1);
  const lastRound = (rounds || [])[0];

  if (lastRound) {
    const { data: answers } = await supabase.from("battle_answers").select("pedagog_data_id").eq("round_id", lastRound.id);
    const bothAnswered = (answers || []).length >= 2;

    if (!bothAnswered) {
      // Still mid-round — return the same round so both players stay in sync.
      const { data: q } = await supabase.from("battle_questions").select("id, question, options").eq("id", lastRound.question_id).single();
      return json({ ok: true, round_id: lastRound.id, round_index: lastRound.round_index, question: q });
    }

    if (lastRound.round_index + 1 >= roundsCount) {
      return await finishBattleMatch(matchId, match);
    }
  }

  const nextIndex = lastRound ? lastRound.round_index + 1 : 0;
  const { data: usedQuestionIds } = await supabase.from("battle_rounds").select("question_id").eq("match_id", matchId);
  const excludeIds = (usedQuestionIds || []).map((r) => r.question_id);

  let pool = supabase.from("battle_questions").select("id, question, options").eq("is_active", true);
  if (excludeIds.length > 0) pool = pool.not("id", "in", `(${excludeIds.join(",")})`);
  const { data: candidates } = await pool.limit(50);

  if (!candidates || candidates.length === 0) {
    return await finishBattleMatch(matchId, match);
  }
  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  const { data: newRound, error: insertError } = await supabase
    .from("battle_rounds")
    .insert({ match_id: matchId, question_id: picked.id, round_index: nextIndex })
    .select("id, round_index")
    .single();

  if (insertError) {
    // Another concurrent call already created this round (race between both
    // players polling at once) — fetch and return the one that won.
    const { data: existing } = await supabase.from("battle_rounds").select("id, round_index, question_id").eq("match_id", matchId).eq("round_index", nextIndex).single();
    if (existing) {
      const { data: q } = await supabase.from("battle_questions").select("id, question, options").eq("id", existing.question_id).single();
      return json({ ok: true, round_id: existing.id, round_index: existing.round_index, question: q });
    }
    return json({ ok: false, error: "Navbatdagi savolni yaratib bo'lmadi" }, 500);
  }

  return json({ ok: true, round_id: newRound.id, round_index: newRound.round_index, question: { id: picked.id, question: picked.question, options: picked.options } });
}

async function handleBattleAnswer(pedagog: Pedagog, roundId: unknown, selectedOption: unknown) {
  if (typeof roundId !== "string" || typeof selectedOption !== "number") {
    return json({ ok: false, error: "round_id va selected_option kerak" }, 400);
  }

  const { data: round } = await supabase.from("battle_rounds").select("id, question_id, created_at, match_id").eq("id", roundId).maybeSingle();
  if (!round) return json({ ok: false, error: "Round topilmadi" }, 404);

  const { data: match } = await supabase.from("battle_matches").select("player1_id, player2_id").eq("id", round.match_id).maybeSingle();
  if (!match || (match.player1_id !== pedagog.id && match.player2_id !== pedagog.id)) {
    return json({ ok: false, error: "Bu battle sizga tegishli emas" }, 403);
  }

  const { data: question } = await supabase.from("battle_questions").select("correct_option").eq("id", round.question_id).single();
  const isCorrect = selectedOption === question?.correct_option;
  const responseMs = Date.now() - new Date(round.created_at).getTime();

  const { error: insertError } = await supabase.from("battle_answers").insert({
    round_id: roundId,
    pedagog_data_id: pedagog.id,
    selected_option: selectedOption,
    is_correct: isCorrect,
    response_ms: Math.max(0, responseMs),
  });
  if (insertError) {
    if (insertError.code === "23505") return json({ ok: false, error: "Bu savolga allaqachon javob berilgan" }, 409);
    console.error("battle_answers insert failed:", insertError.message);
    return json({ ok: false, error: "Xatolik yuz berdi" }, 500);
  }

  let pointsAwarded = 0;
  if (isCorrect) {
    pointsAwarded = await getSetting("battle_correct_answer", 5);
    await supabase.from("points_history").insert({ pedagog_data_id: pedagog.id, source: "battle_correct_answer", source_id: roundId, points: pointsAwarded });
  }

  return json({ ok: true, correct: isCorrect, correct_option: question?.correct_option, points_awarded: pointsAwarded });
}

async function finishBattleMatch(matchId: string, match: { player1_id: string; player2_id: string }) {
  const { data: rounds } = await supabase.from("battle_rounds").select("id").eq("match_id", matchId);
  const roundIds = (rounds || []).map((r) => r.id);

  const { data: answers } = await supabase.from("battle_answers").select("pedagog_data_id, is_correct, response_ms").in("round_id", roundIds.length ? roundIds : ["00000000-0000-0000-0000-000000000000"]);

  const tally = (pid: string) => {
    const mine = (answers || []).filter((a) => a.pedagog_data_id === pid);
    const correct = mine.filter((a) => a.is_correct).length;
    const totalMs = mine.reduce((sum, a) => sum + a.response_ms, 0);
    return { correct, totalMs };
  };

  const p1 = tally(match.player1_id);
  const p2 = tally(match.player2_id);

  let winnerId: string | null = null;
  if (p1.correct !== p2.correct) {
    winnerId = p1.correct > p2.correct ? match.player1_id : match.player2_id;
  } else if (p1.totalMs !== p2.totalMs) {
    winnerId = p1.totalMs < p2.totalMs ? match.player1_id : match.player2_id;
  }

  await supabase.from("battle_matches").update({ status: "finished", winner_id: winnerId, finished_at: new Date().toISOString() }).eq("id", matchId);

  let winPoints = 0;
  let drawPoints = 0;
  if (winnerId) {
    winPoints = await getSetting("battle_win", 15);
    await supabase.from("points_history").insert({ pedagog_data_id: winnerId, source: "battle_win", source_id: matchId, points: winPoints });
  } else {
    drawPoints = await getSetting("battle_draw", 5);
    await supabase.from("points_history").insert([
      { pedagog_data_id: match.player1_id, source: "battle_draw", source_id: matchId, points: drawPoints },
      { pedagog_data_id: match.player2_id, source: "battle_draw", source_id: matchId, points: drawPoints },
    ]);
  }

  return json({
    ok: true,
    finished: true,
    winner_id: winnerId,
    win_points: winPoints,
    draw_points: drawPoints,
    player1: { id: match.player1_id, ...p1 },
    player2: { id: match.player2_id, ...p2 },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "POST required" }, 405);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/miniapp-api/, "").replace(/\/$/, "") || "/";

  const body = await req.json().catch(() => ({}));
  const resolved = await resolveTeacher(body.initData);
  if ("error" in resolved) return json({ ok: false, error: resolved.error }, resolved.status);
  const { pedagog } = resolved;

  switch (path) {
    case "/profile":
      return await handleProfile(pedagog);
    case "/quest/stages":
      return await handleQuestStages(pedagog);
    case "/quest/questions":
      return await handleQuestQuestions(pedagog, body.stage_id);
    case "/quest/answer":
      return await handleQuestAnswer(pedagog, body.question_id, body.selected_option);
    case "/battle/create":
      return await handleBattleCreate(pedagog, body.opponent_id);
    case "/battle/next-round":
      return await handleBattleNextRound(pedagog, body.match_id);
    case "/battle/answer":
      return await handleBattleAnswer(pedagog, body.round_id, body.selected_option);
    default:
      return json({ ok: false, error: `Unknown route: ${path}` }, 404);
  }
});
