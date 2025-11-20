/* ============================================================
   SOLO ÁTICO — LUXURY CONCIERGE CHATBOT (V7 – MOBILE OPTIMIZED)
   ============================================================ */

(function () {
  // API endpoint (ton backend fonctionnel)
  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag";

  /* -------------------------
       STYLE GLOBAL LUXE
  -------------------------- */
  const style = document.createElement("style");
  style.innerHTML = `
    /* Bouton flottant */
    #soloatico-chat-btn {
      position: fixed;
      bottom: 22px;
      right: 22px;
      width: 64px;
      height: 64px;
      background: #0b1c3f;
      border-radius: 50%;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 9999999;
      transition: transform 0.2s ease;
    }
    #soloatico-chat-btn:hover {
      transform: scale(1.07);
    }
    #soloatico-chat-btn svg {
      width: 32px;
      height: 32px;
      stroke: #f2e9d8;
    }

    /* Fenêtre chatbot */
    #soloatico-chat-window {
      position: fixed;
      bottom: 100px;
      right: 22px;
      width: 360px;
      max-width: 92vw;
      height: 520px;
      max-height: 75vh;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.38);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(30px);
      pointer-events: none;
      transition: opacity 0.28s ease, transform 0.28s ease;
      z-index: 9999998;
    }
    #soloatico-chat-window.open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    /* Header */
    #soloatico-chat-header {
      background: #0b1c3f;
      color: #f2e9d8;
      padding: 16px;
      font-size: 19px;
      font-weight: 600;
      text-align: center;
      letter-spacing: 0.4px;
    }

    /* Messages */
    #soloatico-chat-messages {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: #faf9f7;
    }
    .msg {
      max-width: 85%;
      padding: 11px 14px;
      margin-bottom: 12px;
      border-radius: 12px;
      line-height: 1.35;
      font-size: 15px;
    }
    .msg.bot {
      background: #e8eef6;
      color: #18233b;
      border-bottom-left-radius: 4px;
    }
    .msg.user {
      background: #0b1c3f;
      color: #ffffff;
      border-bottom-right-radius: 4px;
      margin-left: auto;
    }

    /* Input */
    #soloatico-chat-input-area {
      display: flex;
      padding: 10px;
      background: #ffffff;
      border-top: 1px solid #ddd;
    }
    #soloatico-chat-input {
      flex: 1;
      border: 1px solid #ccc;
      border-radius: 10px;
      padding: 10px;
      font-size: 15px;
    }
    #soloatico-chat-send {
      margin-left: 8px;
      background: #0b1c3f;
      color: #f2e9d8;
      padding: 0 16px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 15px;
    }
    #soloatico-chat-send:hover {
      background: #15316c;
    }

    /* MOBILE OPTIMISATION */
    @media (max-width: 480px) {
      #soloatico-chat-window {
        bottom: 86px;
        right: 10px;
        width: 92vw;
        height: 76vh;
      }
      #soloatico-chat-btn {
        width: 62px;
        height: 62px;
      }
    }
  `;
  document.head.appendChild(style);

  /* -------------------------
       HTML DU CHATBOT
  -------------------------- */
  const btn = document.createElement("div");
  btn.id = "soloatico-chat-btn";
  btn.innerHTML = `
    <svg fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `;
  document.body.appendChild(btn);

  const win = document.createElement("div");
  win.id = "soloatico-chat-window";
  win.innerHTML = `
    <div id="soloatico-chat-header">Concierge Solo Ático</div>
    <div id="soloatico-chat-messages"></div>
    <div id="soloatico-chat-input-area">
      <input id="soloatico-chat-input" type="text" placeholder="Écrivez votre message…">
      <button id="soloatico-chat-send">Envoyer</button>
    </div>
  `;
  document.body.appendChild(win);

  const messages = document.getElementById("soloatico-chat-messages");
  const input = document.getElementById("soloatico-chat-input");
  const send = document.getElementById("soloatico-chat-send");

  /* -------------------------
       LOGIQUE CHATBOT
  -------------------------- */

 // Auto-convert URLs to clickable links
function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

// Auto-convert URLs to clickable buttons based on domain
function linkify(text) {
  return text.replace(/(https?:\/\/[^\s]+)/g, function (url) {
    let label = "Ouvrir le lien";

    if (url.includes("soloatico.es")) {
      label = "Voir Solo Ático";
    } else if (url.includes("wa.me") || url.includes("whatsapp")) {
      label = "Envoyer un message WhatsApp";
    } else if (url.includes("maps.google")) {
      label = "Ouvrir dans Google Maps";
    } else if (url.startsWith("mailto:")) {
      label = "Envoyer un email";
    }

    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="
      display:inline-block;
      background:#0b1c3f;
      color:#f2e9d8;
      padding:8px 14px;
      border-radius:8px;
      text-decoration:none;
      font-size:14px;
      margin-top:6px;
    ">${label}</a>`;
  });
}

function addMessage(text, sender = "bot") {
  const div = document.createElement("div");
  div.className = `msg ${sender}`;

  if (sender === "user") {
    div.textContent = text;
  } else {
    div.innerHTML = linkify(text);
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    // Detect language of user message
    const lang = navigator.language.slice(0, 2);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          user_message: text,
          visitor_lang: lang
        })
      });

      const data = await response.json();
      if (data.reply) {
        addMessage(data.reply, "bot");
      } else {
        addMessage("Désolé, une erreur est survenue.", "bot");
      }

    } catch (e) {
      addMessage("Erreur de connexion au serveur.", "bot");
    }
  }

  send.onclick = sendMessage;
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  /* -------------------------
       OUVERTURE / FERMETURE
  -------------------------- */
  btn.onclick = () => {
    win.classList.toggle("open");
  };
})();
