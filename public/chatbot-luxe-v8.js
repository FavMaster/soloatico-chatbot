/* ===============================================================
    OK SOLO ÁTICO — LUXE CHATBOT V8.1
    Header image + avatar + style premium
=============================================================== */

(function () {

  /* ------------------------------------------------------------
        CUSTOMISATION IMAGES
        Change these two lines to update header & avatar
  ------------------------------------------------------------- */
  const HEADER_IMAGE_URL = "https://soloatico.es/header.jpg";
  const AVATAR_IMAGE_URL = "https://soloatico.es/avatar.png";

  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag";

  /* -----------------------------
      GLOBAL PREMIUM STYLE
  ------------------------------ */
  const style = document.createElement("style");
  style.innerHTML = `
    #soloatico-chat-btn {
      position: fixed; bottom: 22px; right: 22px;
      width: 68px; height: 68px;
      background: #0b1c3f;
      border-radius: 50%;
      display: flex; justify-content: center; align-items: center;
      cursor: pointer; z-index: 9999999;
      box-shadow: 0 6px 18px rgba(0,0,0,0.45);
      transition: transform 0.25s ease;
    }
    #soloatico-chat-btn:hover { transform: scale(1.08); }
    #soloatico-chat-btn svg { width: 32px; height: 32px; stroke: #f2e9d8; }

    #soloatico-chat-window {
      position: fixed; bottom: 105px; right: 22px;
      width: 380px; max-width: 94vw;
      height: 560px; max-height: 80vh;
      background: #ffffff; border-radius: 20px;
      display: flex; flex-direction: column;
      box-shadow: 0 10px 40px rgba(0,0,0,0.35);
      transform: translateY(35px); opacity: 0;
      pointer-events: none; transition: 0.35s ease;
      overflow: hidden; z-index: 9999998;
    }
    #soloatico-chat-window.open {
      transform: translateY(0); opacity: 1; pointer-events: auto;
    }

    /* Header */
    #soloatico-chat-header {
      background-size: cover !important;
      background-position: center !important;
      color: #f2e9d8;
      padding: 18px;
      display: flex; align-items: center;
      gap: 14px; font-size: 19px; font-weight: 600;
      text-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    #soloatico-chat-header img {
      width: 50px; height: 50px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(255,255,255,0.7);
    }

    #soloatico-chat-messages {
      flex: 1; padding: 14px;
      overflow-y: auto; background: #faf9f7;
    }

    .msg {
      max-width: 80%;
      margin-bottom: 14px;
      padding: 12px 15px;
      border-radius: 12px;
      line-height: 1.35; font-size: 15px;
    }
    .msg.bot {
      background: #e8eef6; color: #18233b;
      border-bottom-left-radius: 4px;
    }
    .msg.user {
      background: #0b1c3f; color: #ffffff;
      border-bottom-right-radius: 4px;
      margin-left: auto;
    }

    #soloatico-chat-input-area {
      padding: 10px; background: #fff;
      border-top: 1px solid #ddd;
      display: flex; gap: 10px;
    }
    #soloatico-chat-input {
      flex: 1; border: 1px solid #ccc;
      border-radius: 10px; padding: 10px;
    }
    #soloatico-chat-send {
      background: #0b1c3f; color: #f2e9d8;
      border: none; border-radius: 10px;
      padding: 0 18px; cursor: pointer;
      font-weight: 600;
    }

    /* Mobile */
    @media(max-width:480px){
      #soloatico-chat-window{
        width:94vw; bottom:90px;
        height:76vh;
      }
    }
  `;
  document.head.appendChild(style);

  /* -----------------------------
        HTML STRUCTURE
  ------------------------------ */
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
    <div id="soloatico-chat-header" style="
      background: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)),
                  url('${HEADER_IMAGE_URL}');
    ">
      <img src="${AVATAR_IMAGE_URL}" />
      Concierge Solo Ático
    </div>

    <div id="soloatico-chat-messages"></div>

    <div id="soloatico-chat-input-area">
      <input id="soloatico-chat-input" type="text" placeholder="Écrivez votre message…">
      <button id="soloatico-chat-send">Envoyer</button>
    </div>
  `;
  document.body.appendChild(win);
/* ==========================================================
      CHATBOT LUXE V8.1 — LOGIQUE PREMIUM
========================================================== */

  const messages = document.getElementById("soloatico-chat-messages");
  const input = document.getElementById("soloatico-chat-input");
  const send = document.getElementById("soloatico-chat-send");

  /* Add message + ability to attach elements */
  function addMessage(text, sender = "bot", returnContainer = false) {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    div.innerHTML = text.replaceAll("\n", "<br>");
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return returnContainer ? div : null;
  }

  /* WhatsApp fallback button */
  function addWhatsAppButton(container) {
    const btn = document.createElement("a");
    btn.href = "https://wa.me/34621128303";
    btn.target = "_blank";
    btn.innerText = "💬 Nous écrire sur WhatsApp";
    btn.style.display = "inline-block";
    btn.style.marginTop = "10px";
    btn.style.padding = "10px 16px";
    btn.style.background = "#25D366";
    btn.style.color = "#fff";
    btn.style.textDecoration = "none";
    btn.style.borderRadius = "10px";
    btn.style.fontWeight = "600";
    btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
    container.appendChild(btn);
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";

    const lang = navigator.language.slice(0, 2);

    let data;
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message: text,
          visitor_lang: lang
        })
      });
      data = await res.json();
    } catch {
      const fallback = addMessage(
        "Bonne question ! Je ne suis pas totalement sûr… souhaitez-vous en discuter avec nous ?",
        "bot",
        true
      );
      addWhatsAppButton(fallback);
      return;
    }

    if (data.reply) {
      addMessage(data.reply, "bot");
    } else {
      const fallback = addMessage(
        "Bonne question ! Je ne suis pas totalement sûr… souhaitez-vous en discuter avec nous ?",
        "bot",
        true
      );
      addWhatsAppButton(fallback);
    }
  }

  send.onclick = sendMessage;
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  btn.onclick = () => {
    win.classList.toggle("open");

    if (win.classList.contains("open") && !win.dataset.welcome) {
      addMessage(
        "Bonjour 👋 Je suis votre concierge Solo Ático. Comment puis-je vous aider aujourd’hui ?",
        "bot"
      );
      win.dataset.welcome = "1";
    }
  };

})();
