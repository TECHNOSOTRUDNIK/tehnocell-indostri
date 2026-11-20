import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase()
  .replace(/ё/g, "е").replace(/\s+/g, " ").replace(/[—–]/g, "-");

function officialRockstarUrl(value: unknown) {
  try {
    const u = new URL(String(value ?? "").trim());
    return ["rockstargames.com", "www.rockstargames.com"].includes(u.hostname.toLowerCase())
      && u.protocol === "https:"
      && (u.pathname.toLowerCase().includes("/newswire") || u.pathname.toLowerCase() === "/vi" || u.pathname.toLowerCase() === "/vi/");
  } catch { return false; }
}

function validStage(stage: number, a: Record<string, unknown>) {
  if (stage === 1) {
    return norm(a.jason) === "jason"
      && norm(a.lucia) === "lucia"
      && norm(a.state) === "leonida"
      && norm(a.city) === "vice city";
  }
  if (stage === 2) {
    const date = norm(a.date).replace(/[.\/]/g, "-");
    const dateOk = ["2026-11-19", "19-11-2026", "19 ноября 2026", "19 november 2026"].includes(date);
    const platforms = norm(a.platforms);
    const platformOk = platforms.includes("ps5")
      && (platforms.includes("xbox series x|s") || platforms.includes("xbox series x s") || platforms.includes("xbox series x and series s") || platforms.includes("xbox series x, series s"));
    return dateOk && platformOk && officialRockstarUrl(a.official_link) && norm(a.yandex_link).startsWith("https://") &&
      (() => { try { const u = new URL(String(a.yandex_link)); return /(^|\.)yandex\.(ru|com|by|kz|uz)$/.test(u.hostname); } catch { return false; } })();
  }
  if (stage === 3) {
    return norm(a.real_city) === "miami"
      && norm(a.real_state) === "florida"
      && ["grand theft auto vi", "gta vi", "gta 6"].includes(norm(a.game_title));
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Метод не поддерживается." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return reply({ error: "Сервер события не настроен: отсутствует служебный ключ." }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return reply({ error: "Войдите в TEHNOCELL ID." }, 401);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return reply({ error: "Сессия недействительна. Перезайдите в аккаунт." }, 401);
  const user = authData.user;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: { action?: string; stage?: number; answers?: Record<string, unknown> };
  try { body = await req.json(); } catch { return reply({ error: "Не удалось прочитать запрос." }, 400); }

  const { data: event, error: eventError } = await admin.from("tc_events")
    .select("id,slug,title,starts_at,ends_at,status")
    .eq("slug", "vice-city").maybeSingle();
  if (eventError || !event) return reply({ error: "Событие пока недоступно." }, 404);

  const now = Date.now();
  const starts = new Date(event.starts_at).getTime();
  const ends = new Date(event.ends_at).getTime();
  const active = event.status === "active" && now >= starts && now < ends;

  let { data: progress } = await admin.from("tc_event_progress")
    .select("id,stage,answers,completed_at,awarded_at")
    .eq("event_id", event.id).eq("user_id", user.id).maybeSingle();

  if (body.action === "status") {
    const { data: frame } = await admin.from("tc_user_frames")
      .select("frame_id,acquired_at,tc_avatar_frames(code,name)")
      .eq("user_id", user.id).limit(20);
    return reply({ ok: true, event, active, progress: progress || { stage: 0, answers: {} }, frames: frame || [] });
  }

  if (body.action !== "submit") return reply({ error: "Неизвестное действие." }, 400);
  if (!active) return reply({ error: "Время этого приключения завершилось. Следите за следующими событиями TEHNOCELL." }, 410);

  const stage = Number(body.stage);
  if (![1, 2, 3].includes(stage)) return reply({ error: "Неизвестный этап." }, 400);

  if (!progress) {
    const created = await admin.from("tc_event_progress")
      .insert({ event_id: event.id, user_id: user.id, stage: 0, answers: {} })
      .select("id,stage,answers,completed_at,awarded_at").single();
    if (created.error) return reply({ error: "Не удалось создать прогресс: " + created.error.message }, 500);
    progress = created.data;
  }

  if (stage <= Number(progress.stage)) {
    if (stage === 3 && progress.completed_at) {
      const { data: frame } = await admin.from("tc_avatar_frames")
        .select("id,code,name").eq("code", "vice-city-limited").single();
      if (!frame) return reply({ error: "Награда временно недоступна." }, 500);
      const { error: grantError } = await admin.from("tc_user_frames").upsert({
        user_id: user.id, frame_id: frame.id, source_event_id: event.id
      }, { onConflict: "user_id,frame_id", ignoreDuplicates: true });
      if (grantError) return reply({ error: "Не удалось сохранить награду: " + grantError.message }, 500);
      const { error: equipError } = await admin.from("profiles")
        .update({ selected_avatar_frame_id: frame.id }).eq("id", user.id);
      if (equipError) return reply({ error: "Рамка получена, но не удалось применить её: " + equipError.message, awarded: true }, 200);
      return reply({ ok: true, stage: progress.stage, completed: true, awarded: true, frame });
    }
    return reply({ ok: true, already_done: true, stage: progress.stage, completed: !!progress.completed_at, awarded: !!progress.awarded_at });
  }
  if (stage !== Number(progress.stage) + 1) return reply({ error: "Сначала завершите предыдущий этап." }, 409);

  const answers = body.answers || {};
  if (!validStage(stage, answers)) return reply({ error: "Пока не всё совпало. Проверьте ответы и источники — Энни подскажет, если нужна помощь." }, 422);

  const allAnswers = { ...(progress.answers || {}), [String(stage)]: answers };
  const finished = stage === 3;
  const update = await admin.from("tc_event_progress").update({
    stage,
    answers: allAnswers,
    updated_at: new Date().toISOString(),
    ...(finished ? { completed_at: new Date().toISOString(), awarded_at: new Date().toISOString() } : {}),
  }).eq("id", progress.id).eq("stage", progress.stage).select("id").maybeSingle();
  if (update.error || !update.data) return reply({ error: "Прогресс изменился одновременно. Обновите окно и попробуйте снова." }, 409);

  if (finished) {
    const { data: frame, error: frameError } = await admin.from("tc_avatar_frames")
      .select("id,code,name").eq("code", "vice-city-limited").single();
    if (frameError || !frame) return reply({ error: "Награда найдена не полностью. Обратитесь в поддержку TEHNOCELL." }, 500);
    const { error: grantError } = await admin.from("tc_user_frames").upsert({
      user_id: user.id, frame_id: frame.id, source_event_id: event.id
    }, { onConflict: "user_id,frame_id", ignoreDuplicates: true });
    if (grantError) return reply({ error: "Не удалось сохранить награду: " + grantError.message }, 500);
    const { error: equipError } = await admin.from("profiles")
      .update({ selected_avatar_frame_id: frame.id }).eq("id", user.id);
    if (equipError) return reply({ error: "Рамка получена, но не удалось автоматически применить её: " + equipError.message, awarded: true }, 200);
    return reply({ ok: true, stage, completed: true, awarded: true, frame });
  }

  return reply({ ok: true, stage, completed: false, awarded: false });
});
