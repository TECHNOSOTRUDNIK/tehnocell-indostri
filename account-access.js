(() => {
  const URL = "https://jvagiuiregvlrfooxdao.supabase.co";
  const KEY = "sb_publishable_BIv_yX4jprXgeEpauZyjtA_lr0Weo8X";
  let db = null;
  let busy = false;

  function addStyles() {
    if (document.getElementById("tc-suspension-styles")) return;
    const style = document.createElement("style");
    style.id = "tc-suspension-styles";
    style.textContent = `
      #tcAccountSuspension{position:fixed;inset:0;z-index:2147483000;overflow:auto;background:radial-gradient(ellipse at 50% -20%,#292929 0%,#101010 48%,#050505 100%);color:#f7f7f7;font:14px Inter,Arial,sans-serif;padding:22px;display:grid;place-items:center;box-sizing:border-box}
      #tcAccountSuspension *{box-sizing:border-box}
      #tcAccountSuspension .tc-shell{width:min(100%,520px);margin:auto}
      #tcAccountSuspension .tc-brand{display:flex;align-items:center;gap:10px;margin:0 0 17px 3px;color:#aaa;font-size:10px;font-weight:800;letter-spacing:2px}
      #tcAccountSuspension .tc-mark{width:34px;height:34px;display:grid;place-items:center;border:1px solid #555;border-radius:11px;background:linear-gradient(145deg,#252525,#101010);color:#fff;font-size:17px}
      #tcAccountSuspension .tc-card{position:relative;padding:clamp(21px,5vw,32px);border:1px solid #414141;border-radius:23px;background:linear-gradient(145deg,#1b1b1b,#101010);box-shadow:0 28px 90px #000b;overflow:hidden}
      #tcAccountSuspension .tc-card:before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#eee,transparent);opacity:.65}
      #tcAccountSuspension .tc-symbol{width:52px;height:52px;display:grid;place-items:center;border:1px solid #666;border-radius:17px;background:#202020;color:#fff;font-size:23px;margin-bottom:20px}
      #tcAccountSuspension .tc-kicker{font-size:9px;letter-spacing:2px;color:#aaa;font-weight:800;margin-bottom:9px}
      #tcAccountSuspension h1{font-size:clamp(23px,6vw,30px);line-height:1.12;letter-spacing:-.7px;margin:0 0 10px;color:#fff}
      #tcAccountSuspension .tc-intro{margin:0 0 21px;color:#aaa;font-size:13px;line-height:1.6}
      #tcAccountSuspension .tc-state{display:inline-flex;align-items:center;gap:8px;border:1px solid #5a4545;border-radius:999px;padding:7px 10px;background:#211818;color:#e6caca;font-size:10px;font-weight:700;margin-bottom:18px}
      #tcAccountSuspension .tc-state i{width:7px;height:7px;border-radius:50%;background:#d68b8b;box-shadow:0 0 10px #d68b8b66}
      #tcAccountSuspension .tc-info{padding:13px 14px;border:1px solid #343434;border-radius:13px;background:#0b0b0b;margin:10px 0}
      #tcAccountSuspension .tc-label{font-size:9px;letter-spacing:1.4px;color:#888;font-weight:800;margin-bottom:7px}
      #tcAccountSuspension .tc-value{font-size:12px;line-height:1.6;color:#eee;overflow-wrap:anywhere;white-space:pre-wrap}
      #tcAccountSuspension .tc-form{margin-top:21px}
      #tcAccountSuspension .tc-form-title{font-size:14px;font-weight:750;margin:0 0 7px}
      #tcAccountSuspension .tc-form-hint{font-size:11px;color:#888;line-height:1.5;margin:0 0 11px}
      #tcAccountSuspension textarea{display:block;width:100%;min-height:125px;resize:vertical;padding:13px;border:1px solid #444;border-radius:12px;background:#080808;color:#fff;font:13px/1.5 Inter,Arial,sans-serif;outline:none}
      #tcAccountSuspension textarea:focus{border-color:#aaa;box-shadow:0 0 0 3px #fff1}
      #tcAccountSuspension button{width:100%;min-height:47px;margin-top:11px;padding:12px 16px;border:1px solid #eee;border-radius:12px;background:#f2f2f2;color:#111;font-size:12px;font-weight:800;cursor:pointer}
      #tcAccountSuspension button:disabled{opacity:.55;cursor:wait}
      #tcAccountSuspension .tc-message{padding:12px 13px;border:1px solid #484848;border-radius:11px;background:#171717;color:#ddd;font-size:11px;line-height:1.55;margin-top:14px}
      #tcAccountSuspension .tc-footer{margin:15px 4px 0;color:#666;font-size:9px;line-height:1.6;text-align:center;letter-spacing:.3px}
      @media(max-width:420px){#tcAccountSuspension{padding:13px}#tcAccountSuspension .tc-card{border-radius:18px}#tcAccountSuspension .tc-brand{margin-bottom:12px}}
    `;
    document.head.append(style);
  }

  function node(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }

  async function run() {
    if (busy || !window.supabase) return;
    // On the platform page, wait for its primary auth bootstrap and reuse its client.
    // A second Supabase client can contend for the same persisted session lock.
    const isPlatform = /\/platform\.html$/.test(location.pathname);
    if (isPlatform && window.__tcPlatformAuthReady !== true) return;
    busy = true;
    try {
      if (!db) db = window.__tcPlatformDb || window.supabase.createClient(URL, KEY);
      const user = isPlatform ? window.__tcPlatformUser : (await db.auth.getSession()).data?.session?.user;
      const old = document.getElementById("tcAccountSuspension");
      if (!user) {
        old?.remove();
        document.documentElement.style.overflow = "";
        return;
      }
      const { data: blocks, error } = await db.from("support_account_blocks")
        .select("id,reason,expires_at,blocked_at").eq("user_id", user.id)
        .is("unblocked_at", null).order("blocked_at", { ascending: false }).limit(10);
      if (error) return;
      const now = Date.now();
      const block = (blocks || []).find(x => !x.expires_at || new Date(x.expires_at).getTime() > now);
      if (!block) {
        old?.remove();
        document.documentElement.style.overflow = "";
        return;
      }
      if (old) return;

      addStyles();
      const cover = node("div");
      cover.id = "tcAccountSuspension";
      const shell = node("div", "tc-shell");
      const brand = node("div", "tc-brand");
      brand.append(node("span", "tc-mark", "T"), node("span", "", "TEHNOCELL  /  ACCOUNT STATUS"));
      const card = node("section", "tc-card");
      const symbol = node("div", "tc-symbol", "◈");
      const kicker = node("div", "tc-kicker", "СИСТЕМА БЕЗОПАСНОСТИ");
      const title = node("h1", "", "Аккаунт временно ограничен");
      const desc = node("p", "tc-intro", "Доступ к функциям TEHNOCELL приостановлен. Вы можете ознакомиться с причиной и отправить обращение на пересмотр решения.");
      const badge = node("div", "tc-state");
      badge.append(node("i"), node("span", "", "ДЕЙСТВУЕТ ОГРАНИЧЕНИЕ"));
      const reasonBox = node("div", "tc-info");
      reasonBox.append(node("div", "tc-label", "ПРИЧИНА ОГРАНИЧЕНИЯ"), node("div", "tc-value", block.reason || "Причина не указана"));
      const expiryBox = node("div", "tc-info");
      expiryBox.append(node("div", "tc-label", "СРОК ДЕЙСТВИЯ"), node("div", "tc-value", block.expires_at ? new Date(block.expires_at).toLocaleString("ru-RU") : "Бессрочно"));
      const status = node("div", "tc-message");
      const form = node("form", "tc-form");
      form.append(node("h2", "tc-form-title", "Обжаловать блокировку"), node("p", "tc-form-hint", "Опишите ситуацию спокойно и подробно. Обращение рассмотрит главный администратор."));
      const input = node("textarea");
      input.required = true; input.minLength = 10; input.maxLength = 3000;
      input.placeholder = "Ваше сообщение...";
      const button = node("button", "", "Отправить обжалование");
      button.type = "submit";
      form.append(input, button);
      const footer = node("div", "tc-footer", "TEHNOCELL INDOSTRI · ДОСТУП К ОБЫЧНЫМ ФУНКЦИЯМ ВРЕМЕННО ЗАКРЫТ");
      const { data: appeals } = await db.from("support_appeals").select("id,status,decision_reason")
        .eq("block_id", block.id).eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(5);
      if ((appeals || []).some(a => a.status === "pending")) {
        status.textContent = "Обжалование уже отправлено и ожидает рассмотрения. Повторно отправлять его не нужно.";
        form.hidden = true;
      } else if (appeals?.[0]?.status === "rejected") {
        status.textContent = "Предыдущее обжалование отклонено. Причина: " + (appeals[0].decision_reason || "не указана") + ". Вы можете отправить новое.";
      } else {
        status.textContent = "Обжалование ещё не отправлено.";
      }
      form.addEventListener("submit", async e => {
        e.preventDefault();
        if (!input.value.trim()) return;
        button.disabled = true;
        button.textContent = "Отправляем…";
        const result = await db.from("support_appeals").insert({ block_id: block.id, user_id: user.id, message: input.value.trim() });
        button.disabled = false;
        button.textContent = "Отправить обжалование";
        status.textContent = result.error
          ? "Не удалось отправить обращение: " + result.error.message
          : "Обжалование отправлено. Ожидайте решения главного администратора.";
        if (!result.error) form.hidden = true;
      });
      card.append(symbol, kicker, title, desc, badge, reasonBox, expiryBox, status, form);
      shell.append(brand, card, footer);
      cover.append(shell);
      document.body.append(cover);
      document.documentElement.style.overflow = "hidden";
    } finally {
      busy = false;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
  setInterval(run, 30000);
})();