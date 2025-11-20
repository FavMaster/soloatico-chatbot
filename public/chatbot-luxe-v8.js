/* ============================================================
   SOLO'IA'TICO GUIDE — LUXURY CONCIERGE CHATBOT (V8)
   ============================================================ */

(function () {
  // NOTE: For deployment, put header.jpg and avatar.jpg in your project's /public/ folder
  // and replace HEADER_IMAGE_URL and AVATAR_IMAGE_URL with '/public/header.jpg' and '/public/avatar.jpg'
  const HEADER_IMAGE_URL = "/mnt/data/header.jpg"; // local uploaded file (will be transformed when deploying)
  const AVATAR_IMAGE_URL = "/mnt/data/header.jpg"; // fallback avatar (use /public/avatar.jpg in production)
  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag";

  /* -------------------------
       STYLE GLOBAL V8 - LUXE
  -------------------------- */
  const style = document.createElement("style");
  style.innerHTML = `
    /* Floating button */
    #soloia-chat-btn {
      position: fixed;
      bottom: 22px;
      right: 22px;
      width: 64px;
      height: 64px;
      background: #0b1c3f;
      border-radius: 50%;
      box-shadow: 0 6px 22px rgba(11,28,63,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.18s ease;
      z-index: 9999999;
    }
    #soloia-chat-btn:hover { transform: scale(1.06); }
    #soloia-chat-btn svg { width: 34px; height: 34px; stroke: #f2e9d8; }

    /* Window */
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
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(30px);
      pointer-events: none;
      transition: opacity 0.28s ease, transform 0.28s ease;
      z-index: 9999998;
    }
    #soloia-chat-window.open { opacity:1; transform: translateY(0); pointer-events:auto; }

    /* Header - full banner 160px */
    #soloia-chat-header {
      height: 160px;
      background-image: url('${HEADER_IMAGE_URL}');
      background-size: cover;
      background-position: center center;
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      color: #fff;
    }
    /* overlay gradient + subtle blur */
    #soloia-chat-header::after {
      content: "";
      position: absolute;
      left:0; right:0; top:0; bottom:0;
      background: linear-gradient(180deg, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.42) 100%);
      backdrop-filter: blur(4px);
    }
    #soloia-chat-header .title {
      position: relative;
      z-index: 2;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.4px;
      padding: 14px 18px;
      color: #ffffff;
      text-shadow: 0 2px 6px rgba(0,0,0,0.45);
    }

    /* Header avatar (small square left) */
    #soloia-chat-header .avatar {
      position: absolute;
      left: 14px;
      bottom: 12px;
      width: 48px;
      height: 48px;
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid rgba(242,233,216,0.12);
      z-index: 3;
      background: rgba(255,255,255,0.06);
    }
    #soloia-chat-header .avatar img { width:100%; height:100%; object-fit:cover; }

    /* Messages area */
    #soloia-chat-messages {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: #fbfaf9;
    }
    .msg-row { display:flex; align-items:flex-start; margin-bottom:12px; }
    .msg-row.user { justify-content: flex-end; }
    .msg { max-width: 78%; padding: 10px 14px; border-radius: 12px; line-height:1.35; font-size:14px; word-wrap:break-word; }
    .msg.bot { background: #eaf2fb; color:#152033; border-bottom-left-radius:6px; position:relative; }
    .msg.user { background:#0b1c3f; color:#fff; border-bottom-right-radius:6px; }

    /* Bot avatar next to messages */
    .msg-avatar { width:36px; height:36px; border-radius:8px; overflow:hidden; margin-right:10px; flex-shrink:0; }
    .msg-avatar img { width:100%; height:100%; object-fit:cover; }

    /* Input */
    #soloia-chat-input-area { display:flex; padding:10px; border-top:1px solid #eee; background:#fff; }
    #soloia-chat-input { flex:1; border:1px solid #ddd; border-radius:10px; padding:10px; font-size:14px; }
    #soloia-chat-send { margin-left:8px; background:#0b1c3f; color:#f2e9d8; padding:8px 14px; border:none; border-radius:10px; cursor:pointer; }
    #soloia-chat-send:hover { background:#15316c; }

    /* Button style inside messages (link buttons) */
    .link-btn { display:inline-block; background:#0b1c3f; color:#f2e9d8; padding:8px 12px; border-radius:8px; text-decoration:none; font-size:13px; margin-top:8px; }

    /* MOBILE */
    @media (max-width: 480px) {
      #soloia-chat-window { bottom:86px; right:10px; width:92vw; height:78vh; }
      #soloia-chat-header { height: 120px; }
      #soloia-chat-header .title { font-size:18px; }
    }
  `;
  document.head.appendChild(style);

  /* -------------------------
       HTML STRUCTURE V8
  -------------------------- */
  const btn = document.createElement('div');
  btn.id = 'soloia-chat-btn';
  btn.innerHTML = `
    <svg fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  `;
  document.body.appendChild(btn);

  const win = document.createElement('div');
  win.id = 'soloia-chat-window';
  win.innerHTML = `
    <div id="soloia-chat-header">
      <div class="avatar"><img src="${AVATAR_IMAGE_URL}" alt="avatar"></div>
      <div class="title">Solo'IA'tico Guide</div>
    </div>
    <div id="soloia-chat-messages"></div>
    <div id="soloia-chat-input-area">
      <input id="soloia-chat-input" type="text" placeholder="Écrivez votre message…">
      <button id="soloia-chat-send">Envoyer</button>
    </div>
  `;
  document.body.appendChild(win);

  const messages = document.getElementById('soloia-chat-messages');
  const input = document.getElementById('soloia-chat-input');
  const send = document.getElementById('soloia-chat-send');

  /* -------------------------
       UTIL : linkify -> smart buttons
  -------------------------- */
  function linkifyButtons(text) {
    // replace URLs by smart buttons
    return text.replace(/(https?:\/\/[^\s]+)/g, function(url) {
      let label = 'Ouvrir le lien';
      if (url.includes('soloatico.es')) label = 'Voir Solo Ático';
      else if (url.includes('wa.me') || url.includes('whatsapp')) label = 'Envoyer un message WhatsApp';
      else if (url.includes('maps.google')) label = 'Ouvrir dans Google Maps';
      else if (url.startsWith('mailto:')) label = 'Envoyer un email';

      return `<a class="link-btn" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
  }

  /* -------------------------
       MESSAGE RENDERING
  -------------------------- */
  function renderBotMessageHTML(text) {
    // support simple paragraphs and link buttons
    const html = linkifyButtons(escapeHtml(text)).replace(/\n/g, '<br>');
    return html;
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function addMessage(text, sender = 'bot') {
    const row = document.createElement('div');
    row.className = `msg-row ${sender}`;

    if (sender === 'bot') {
      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'msg-avatar';
      const img = document.createElement('img');
      img.src = AVATAR_IMAGE_URL;
      img.alt = 'bot';
      avatarWrap.appendChild(img);

      const bubble = document.createElement('div');
      bubble.className = 'msg bot';
      bubble.innerHTML = renderBotMessageHTML(text);

      row.appendChild(avatarWrap);
      row.appendChild(bubble);

    } else {
      const bubble = document.createElement('div');
      bubble.className = 'msg user';
      bubble.textContent = text;
      row.appendChild(bubble);
    }

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  /* -------------------------
       SEND MESSAGE & API
  -------------------------- */
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';

    const lang = navigator.language.slice(0,2);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: text, visitor_lang: lang })
      });

      const data = await response.json();
      if (data.reply) {
        addMessage(data.reply, 'bot');
      } else {
        addMessage('Désolé, une erreur est survenue.', 'bot');
      }
    } catch (e) {
      addMessage('Erreur de connexion au serveur.', 'bot');
    }
  }

  send.onclick = sendMessage;
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

  /* -------------------------
       OPEN / CLOSE
  -------------------------- */
  btn.onclick = () => { win.classList.toggle('open'); };

})();