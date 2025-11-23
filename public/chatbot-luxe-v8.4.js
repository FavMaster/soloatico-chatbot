/* ============================================================
   SOLO'IA'TICO — LUXURY CONCIERGE CHATBOT (V8.4)
   - Header kept
   - Typing effect (typewriter)
   - WhatsApp luxury CTA + linkify
   - Dark mode support (prefers-color-scheme)
   - Smooth animations, mobile & perf tuned
   ============================================================ */

(function () {
  const HEADER_IMAGE_URL = "https://soloatico.es/header.jpg";
  const AVATAR_IMAGE_URL = "https://soloatico.es/avatar.png";
  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag";
  const WHATSAPP_LINK = "https://wa.me/34621128303";

  const FETCH_TIMEOUT_MS = 12000;
  const TYPING_SPEED_MS = 28; // ms per character (adjust for speed)
  const TYPING_MIN_MS = 300; // minimum visible typing
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // -------------------- UTIL --------------------------------
  function safeText(s) {
    if (s == null) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function linkifyButtons(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, function (url) {
      let label = "Ouvrir";
      if (url.includes("soloatico.es")) label = "Voir Solo Ático";
      if (url.includes("wa.me")) label = "WhatsApp";
      if (url.includes("maps.google")) label = "Google Maps";
      // return a clickable luxury button HTML
      return `<a class="link-btn" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
  }

  function timeoutFetch(resource, options = {}, timeout = FETCH_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), timeout);
      fetch(resource, options)
        .then(r => { clearTimeout(timer); resolve(r); })
        .catch(err => { clearTimeout(timer); reject(err); });
    });
  }

  // -------------------- STYLES ------------------------------
  const style = document.createElement("style");
  style.innerHTML = `
:root{
  --accent:#0b1c3f;
  --accent-2:#15316c;
  --ivory:#f2e9d8;
  --card:#ffffff;
  --muted:#eaf2fb;
  --text:#152033;
}
@media (prefers-color-scheme: dark) {
  :root{
    --card:#0b1220;
    --text:#e9eef6;
    --muted:#0b2545;
  }
}
#soloia-chat-btn{
  position:fixed;bottom:22px;right:22px;width:64px;height:64px;border-radius:50%;
  background:linear-gradient(180deg,var(--accent),var(--accent-2));display:flex;align-items:center;justify-content:center;
  z-index:9999999;box-shadow:0 10px 40px rgba(11,28,63,0.45);cursor:pointer;transition:transform .18s ease,box-shadow .2s ease;
  will-change:transform;
}
#soloia-chat-btn:hover{transform:translateY(-4px) scale(1.03);box-shadow:0 20px 50px rgba(11,28,63,0.55)}
#soloia-chat-btn:active{transform:translateY(-2px) scale(.99)}
#soloia-chat-btn svg{width:34px;height:34px;stroke:var(--ivory)}
#soloia-chat-window{
  position:fixed;bottom:108px;right:20px;width:400px;max-width:96vw;height:68vh;max-height:86vh;border-radius:18px;
  background:var(--card);box-shadow:0 30px 90px rgba(2,9,27,0.55);overflow:hidden;opacity:0;transform:translateY(20px);pointer-events:none;
  transition:opacity .28s cubic-bezier(.2,.9,.2,1),transform .28s cubic-bezier(.2,.9,.2,1);z-index:9999998;display:flex;flex-direction:column;
}
#soloia-chat-window.open{opacity:1;transform:translateY(0);pointer-events:auto}
#soloia-chat-header{
  height:170px;background-image:url('${HEADER_IMAGE_URL}');background-size:cover;background-position:center;position:relative;display:flex;align-items:flex-end;justify-content:center;color:#fff;
  backdrop-filter: blur(0px);
}
#soloia-chat-header::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.48))}
#soloia-chat-header .title{position:relative;z-index:2;padding-bottom:16px;font-size:20px;font-weight:700;text-shadow:0 3px 12px rgba(0,0,0,0.6)}
#soloia-chat-header .avatar{position:absolute;left:14px;bottom:14px;width:52px;height:52px;border-radius:12px;overflow:hidden;background:#fff;z-index:3;box-shadow:0 6px 18px rgba(0,0,0,0.45)}
#soloia-chat-header .avatar img{width:100%;height:100%;object-fit:cover;display:block}
#soloia-chat-messages{flex:1;padding:14px 14px 8px 14px;overflow-y:auto;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0));-webkit-overflow-scrolling:touch}
.msg-row{display:flex;align-items:flex-start;margin-bottom:12px}
.msg-row.user{justify-content:flex-end}
.msg{max-width:78%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45}
.msg.bot{background:var(--muted);color:var(--text);border-bottom-left-radius:8px}
.msg.user{background:var(--accent);color:var(--ivory);border-bottom-right-radius:8px}
.msg-avatar{width:40px;height:40px;border-radius:8px;overflow:hidden;margin-right:10px;flex-shrink:0}
.msg-avatar img{width:100%;height:100%;object-fit:cover;display:block}
#soloia-chat-input-area{display:flex;padding:12px;border-top:1px solid rgba(0,0,0,0.06);background:var(--card);align-items:center}
#soloia-chat-input{flex:1;border:1px solid #e6e6e6;padding:10px 12px;border-radius:12px;font-size:14px}
#soloia-chat-send{margin-left:10px;background:var(--accent);color:var(--ivory);padding:9px 14px;border-radius:10px;border:0;cursor:pointer}
#soloia-chat-send:hover{background:var(--accent-2)}
.link-btn{display:inline-block;background:var(--accent);color:var(--ivory);padding:8px 12px;border-radius:8px;margin-top:8px;text-decoration:none;font-size:13px}
.whatsapp-cta{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;background:linear-gradient(90deg,#25D366,#128C7E);color:#fff;text-decoration:none;font-weight:600;box-shadow:0 8px 24px rgba(37,211,102,0.14);margin-top:10px}
.whatsapp-cta svg{width:18px;height:18px}
.typing-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,0.2);margin:0 2px;opacity:0.9}
@media(max-width:520px){#soloia-chat-window{right:10px;bottom:84px;width:94vw;height:78vh}}
  `;
  document.head.appendChild(style);

  // -------------------- DOM BUILD --------------------------
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const k in props) {
      if (k === "class") node.className = props[k];
      else if (k === "html") node.innerHTML = props[k];
      else node.setAttribute(k, props[k]);
    }
    children.forEach(c => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  const btn = el("div", { id: "soloia-chat-btn", role: "button", "aria-label": "Ouvrir le chat" }, [
    (function(){
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("fill","none");
      svg.setAttribute("stroke-width","2");
      svg.setAttribute("stroke-linecap","round");
      svg.setAttribute("stroke-linejoin","round");
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d","M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z");
      svg.appendChild(path);
      return svg;
    })()
  ]);
  document.body.appendChild(btn);

  const win = el("div", { id: "soloia-chat-window", role: "dialog", "aria-hidden": "true" }, []);
  // header content
  const header = el("div", { id: "soloia-chat-header", class: "header" }, []);
  const avatarWrap = el("div", { class: "avatar" }, [ el("img", { src: AVATAR_IMAGE_URL, alt: "Avatar" }) ]);
  header.appendChild(avatarWrap);
  header.appendChild(el("div", { class: "title", html: "Solo’IA’tico Assistant" }));
  win.appendChild(header);
  // messages container
  const messages = el("div", { id: "soloia-chat-messages", role: "log", "aria-live": "polite" }, []);
  win.appendChild(messages);
  // input area with whatsapp CTA slot
  const inputArea = el("div", { id: "soloia-chat-input-area" }, []);
  const inputEl = el("input", { id: "soloia-chat-input", placeholder: "Écrivez votre message…", "aria-label":"Message" }, []);
  const sendBtn = el("button", { id: "soloia-chat-send", type: "button" }, [ document.createTextNode("Envoyer") ]);
  inputArea.appendChild(inputEl);
  inputArea.appendChild(sendBtn);
  // a small container for CTA (WhatsApp premium)
  const ctaWrap = el("div", { id: "soloia-chat-cta-wrap", style: "padding:10px 14px 6px; background:transparent" }, []);
  win.appendChild(messages); // ensure messages present
  win.appendChild(ctaWrap);
  win.appendChild(inputArea);
  document.body.appendChild(win);

  // build whatsapp cta
  function buildWhatsAppCTA() {
    const a = el("a", { class: "whatsapp-cta", href: WHATSAPP_LINK, target: "_blank", rel: "noopener noreferrer" }, []);
    a.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M21 11.5A9.5 9.5 0 1 0 3 11.5a9.2 9.2 0 0 0 1.2 4.4L3 21l5.2-1.4A9.5 9.5 0 0 0 21 11.5z" stroke="#fff" stroke-width="0" fill="#fff" opacity="0.06"></path>
        <path d="M16.5 13.1c-.2-.1-1.2-.6-1.4-.6s-.4-.1-.6.1c-.2.2-.8.6-.9.8-.1.2-.2.3.1.5.2.1 1.1.6 1.5.7.4.1.6.1.8-.1.1-.2.4-.5.5-.6.2-.1.1-.2 0-.5-.1-.2-.1-.3 0-.4.1-.2 0-.3-.1-.4z" fill="#25D366"></path>
      </svg>
      <span>WhatsApp — Écrire à Laurent ou Sophia</span>
    `;
    return a;
  }

  // add CTA below messages (sticky)
  function ensureCTA() {
    ctaWrap.innerHTML = "";
    ctaWrap.appendChild(buildWhatsAppCTA());
  }
  ensureCTA();

  // -------------------- helpers to render messages -----------
  function createRow({htmlContent, from="bot", allowHtml=false}) {
    const row = el("div", { class: "msg-row " + (from === "user" ? "user" : "bot") }, []);
    if (from === "bot") {
      const avatar = el("div", { class: "msg-avatar", html: `<img src="${AVATAR_IMAGE_URL}" alt="avatar">` }, []);
      const bubble = el("div", { class: "msg bot" }, []);
      if (allowHtml) bubble.innerHTML = htmlContent;
      else bubble.innerHTML = renderBotMessage(safeText(htmlContent));
      row.appendChild(avatar);
      row.appendChild(bubble);
    } else {
      const bubble = el("div", { class: "msg user", html: safeText(htmlContent) }, []);
      row.appendChild(bubble);
    }
    return row;
  }

  function appendRow(row) {
    requestAnimationFrame(() => {
      messages.appendChild(row);
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function renderBotMessage(text) {
    // escape text already done upstream where used; then linkify
    const withLinks = linkifyButtons(text);
    return withLinks.replace(/\n/g, "<br>");
  }

  // -------------------- typing (typewriter) -----------------
  // render content string letter by letter inside a new bubble
  async function typeWriterEffect(text, minMs = TYPING_MIN_MS) {
    // create row with empty bubble
    const row = el("div", { class: "msg-row bot" }, []);
    const avatar = el("div", { class: "msg-avatar", html: `<img src="${AVATAR_IMAGE_URL}" alt="avatar">` }, []);
    const bubble = el("div", { class: "msg bot" }, []);
    bubble.innerHTML = `<span class="tw-content"></span>`;
    row.appendChild(avatar);
    row.appendChild(bubble);
    appendRow(row);

    const span = bubble.querySelector(".tw-content");
    // allow HTML links — but we must escape and then linkify progressively
    // we'll progressively build an escaped string and replace link text at the end
    const escaped = safeText(text);
    // progressive reveal
    if (REDUCED_MOTION) {
      span.innerHTML = renderBotMessage(escaped);
      return;
    }
    let i = 0;
    const len = escaped.length;
    const start = performance.now();
    while (i < len) {
      const batch = Math.min(6, len - i); // reveal a few chars per tick for speed
      i += batch;
      span.textContent = escaped.slice(0, i);
      // small pause
      await new Promise(r => setTimeout(r, TYPING_SPEED_MS));
      messages.scrollTop = messages.scrollHeight;
    }
    // ensure minimal duration
    const elapsed = performance.now() - start;
    if (elapsed < minMs) await new Promise(r => setTimeout(r, minMs - elapsed));
    // transform escaped text into linkified HTML
    span.innerHTML = renderBotMessage(escaped);
  }

  // -------------------- welcome ----------------------------
  function addWelcome() {
    const html = `👋 Bonjour et bienvenue !<br><br>
      Je suis <b>Solo’IA’tico Assistant</b>.<br>
      Posez-moi vos questions concernant :<br>
      • <b>Suites & Réservation</b><br>
      • <b>Bateau Tintorera</b><br>
      • <b>Reiki & Bien-être</b><br>
      • <b>Que faire à L’Escala</b><br><br>
      Comment puis-je vous aider ?`;
    const row = createRow({ htmlContent: html, from: "bot", allowHtml: true });
    appendRow(row);
  }

  // -------------------- API call ---------------------------
  async function callAPI(payload) {
    const resp = await timeoutFetch(API_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    }, FETCH_TIMEOUT_MS);
    if (!resp.ok) {
      let errText = "Erreur serveur";
      try { const j = await resp.json(); errText = j.error?.message || j.error || errText; } catch(e){}
      throw new Error(errText);
    }
    return resp.json();
  }

  // -------------------- send message -----------------------
  let sending = false;
  async function sendMessage() {
    if (sending) return;
    const text = inputEl.value.trim();
    if (!text) return;
    sending = true;
    // user message
    appendRow(createRow({ htmlContent: text, from: "user", allowHtml: false }));
    inputEl.value = "";
    inputEl.disabled = true;
    sendBtn.disabled = true;
    // small UX delay and typing indicator
    const lang = (navigator.language || "fr").slice(0,2);
    // show a small ephemeral typing bubble
    const typingRow = el("div", { class: "msg-row bot" }, []);
    typingRow.innerHTML = `<div class="msg-avatar"><img src="${AVATAR_IMAGE_URL}" alt="avatar"></div><div class="msg bot typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
    appendRow(typingRow);
    try {
      // schedule API call lightly
      await new Promise(r => { if ("requestIdleCallback" in window) requestIdleCallback(r, {timeout:200}); else setTimeout(r, 80); });
      const payload = { user_message: text, visitor_lang: lang };
      const result = await callAPI(payload);
      // remove typingRow
      typingRow.remove();
      if (result && result.reply) {
        // produce typewriter effect for the reply
        await typeWriterEffect(result.reply, TYPING_MIN_MS);
      } else {
        // fallback message: we expect the system prompt to produce WhatsApp link; still display with CTA button below
        const fallback = `Bonne question ! Je vous propose de contacter Laurent ou Sophia directement via WhatsApp. Cliquez sur le bouton ci-dessous pour nous écrire instantanément : ${WHATSAPP_LINK}`;
        await typeWriterEffect(fallback, TYPING_MIN_MS);
        ensureCTA(); // keep CTA visible
      }
    } catch (err) {
      try { typingRow.remove(); } catch(e){}
      await typeWriterEffect("Erreur de connexion au serveur. Veuillez réessayer.", 400);
      console.error("Chat API error:", err);
    } finally {
      sending = false;
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // -------------------- events ----------------------------
  sendBtn.addEventListener("click", () => sendMessage());
  inputEl.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

  btn.addEventListener("click", () => {
    const opened = win.classList.toggle("open");
    win.setAttribute("aria-hidden", (!opened).toString());
    if (opened && messages.children.length === 0) {
      // small delay to allow animation render
      requestAnimationFrame(() => addWelcome());
    }
  });

  // ESC to close
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && win.classList.contains("open")) {
      win.classList.remove("open");
      win.setAttribute("aria-hidden","true");
    }
  });

  // focus input when opened
  const observer = new MutationObserver((mut) => {
    mut.forEach(m => {
      if (m.attributeName === "class" && win.classList.contains("open")) {
        inputEl.focus();
      }
    });
  });
  observer.observe(win, { attributes: true });

  // expose debug API
  window.SoloIaticoChat = {
    open: () => { if (!win.classList.contains("open")) btn.click(); },
    close: () => { if (win.classList.contains("open")) btn.click(); }
  };

  // initial CTA ensure
  ensureCTA();
})();
