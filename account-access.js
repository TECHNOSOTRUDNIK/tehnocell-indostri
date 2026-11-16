(() => {
  const URL = "https://jvagiuiregvlrfooxdao.supabase.co";
  const KEY = "sb_publishable_BIv_yX4jprXgeEpauZyjtA_lr0Weo8X";
  async function run() {
    if (!window.supabase) return;
    const db = window.supabase.createClient(URL, KEY);
    const { data } = await db.auth.getSession();
    const user = data?.session?.user;
    if (!user) return;
    const { data: blocks, error } = await db.from("support_account_blocks")
      .select("id,reason,expires_at,blocked_at").eq("user_id", user.id)
      .is("unblocked_at", null).order("blocked_at", { ascending: false }).limit(10);
    if (error) return;
    const now = Date.now();
    const block = (blocks || []).find(x => !x.expires_at || new Date(x.expires_at).getTime() > now);
    if (!block) return;
    const cover = document.createElement("div");
    cover.style.cssText = "position:fixed;inset:0;z-index:2147483000;overflow:auto;background:#090909;color:#fff;font:14px Arial;padding:24px;display:grid;place-items:center";
    const card = document.createElement("section");
    card.style.cssText = "width:min(100%,540px);padding:28px;border:1px solid #444;border-radius:20px;background:#151515";
    const title = document.createElement("h1"); title.textContent = "Аккаунт временно ограничен";
    const desc = document.createElement("p"); desc.textContent = "Доступ к функциям TEHNOCELL приостановлен. Вы можете подать обжалование.";
    const reason = document.createElement("p"); reason.textContent = "Причина: " + block.reason;
    const expiry = document.createElement("p"); expiry.textContent = block.expires_at ? "Срок до: " + new Date(block.expires_at).toLocaleString("ru-RU") : "Срок: бессрочно";
    const status = document.createElement("p");
    const form = document.createElement("form");
    const input = document.createElement("textarea"); input.required = true; input.minLength = 10; input.maxLength = 3000; input.placeholder = "Объясните, почему блокировку стоит пересмотреть"; input.style.cssText = "width:100%;min-height:130px;padding:12px;background:#090909;color:#fff;border:1px solid #555;border-radius:10px;box-sizing:border-box";
    const button = document.createElement("button"); button.type = "submit"; button.textContent = "Подать обжалование"; button.style.cssText = "width:100%;padding:14px;margin-top:12px;background:#fff;color:#111;border:0;border-radius:10px;font-weight:bold";
    form.append(input, button);
    const { data: appeals } = await db.from("support_appeals").select("id,status").eq("block_id", block.id).eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(5);
    if ((appeals || []).some(a => a.status === "pending")) { status.textContent = "Обжалование отправлено и ожидает рассмотрения."; form.hidden = true; }
    else if (appeals?.[0]?.status === "rejected") status.textContent = "Предыдущее обжалование отклонено. Вы можете подать новое.";
    form.addEventListener("submit", async e => {
      e.preventDefault(); button.disabled = true;
      const result = await db.from("support_appeals").insert({ block_id: block.id, user_id: user.id, message: input.value.trim() });
      button.disabled = false;
      status.textContent = result.error ? "Не удалось отправить: " + result.error.message : "Обжалование отправлено. Ожидайте решения главного администратора.";
      if (!result.error) form.hidden = true;
    });
    card.append(title, desc, reason, expiry, status, form);
    cover.append(card); document.body.append(cover); document.documentElement.style.overflow = "hidden";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true }); else run();
})();