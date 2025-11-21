/* ============================================================
   SOLO'IA'TICO GUIDE — LUXURY CONCIERGE CHATBOT (V8)
   ============================================================ */

(function () {
  const HEADER_IMAGE_URL = "https://soloatico.es/header.jpg";
  const AVATAR_IMAGE_URL = "https://soloatico.es//avatar.jpg";
  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag";

  /* -------------------------
       STYLE GLOBAL V8 - LUXE (Part 1)
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
    #soloia-chat-btn svg {
      width: 34px;
      height: 34px;
      stroke: #f2e9d8;
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
  `;
  document.head.appendChild(style);

  /* Block 1 injected — ready for Block 2 */

  /* -------------------------
       STYLE GLOBAL V8 - LUXE (Part 2)
  -------------------------- */
  style.innerHTML += `
    /* Header full banner */
    #soloia-chat-header {
      height: 160px;
      background-image: url('${HEADER_IMAGE_URL}');
      background-size: cover;
      background-position: center;
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      color: #fff;
    }
    #soloia-chat-header::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.42) 100%);
      backdrop-filter: blur(4px);
    }
    #soloia-chat-header .title {
      position: relative;
      z-index: 2;
      font-size: 20px;
      font-weight: 700;
      padding: 14px 18px;
      text-shadow: 0 2px 6px rgba(0,0,0,0.45);
    }
    #soloia-chat-header .avatar {
      position: absolute;
      left: 14px;
      bottom: 12px;
      width: 48px;
      height: 48px;
      border-radius: 10px;
      overflow: hidden;
      background: rgba(255,255,255,0.06);
      border: 2px solid rgba(242,233,216,0.12);
      z-index: 3;
    }
    #soloia-chat-header .avatar img {
      width:100%; height:100%; object-fit:cover;
    }

    /* Messages area */
    #soloia-chat-messages {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: #fbfaf9;
    }
  `;

  /* Block 2 injected — ready for Block 3 */

  /* -------------------------
       STYLE GLOBAL V8 - LUXE (Part 3)
  -------------------------- */
  style.innerHTML += `
    .msg-row {
      display:flex;
      align-items:flex-start;
      margin-bottom:12px;
    }
    .msg-row.user {
      justify-content:flex-end;
    }
    .msg {
      max-width: 78%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size:14px;
      line-height:1.35;
      word-wrap:break-word;
    }
    .msg.bot {
      background:#eaf2fb;
      color:#152033;
      border-bottom-left-radius:6px;
    }
    .msg.user {
      background:#0b1c3f;
      color:#fff;
      border-bottom-right-radius:6px;
    }

    .msg-avatar {
      width:36px;
      height:36px;
      border-radius:8px;
      overflow:hidden;
      margin-right:10px;
      flex-shrink:0;
    }
    .msg-avatar img {
      width:100%; height:100%; object-fit:cover;
    }

    /* Input area */
    #soloia-chat-input-area {
      display:flex;
      padding:10px;
      border-top:1px solid #eee;
      background:#fff;
    }
    #soloia-chat-input {
      flex:1;
      border:1px solid #ddd;
      border-radius:10px;
      padding:10px;
      font-size:14px;
    }
    #soloia-chat-send {
      margin-left:8px;
      background:#0b1c3f;
      color:#f2e9d8;
      padding:8px 14px;
      border:none;
      border-radius:10px;
      cursor:pointer;
    }
    #soloia-chat-send:hover {
      background:#15316c;
    }

    /* Smart link buttons */
    .link-btn {
      display:inline-block;
      background:#0b1c3f;
      color:#f2e9d8;
      padding:8px 12px;
      border-radius:8px;
      text-decoration:none;
      margin-top:8px;
      font-size:13px;
    }
  `;

  /* Block 3 injected — ready for Block 4 */
   /* -------------------------
       SCRIPT LOGIC — V8 (Part 4)
  -------------------------- */

  function linkifyButtons(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, function (url) {
      var label = "Ouvrir le lien";
      if (url.indexOf("soloatico.es") !== -1) label = "Voir Solo Ático";
      else if (url.indexOf("wa.me") !== -1 || url.indexOf("whatsapp") !== -1)
        label = "Envoyer un message WhatsApp";
      else if (url.indexOf("maps.google") !== -1)
        label = "Ouvrir dans Google Maps";
      else if (url.indexOf("mailto:") === 0)
        label = "Envoyer un email";

      return '<a class="link-btn" href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
    });
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderBotMessageHTML(text) {
    return linkifyButtons(escapeHtml(text)).replace(/\n/g, "<br>");
  }

  function addMessage(text, sender) {
    if (!sender) sender = "bot";

    var row = document.createElement("div");
    row.className = "msg-row " + sender;

    if (sender === "bot") {
      var avatarWrap = document.createElement("div");
      avatarWrap.className = "msg-avatar";
      var img = document.createElement("img");
      img.src = AVATAR_IMAGE_URL;
      avatarWrap.appendChild(img);

      var bubble = document.createElement("div");
      bubble.className = "msg bot";
      bubble.innerHTML = renderBotMessageHTML(text);

      row.appendChild(avatarWrap);
      row.appendChild(bubble);

    } else {
      var bubbleUser = document.createElement("div");
      bubbleUser.className = "msg user";
      bubbleUser.textContent = text;
      row.appendChild(bubbleUser);
    }

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage() {
    var text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    var lang = navigator.language.slice(0, 2);

    try {
      var response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_message: text, visitor_lang: lang })
      });

      var data = await response.json();
      if (data.reply) addMessage(data.reply, "bot");
      else addMessage("Désolé, une erreur est survenue.", "bot");

    } catch (e) {
      addMessage("Erreur de connexion au serveur.", "bot");
    }
  }

  send.onclick = sendMessage;
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  btn.onclick = function () {
    win.classList.toggle("open");
  };

  // Message d’accueil lorsque le chat s’ouvre
  btn.addEventListener("click", function () {
    var win = document.getElementById("soloia-chat-window");
    var messages = document.getElementById("soloia-chat-messages");
    if (win.classList.contains("open") && messages.children.length === 0) {
      addMessage(
        "Bonjour 👋<br>Je suis <b>Solo’IA’tico Assistant</b>, votre concierge digital.<br><br>Comment puis-je vous aider aujourd’hui ?",
        "bot"
      );
    }
  });
})();
