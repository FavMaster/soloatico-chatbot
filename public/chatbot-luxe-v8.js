/* ============================================================
   SOLO'IA'TICO GUIDE — LUXURY CONCIERGE CHATBOT (V8)
   ============================================================ */

(function () {
  const HEADER_IMAGE_URL = "https://soloatico.es/header.jpg";
  const AVATAR_IMAGE_URL = "https://soloatico.es/avatar.jpg";
  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag";

  /* -------------------------
       STYLE GLOBAL (CSS V8)
  -------------------------- */
  const style = document.createElement("style");
  style.innerHTML = `
    #soloia-chat-btn {
      position: fixed;
      bottom: 22px;
      right: 22px;
      width: 64px;
      height: 64px;
      background: #0b1c3f;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 22px rgba(11,28,63,0.45);
      transition: transform 0.18s ease;
      z-index: 9999999;
    }
    #soloia-chat-btn:hover { transform: scale(1.06); }

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
      box-shadow: 0 12px 40px rgba(0,0,0,0.42);
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(30px);
      transition: opacity 0.28s ease, transform 0.28s ease;
      z-index: 9999998;
      display: flex;
      flex-direction: column;
    }
    #soloia-chat-window.open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    #soloia-chat-header {
      height: 160px;
      background-image: url('${HEADER_IMAGE_URL}');
      background-size: cover;
      background-position: center;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      color: #fff;
      position: relative;
    }

    #soloia-chat-header::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.42) 100%);
    }

    #soloia-chat-header .avatar {
      position: absolute;
      left: 14px;
      bottom: 14px;
      width: 48px;
      height: 48px;
      border-radius: 10px;
      overflow: hidden;
      z-index: 3;
    }

    #soloia-chat-header .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    #soloia-chat-header .title {
      position: relative;
      z-index: 3;
      padding-bottom: 12px;
      font-size: 20px;
      font-weight: 700;
      text-shadow: 0 2px 6px rgba(0,0,0,0.45);
    }

    #soloia-chat-messages {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
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
      line-height: 1.35;
      word-wrap: break-word;
    }
    .msg.bot {
      background: #eaf2fb;
      color: #152033;
      border-bottom-left-radius: 6px;
    }
    .msg.user {
      background: #0b1c3f;
      color: #fff;
      border-bottom-right-radius: 6px;
    }

    .msg-avatar {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      margin-right: 10px;
      overflow: hidden;
    }

    #soloia-chat-input-area {
      display: flex;
      padding: 10px;
      border-top: 1px solid #eee;
      background: #fff;
    }
    #soloia-chat-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 10px;
    }
    #soloia-chat-send {
      margin-left: 8px;
      background: #0b1c3f;
      color: #f2e9d8;
      padding: 8px 14px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
    }
    #soloia-chat-send:hover {
      background: #15316c;
    }
  `;
  document.head.appendChild(style);

  /* -------------------------
       HTML DU WIDGET
  -------------------------- */
  const btn = document.createElement("div");
  btn.id = "soloia-chat-btn";
  btn.innerHTML = `
    <svg fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `;
  document.body.appendChild(btn);

  const win = document.createElement("div");
  win.id = "soloia-chat-window";
  win.innerHTML = `
    <div id="soloia-chat-header">
      <div class="avatar"><img src="${AVATAR_IMAGE_URL}"></div>
      <div class="title">Solo'IA'tico Assistant</div>
    </div>
    <div id="soloia-chat-messages"></div>
    <div id="soloia-chat-input-area">
      <input id="soloia-chat-input" placeholder="Écrivez votre message…">
      <button id="soloia-chat-send">Envoyer</button>
    </div>
  `;
  document.body.appendChild(win);

  const messages = document.getElementById("soloia-chat-messages");
  const input = document.getElementById("soloia-chat-input");
  const send = document.getElementById("soloia-chat-send");
  /* -------------------------
       LOGIQUE DU CHATBOT (JS)
  -------------------------- */

  function linkifyButtons(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, function (url) {
      let label = "Ouvrir le lien";

      if (url.includes("soloatico.es")) label = "Visiter Solo Ático";
      if (url.includes("wa.me")) label = "Contacter sur WhatsApp";
      if (url.includes("maps.google")) label = "Ouvrir dans Google Maps";

      return `<a href="${url}" target="_blank" class="link-btn">${label}</a>`;
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderBotMessage(text) {
    return linkifyButtons(escapeHtml(text)).replace(/\n/g, "<br>");
  }

  function addMessage(text, sender = "bot") {
    const row = document.createElement("div");
    row.className = `msg-row ${sender}`;

    if (sender === "bot") {
      const avatar = document.createElement("div");
      avatar.className = "msg-avatar";
      avatar.innerHTML = `<img src="${AVATAR_IMAGE_URL}">`;

      const bubble = document.createElement("div");
      bubble.className = "msg bot";
      bubble.innerHTML = renderBotMessage(text);

      row.appendChild(avatar);
      row.appendChild(bubble);
    } else {
      const bubble = document.createElement("div");
      bubble.className = "msg user";
      bubble.textContent = text;
      row.appendChild(bubble);
    }

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    const lang = navigator.language.slice(0, 2);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_message: text, visitor_lang: lang })
      });

      const data = await response.json();
      if (data.reply) addMessage(data.reply, "bot");

    } catch (err) {
      addMessage("Erreur de connexion au serveur.", "bot");
    }
  }

  send.onclick = sendMessage;
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });

  btn.onclick = () => {
    win.classList.toggle("open");

    if (win.classList.contains("open") && messages.children.length === 0) {
      addMessage(
        "Bonjour 👋<br>Je suis <b>Solo’IA’tico Assistant</b>.<br>Comment puis-je vous aider aujourd’hui ?"
      );
    }
  };

})();
