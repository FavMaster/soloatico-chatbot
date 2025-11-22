/* ============================================================
   SOLO'IA'TICO LUXURY CONCIERGE CHATBOT — VERSION 9
   Avec carrousel photo dynamique + RAG + WhatsApp CTA
   ============================================================ */

(function () {
  const HEADER_IMAGE_URL = "https://soloatico.es/header.jpg";
  const AVATAR_IMAGE_URL = "https://soloatico.es/avatar.png";

  // --- API RAG v9 avec photos
  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag_v9";

  // --- WhatsApp CTA
  const WHATSAPP_LINK = "https://wa.me/34621128303";

  // --- Performance
  const TYPING_SPEED_MS = 28;
  const FETCH_TIMEOUT_MS = 12000;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     UTILITAIRES
  ---------------------------------------------------------- */

  function safeText(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function linkifyButtons(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, url => {
      let label = "Ouvrir";

      if (url.includes("soloatico.es")) label = "Voir Solo Ático";
      if (url.includes("wa.me")) label = "WhatsApp";
      if (url.includes("maps.google")) label = "Google Maps";

      return `<a class="link-btn" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
  }

  function timeoutFetch(resource, options = {}, timeout = FETCH_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), timeout);
      fetch(resource, options)
        .then(r => { clearTimeout(timer); resolve(r); })
        .catch(e => { clearTimeout(timer); reject(e); });
    });
  }

  /* ---------------------------------------------------------
     STYLES (Version Luxe)
  ---------------------------------------------------------- */

  const style = document.createElement("style");
  style.innerHTML = `

    :root {
      --dark: #0b1c3f;
      --ivory: #f2e9d8;
      --bubble-user: #0b1c3f;
      --bubble-bot: #eaf2fb;
      --accent: #0b1c3f;
    }

    #soloia-chat-btn {
      position: fixed;
      bottom: 22px;
      right: 22px;
      width: 64px;
      height: 64px;
      background: var(--dark);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 6px 22px rgba(11,28,63,0.45);
      transition: transform 0.18s ease;
      z-index: 9999999;
    }
    #soloia-chat-btn:hover {
      transform: scale(1.06);
    }
    #soloia-chat-btn svg {
      width: 34px;
      height: 34px;
      stroke: var(--ivory);
    }

    #soloia-chat-window {
      position: fixed;
      bottom: 100px;
      right: 22px;
      width: 380px;
      max-width: 94vw;
      height: 560px;
      max-height: 80vh;
      background: #ffffff;
      border-radius: 18px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(30px);
      transition: opacity 0.28s ease, transform 0.28s ease;
      box-shadow: 0 12px 40px rgba(0,0,0,0.42);
      z-index: 9999998;
      display: flex;
      flex-direction: column;
    }
    #soloia-chat-window.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    #soloia-chat-header {
      height: 160px;
      background-image: url('${HEADER_IMAGE_URL}');
      background-size: cover;
      background-position: center;
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    #soloia-chat-header::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45));
    }
    #soloia-chat-header .avatar {
      position: absolute;
      left: 14px;
      bottom: 14px;
      width: 48px;
      height: 48px;
      border-radius: 10px;
      overflow: hidden;
      z-index: 2;
    }
    #soloia-chat-header .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    #soloia-chat-header .title {
      position: relative;
      z-index: 2;
      font-size: 20px;
      font-weight: 700;
      color: white;
      padding-bottom: 14px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.4);
    }

    #soloia-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      background: #fbfaf9;
    }

    .msg-row {
      display: flex;
      margin-bottom: 12px;
    }
    .msg-row.user {
      justify-content: flex-end;
    }

    .msg {
      max-width: 78%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.42;
    }

    .msg.bot {
      background: var(--bubble-bot);
      color: #152033;
      border-bottom-left-radius: 6px;
    }
    .msg.user {
      background: var(--bubble-user);
      color: white;
      border-bottom-right-radius: 6px;
    }

    .msg-avatar {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      overflow: hidden;
      margin-right: 10px;
    }

    /* Carrousel */
    .carousel-wrap {
      margin-top: 10px;
      width: 100%;
      overflow: hidden;
      position: relative;
      background: #fff;
      padding: 6px 0;
    }
    .carousel-track {
      display: flex;
      transition: transform 0.35s ease;
      will-change: transform;
      gap: 10px;
    }
    .carousel-item {
      width: 120px;
      height: 90px;
      flex: 0 0 auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 8px 18px rgba(0,0,0,0.12);
    }
    .carousel-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .carousel-controls {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 6px;
    }
    .carousel-btn {
      background: var(--accent);
      color: white;
      border-radius: 8px;
      padding: 4px 10px;
      cursor: pointer;
      border: none;
      font-size: 12px;
    }

    /* Zone input */
    #soloia-chat-input-area {
      padding: 10px;
      background: #fff;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    }
    #soloia-chat-input {
      flex: 1;
      padding: 10px;
      border-radius: 10px;
      border: 1px solid #ddd;
    }
    #soloia-chat-send {
      padding: 10px 16px;
      border-radius: 10px;
      background: var(--accent);
      color: var(--ivory);
      cursor: pointer;
      border: none;
    }

    .link-btn {
      display: inline-block;
      margin-top: 8px;
      padding: 8px 12px;
      background: var(--accent);
      color: var(--ivory);
      border-radius: 8px;
      text-decoration: none;
      font-size: 13px;
    }

  `;
  document.head.appendChild(style);

  /* ---------------------------------------------------------
     HTML du widget
  ---------------------------------------------------------- */

  // Bouton flottant
  const btn = document.createElement("div");
  btn.id = "soloia-chat-btn";
  btn.innerHTML = `
    <svg fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  `;
  document.body.appendChild(btn);

  // Fenêtre chat
  const win = document.createElement("div");
  win.id = "soloia-chat-window";
  win.innerHTML = `
    <div id="soloia-chat-header">
      <div class="avatar"><img src="${AVATAR_IMAGE_URL}" /></div>
      <div class="title">Solo’IA’tico Assistant</div>
    </div>

    <div id="soloia-chat-messages"></div>

    <div id="soloia-chat-input-area">
      <input id="soloia-chat-input" placeholder="Écrivez votre message…" />
      <button id="soloia-chat-send">Envoyer</button>
    </div>
  `;
  document.body.appendChild(win);

  const msgBox = document.getElementById("soloia-chat-messages");
  const input = document.getElementById("soloia-chat-input");
  const sendBtn = document.getElementById("soloia-chat-send");

  /* ---------------------------------------------------------
     MESSAGES + ANIMATION
  ---------------------------------------------------------- */

  function addMessage(text, sender = "bot") {
    const row = document.createElement("div");
    row.className = `msg-row ${sender}`;

    if (sender === "bot") {
      const avatar = document.createElement("div");
      avatar.className = "msg-avatar";
      avatar.innerHTML = `<img src="${AVATAR_IMAGE_URL}" />`;

      const bubble = document.createElement("div");
      bubble.className = "msg bot";
      bubble.innerHTML = linkifyButtons(text);

      row.appendChild(avatar);
      row.appendChild(bubble);

    } else {
      const bubble = document.createElement("div");
      bubble.className = "msg user";
      bubble.textContent = text;
      row.appendChild(bubble);
    }

    msgBox.appendChild(row);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  /* ---------------------------------------------------------
     CARROUSEL DYNAMIQUE
  ---------------------------------------------------------- */

  function addCarousel(images, baseUrl) {
    if (!images || images.length === 0) return;

    const wrap = document.createElement("div");
    wrap.className = "carousel-wrap";

    let index = 0;

    wrap.innerHTML = `
      <div class="carousel-track"></div>
      <div class="carousel-controls">
        <button class="carousel-btn prev">◀</button>
        <button class="carousel-btn next">▶</button>
      </div>
    `;

    const track = wrap.querySelector(".carousel-track");

    images.forEach(img => {
      const item = document.createElement("div");
      item.className = "carousel-item";
      item.innerHTML = `<img src="${baseUrl}${img}" loading="lazy">`;
      track.appendChild(item);
    });

    const prev = wrap.querySelector(".prev");
    const next = wrap.querySelector(".next");

    prev.onclick = () => {
      index = Math.max(0, index - 1);
      track.style.transform = `translateX(-${index * 130}px)`;
    };

    next.onclick = () => {
      index = Math.min(images.length - 1, index + 1);
      track.style.transform = `translateX(-${index * 130}px)`;
    };

    msgBox.appendChild(wrap);
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  /* ---------------------------------------------------------
     ENVOI MESSAGE (API RAG v9)
  ---------------------------------------------------------- */

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    // Affichage utilisateur
    addMessage(text, "user");

    const lang = navigator.language.slice(0, 2).toLowerCase();

    try {
      const response = await timeoutFetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message: text,
          visitor_lang: lang
        })
      });

      const data = await response.json();

      // Affichage texte
      if (data.reply) addMessage(data.reply, "bot");

      // Affichage carrousel
      if (data.gallery && data.gallery.images) {
        addCarousel(data.gallery.images, data.gallery.base_url);
      }

    } catch (e) {
      addMessage(
        "Je rencontre un petit souci technique… Vous pouvez toujours contacter Laurent ou Sophia directement sur WhatsApp.",
        "bot"
      );
      addMessage(`<a class="link-btn" href="${WHATSAPP_LINK}" target="_blank">Parler sur WhatsApp</a>`, "bot");
    }
  }

  sendBtn.onclick = sendMessage;

  input.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });

  /* ---------------------------------------------------------
     OUVERTURE / FERMETURE CHAT
  ---------------------------------------------------------- */

  btn.onclick = () => {
    win.classList.toggle("open");

    // Message d’accueil une seule fois
    if (win.classList.contains("open") && msgBox.children.length === 0) {
      addMessage(
        "Bonjour et bienvenue 👋<br>Je suis <b>Solo’IA’tico Assistant</b>.<br><br>Je peux vous aider pour :<br>• Suites & réservations<br>• Bateau Tintorera<br>• Soins Reiki<br>• Activités à L’Escala<br><br>Que désirez-vous savoir ?"
      );
    }
  };

})();
