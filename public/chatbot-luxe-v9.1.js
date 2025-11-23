/* ============================================================
   SOLO'IA'TICO LUXURY CONCIERGE CHATBOT — VERSION 9.1
   Avec carrousel photo dynamique + RAG + WhatsApp CTA
   ============================================================ */
/* chatbot-luxe-v9.1.js — Compact carousel + WhatsApp CTA bottom + V8.4 styling */
(function () {
  const HEADER_IMAGE_URL = "https://soloatico.es/header.jpg";
  const AVATAR_IMAGE_URL = "https://soloatico.es/avatar.png";
  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag_v9.1";
  const WHATSAPP_LINK = "https://wa.me/34621128303";

  const TYPING_SPEED_MS = 22;
  const FETCH_TIMEOUT_MS = 12000;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------ STYLES (keep V8.4 feel, compact carousel) ------------------ */
  const style = document.createElement("style");
  style.innerHTML = `
    :root{ --dark:#0b1c3f; --ivory:#f2e9d8; --accent:#0b1c3f; }
    #soloia-chat-btn{ position:fixed; bottom:22px; right:22px; width:64px; height:64px; background:var(--dark); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:9999999; box-shadow:0 6px 22px rgba(11,28,63,0.45); }
    #soloia-chat-btn svg{ width:34px; height:34px; stroke:var(--ivory); }
    #soloia-chat-window{ position:fixed; bottom:92px; right:22px; width:360px; max-width:94vw; height:560px; max-height:80vh; background:#fff; border-radius:16px; box-shadow:0 12px 40px rgba(0,0,0,0.42); display:flex; flex-direction:column; overflow:hidden; transform:translateY(20px); opacity:0; pointer-events:none; transition:all .26s ease; z-index:9999998; }
    #soloia-chat-window.open{ transform:translateY(0); opacity:1; pointer-events:auto; }
    #soloia-chat-header{ height:140px; background-image:url('${HEADER_IMAGE_URL}'); background-size:cover; background-position:center; position:relative; display:flex; align-items:flex-end; justify-content:center; }
    #soloia-chat-header::after{ content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.48)); }
    #soloia-chat-header .avatar{ position:absolute; left:12px; bottom:12px; width:44px; height:44px; border-radius:10px; overflow:hidden; z-index:2; }
    #soloia-chat-header .avatar img{ width:100%; height:100%; object-fit:cover; }
    #soloia-chat-header .title{ z-index:2; color:#fff; font-weight:700; padding-bottom:12px; text-shadow:0 2px 6px rgba(0,0,0,0.35); font-size:18px; }
    #soloia-chat-messages{ flex:1; overflow-y:auto; padding:12px; background:#fbfaf9; }
    .msg-row{ display:flex; margin-bottom:10px; }
    .msg-row.user{ justify-content:flex-end; }
    .msg{ max-width:78%; padding:10px 12px; border-radius:12px; font-size:14px; line-height:1.4; }
    .msg.bot{ background:#eaf2fb; color:#152033; border-bottom-left-radius:6px; }
    .msg.user{ background:var(--dark); color:#fff; border-bottom-right-radius:6px; }
    .msg-avatar{ width:34px; height:34px; border-radius:8px; overflow:hidden; margin-right:10px; }
    .link-btn{ display:inline-block; margin-top:8px; padding:8px 12px; background:var(--accent); color:var(--ivory); border-radius:8px; text-decoration:none; font-size:13px; }

    /* compact carousel */
    .carousel-wrap{ margin-top:8px; width:100%; overflow:hidden; }
    .carousel-track{ display:flex; gap:8px; transition:transform .32s ease; padding:6px 0; }
    .carousel-item{ width:88px; height:64px; flex:0 0 auto; border-radius:8px; overflow:hidden; box-shadow:0 6px 14px rgba(0,0,0,0.1); }
    .carousel-item img{ width:100%; height:100%; object-fit:cover; display:block; }
    .carousel-controls{ display:flex; gap:8px; justify-content:center; margin-top:6px; }
    .carousel-btn{ background:var(--accent); color:var(--ivory); border:none; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12px; }

    /* input */
    #soloia-chat-input-area{ padding:10px; display:flex; gap:8px; border-top:1px solid #eee; background:#fff; }
    #soloia-chat-input{ flex:1; padding:10px; border-radius:10px; border:1px solid #ddd; }
    #soloia-chat-send{ padding:10px 14px; border-radius:10px; background:var(--accent); color:var(--ivory); border:none; cursor:pointer; }

    /* whatsapp CTA bottom */
    #soloia-whatsapp-cta{ position:fixed; right:22px; bottom:18px; z-index:9999997; display:flex; gap:8px; align-items:center; background:linear-gradient(90deg,#25D366,#128C7E); color:#fff; padding:10px 14px; border-radius:999px; box-shadow:0 12px 30px rgba(0,0,0,0.2); cursor:pointer; text-decoration:none; font-weight:600; }
    #soloia-whatsapp-cta img{ width:20px; height:20px; margin-right:8px; }

    @media (max-width:480px){
      #soloia-chat-window{ right:10px; left:10px; width:calc(100% - 20px); bottom:90px; height:70vh; }
      .carousel-item{ width:84px; height:60px; }
    }
  `;
  document.head.appendChild(style);

  /* ------------------ BUILD DOM ------------------ */
  const btn = document.createElement("div");
  btn.id = "soloia-chat-btn";
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  document.body.appendChild(btn);

  const win = document.createElement("div");
  win.id = "soloia-chat-window";
  win.innerHTML = `
    <div id="soloia-chat-header">
      <div class="avatar"><img src="${AVATAR_IMAGE_URL}" alt="avatar" /></div>
      <div class="title">Solo’IA’tico Assistant</div>
    </div>
    <div id="soloia-chat-messages"></div>
    <div id="soloia-chat-input-area">
      <input id="soloia-chat-input" placeholder="Écrivez votre message…" />
      <button id="soloia-chat-send">Envoyer</button>
    </div>
  `;
  document.body.appendChild(win);

  // WhatsApp CTA bottom (always visible)
  const wa = document.createElement("a");
  wa.id = "soloia-whatsapp-cta";
  wa.href = WHATSAPP_LINK;
  wa.target = "_blank";
  wa.rel = "noopener noreferrer";
  wa.innerHTML = `<img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='white'><path d='M16 3C9.37 3 4 8.37 4 15c0 2.64.86 5.08 2.33 7.06L4 29l6.18-2.04A12.86 12.86 0 0 0 16 28c6.63 0 12-5.37 12-12S22.63 3 16 3z'/></svg>` + `<span>WhatsApp — Écrire à Laurent ou Sophia</span>`;
  document.body.appendChild(wa);

  const messages = document.getElementById("soloia-chat-messages");
  const input = document.getElementById("soloia-chat-input");
  const send = document.getElementById("soloia-chat-send");

  /* ------------------ HELPERS ------------------ */
  function escapeHtml(s) { if (!s) return ""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function linkifyButtons(text) { return text.replace(/(https?:\/\/[^\s]+)/g, url => `<a class="link-btn" href="${url}" target="_blank" rel="noopener noreferrer">Voir</a>`); }

  function appendRow(html, from="bot") {
    const row = document.createElement("div");
    row.className = "msg-row " + (from === "user" ? "user" : "bot");
    if (from !== "user") {
      const avatar = document.createElement("div");
      avatar.className = "msg-avatar";
      avatar.innerHTML = `<img src="${AVATAR_IMAGE_URL}" alt="avatar">`;
      const bubble = document.createElement("div");
      bubble.className = "msg bot";
      bubble.innerHTML = linkifyButtons(html);
      row.appendChild(avatar);
      row.appendChild(bubble);
    } else {
      const bubble = document.createElement("div");
      bubble.className = "msg user";
      bubble.textContent = html;
      row.appendChild(bubble);
    }
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  async function typeWriterText(text) {
    // simple typewriter for bot messages
    const row = document.createElement("div");
    row.className = "msg-row bot";
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.innerHTML = `<img src="${AVATAR_IMAGE_URL}" alt="avatar">`;
    const bubble = document.createElement("div");
    bubble.className = "msg bot";
    const span = document.createElement("span");
    bubble.appendChild(span);
    row.appendChild(avatar);
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    if (REDUCED_MOTION) {
      span.innerHTML = linkifyButtons(escapeHtml(text));
      return;
    }
    let i = 0;
    const plain = text;
    while (i < plain.length) {
      i += Math.max(1, Math.floor(plain.length / 40));
      span.textContent = plain.slice(0, i);
      await new Promise(r => setTimeout(r, TYPING_SPEED_MS));
      messages.scrollTop = messages.scrollHeight;
    }
    span.innerHTML = linkifyButtons(escapeHtml(text));
  }

  function renderCompactCarousel(images = [], baseUrl = "") {
    if (!images || images.length === 0) return null;
    const wrap = document.createElement("div");
    wrap.className = "carousel-wrap";
    const track = document.createElement("div");
    track.className = "carousel-track";
    images.forEach(src => {
      const item = document.createElement("div");
      item.className = "carousel-item";
      const img = document.createElement("img");
      img.src = src.startsWith("http") ? src : (baseUrl.replace(/\/$/,"") + "/" + src);
      img.loading = "lazy";
      item.appendChild(img);
      track.appendChild(item);
    });
    const controls = document.createElement("div");
    controls.className = "carousel-controls";
    const prev = document.createElement("button");
    prev.className = "carousel-btn prev";
    prev.textContent = "◀";
    const next = document.createElement("button");
    next.className = "carousel-btn next";
    next.textContent = "▶";
    controls.appendChild(prev);
    controls.appendChild(next);
    wrap.appendChild(track);
    wrap.appendChild(controls);

    let idx = 0;
    function update() {
      const itemWidth = track.children[0] ? track.children[0].clientWidth + 8 : 96;
      track.style.transform = `translateX(-${idx * itemWidth}px)`;
    }
    prev.addEventListener("click", () => { idx = Math.max(0, idx - 1); update(); });
    next.addEventListener("click", () => { idx = Math.min(track.children.length - 1, idx + 1); update(); });

    // touch support
    let startX = 0;
    track.addEventListener("touchstart", e => startX = e.touches[0].clientX);
    track.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 30) idx = Math.max(0, idx - 1);
      else if (dx < -30) idx = Math.min(track.children.length - 1, idx + 1);
      update();
    });

    // images load => update width
    setTimeout(update, 300);
    return wrap;
  }

  /* ------------------ API CALL & RENDER ------------------ */
  async function callApi(text) {
    // show user bubble
    appendRow(text, "user");

    // typing indicator
    const typing = appendRow("…", "bot");
    const bubble = typing.querySelector(".msg");
    bubble.innerHTML = `<span class="typing">...</span>`;

    try {
      const lang = (navigator.language || "fr").slice(0, 2).toLowerCase();
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_message: text, visitor_lang: lang })
      });
      const j = await res.json();
      // remove typing
      typing.remove();

      if (j.reply) {
        await typeWriterText(j.reply);
      } else {
        await typeWriterText("Je suis désolé, une erreur est survenue.");
      }

      // if images present, render compact carousel inside a bot bubble
      if (j.images && j.images.length) {
        // attach carousel after last message
        const lastBot = messages.querySelectorAll(".msg.bot");
        const containerRow = document.createElement("div");
        containerRow.className = "msg-row bot";
        const avatar = document.createElement("div");
        avatar.className = "msg-avatar";
        avatar.innerHTML = `<img src="${AVATAR_IMAGE_URL}" alt="avatar">`;
        const bubble = document.createElement("div");
        bubble.className = "msg bot";
        const base = j.album_base || "";
        const car = renderCompactCarousel(j.images, base);
        if (car) bubble.appendChild(car);
        containerRow.appendChild(avatar);
        containerRow.appendChild(bubble);
        messages.appendChild(containerRow);
        messages.scrollTop = messages.scrollHeight;
      }

      // if API returned whatsapp link directly
      if (j.whatsapp) {
        const botRow = document.createElement("div");
        botRow.className = "msg-row bot";
        const avatar2 = document.createElement("div");
        avatar2.className = "msg-avatar";
        avatar2.innerHTML = `<img src="${AVATAR_IMAGE_URL}" alt="avatar">`;
        const bubble2 = document.createElement("div");
        bubble2.className = "msg bot";
        bubble2.innerHTML = `<a class="link-btn" href="${j.whatsapp}" target="_blank">Contacter sur WhatsApp</a>`;
        botRow.appendChild(avatar2);
        botRow.appendChild(bubble2);
        messages.appendChild(botRow);
        messages.scrollTop = messages.scrollHeight;
      }

    } catch (err) {
      console.error(err);
      try { messages.querySelector(".typing")?.parentElement?.parentElement?.remove(); } catch(e){}
      await typeWriterText("Erreur de connexion au serveur. Veuillez réessayer ou contactez-nous via le bouton WhatsApp en bas.");
    }
  }

  send.addEventListener("click", () => {
    const t = input.value.trim();
    if (!t) return;
    input.value = "";
    callApi(t);
  });
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const t = input.value.trim();
      if (!t) return;
      input.value = "";
      callApi(t);
    }
  });

  // open/close
  btn.addEventListener("click", () => {
    const opened = win.classList.toggle("open");
    if (opened && messages.children.length === 0) {
      typeWriterText("Bonjour 👋\nJe suis Solo’IA’tico Assistant. Posez-moi une question sur les suites, le bateau Tintorera, les soins Reiki, ou les activités à L’Escala.");
    }
  });

  // expose simple API
  window.SoloIaticoChat = { open: () => { if (!win.classList.contains("open")) btn.click(); }, close: () => { if (win.classList.contains("open")) btn.click(); } };

})();
