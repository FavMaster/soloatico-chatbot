/* ============================================================
   SOLO'IA'TICO GUIDE — LUXURY CONCIERGE CHATBOT (V8)
   ============================================================ */

(function () {
  const HEADER_IMAGE_URL = "/header.jpg";
  const AVATAR_IMAGE_URL = "/avatar.jpg";
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
       HTML STRUCTURE — V8 (Widget)
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
      <input id="soloia-chat-input" type="text" placeholder="Écrivez votre message…">
      <button id="soloia-chat-send">Envoyer</button>
    </div>
  `;
  document.body.appendChild(win);

  const messages = document.getElementById("soloia-chat-messages");
  const input = document.getElementById("soloia-chat-input");
  const send = document.getElementById("soloia-chat-send");


})();
