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
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
const oneOf = (value: unknown, variants: string[]) => variants.some(v => norm(v) === norm(value));
const containsAny = (value: string, variants: string[]) => variants.some(v => value.includes(norm(v)));
const hasDate = (value: unknown) => {
  const v = norm(value);
  return ["2026 11 19","19 11 2026","19 ноября 2026","19 ноября 2026 года","19 ноября","19 ноя","19 11","19 11 26","19 11 2026 года","19 november 2026","november 19 2026","november 19","nov 19 2026","nov 19","11 19 2026","2026 11 19 года"].includes(v);
};
const validPlatforms = (value: unknown) => {
  const v = norm(value);
  const ps = containsAny(v, ["ps5","playstation 5","play station 5","плейстейшен 5","плейстейшн 5","пс5","пс 5","сонька 5"]);
  const xbox = containsAny(v, ["xbox","x box","иксбокс","икс бокс"]);
  const series = containsAny(v, ["series x","series s","series xs","series x s","series one x","series one s","series one x s","серия x","серия s","серия икс","серия эс","икс s","x s","x|s","x s","x и s","x или s"]);
  return ps && xbox && series;
};
const validYandexUrl = (value: unknown) => {
  try {
    const u = new URL(String(value ?? "").trim());
    return u.protocol === "https:" && ["yandex.ru","yandex.com","yandex.by","yandex.kz","yandex.uz"].some(host => u.hostname === host || u.hostname.endsWith("." + host));
  } catch { return false; }
};

function officialRockstarUrl(value: unknown) {
  try {
    const u = new URL(String(value ?? "").trim());
    return ["rockstargames.com", "www.rockstargames.com"].includes(u.hostname.toLowerCase())
      && u.protocol === "https:"
      && (u.pathname.toLowerCase().includes("/newswire") || u.pathname.toLowerCase() === "/vi" || u.pathname.toLowerCase() === "/vi/");
  } catch { return false; }
}

function validStage(stage: number, a: Record<string, unknown>) {
  // Этап 1 — герои и вымышленный мир.
  if (stage === 1) {
    return oneOf(a.jason, ["Jason","Jason Duval","Джейсон","Джейсон Дюваль","Джэйсон"])
      && oneOf(a.lucia, ["Lucia","Lucia Caminos","Лусия","Люсия","Люсиа","Лусия Каминос"])
      && oneOf(a.state, ["Leonida","Леонида","Леонидия"])
      && oneOf(a.city, ["Vice City","ViceCity","Вайс Сити","Вайс-Сити","Вайссити"]);
  }
  // Этап 2 — дата, платформы и обе ссылки.
  if (stage === 2) {
    return hasDate(a.date) && validPlatforms(a.platforms)
      && officialRockstarUrl(a.official_link) && validYandexUrl(a.yandex_link);
  }
  // Этап 3 — три названия на карте Леониды. Раньше здесь ошибочно
  // проверялись ответы от этапа 4/5, поэтому правильные названия не засчитывались.
  if (stage === 3) {
    return oneOf(a.location_one, ["Port Gellhorn","Порт Геллхорн","Порт Геллхорн"])
      && oneOf(a.location_two, ["Ambrosia","Амброзия"])
      && oneOf(a.location_three, ["Grassrivers","Грассриверс","Грасс Риверс"]);
  }
  // Этап 4 — реальные прототипы.
  if (stage === 4) {
    return oneOf(a.real_city, ["Miami","Майами","Маями"])
      && oneOf(a.real_state, ["Florida","Флорида","штат Флорида"]);
  }
  // Этап 5 — название игры, разработчик и издатель.
  if (stage === 5) {
    return oneOf(a.game_title, ["Grand Theft Auto VI","Grand Theft Auto 6","GTA VI","GTA 6","ГТА 6","ГТА VI","Гранд Тефт Авто 6","Гранд Тефт Авто VI"])
      && oneOf(a.developer, ["Rockstar North","Рокстар Норт"])
      && oneOf(a.publisher, ["Take-Two","Take Two","TakeTwo","Take-Two Interactive","Take Two Interactive","TakeTwo Interactive","Take-Two Interactive Software","Take Two Interactive Software","TakeTwo Interactive Software","Тейк Ту","Тейк-Ту","Тейк ту интерактив"]);
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
  if (![1, 2, 3, 4, 5].includes(stage)) return reply({ error: "Неизвестный этап." }, 400);

  if (!progress) {
    const created = await admin.from("tc_event_progress")
      .insert({ event_id: event.id, user_id: user.id, stage: 0, answers: {} })
      .select("id,stage,answers,completed_at,awarded_at").single();
    if (created.error) return reply({ error: "Не удалось создать прогресс: " + created.error.message }, 500);
    progress = created.data;
  }

  if (stage <= Number(progress.stage)) {
    if (stage === 5 && progress.completed_at) {
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
  const finished = stage === 5;
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
