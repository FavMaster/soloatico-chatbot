/* ============================================================
   SOLO'IA'TICO — LUXURY CONCIERGE CHATBOT (V8.3)
   - Mobile optimized
   - Performance & DOM minimal updates
   - Typing indicator, fetch timeout, reduced-motion support
   ============================================================ */

(function () {
  // -------------------- CONFIG --------------------
  const HEADER_IMAGE_URL = "https://soloatico.es/header.jpg";
  const AVATAR_IMAGE_URL = "https://soloatico.es/avatar.png";
  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag";
  const FETCH_TIMEOUT_MS = 12000; // 12s timeout for API calls
  const TYPING_MIN_MS = 400; // minimal typing UI display
  const TYPING_MAX_MS = 2200; // cap typing for realism
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // -------------------- UTIL --------------------
  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const k in props) {
      if (k === "class") node.className = props[k];
      else if (k === "html") node.innerHTML = props[k];
      else node.setAttribute(k, props[k]);
    }
    children.forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function safeText(s) {
    if (s == null) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function linkifyButtons(text) {
    // keep safeText applied by callers if needed
    return text.replace(/(https?:\/\/[^\s]+)/g, function (url) {
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
        .then(r => {
          clearTimeout(timer);
          resolve(r);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  // -------------------- STYLES (minimal repaint) --------------------
  const style = document.createElement("style");
  style.innerHTML = `
    :root{--accent:#0b1c3f;--accent-light:#15316c;--ivory:#f2e9d8}
    #soloia-chat-btn{position:fixed;bottom:18px;right:18px;width:60px;height:60px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;z-index:9999999;box-shadow:0 8px 28px rgba(0,0,0,.35);cursor:pointer;transition:transform .15s ease,box-shadow .2s ease}
    #soloia-chat-btn:active{transform:scale(.98)}
    #soloia-chat-btn svg{width:30px;height:30px;stroke:var(--ivory)}
    #soloia-chat-window{position:fixed;right:14px;bottom:88px;width:360px;max-width:94vw;height:64vh;max-height:78vh;border-radius:14px;background:#fff;box-shadow:0 20px 50px rgba(0,0,0,.45);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(18px);pointer-events:none;transition:opacity .22s ease,transform .22s ease;z-index:9999998}
    #soloia-chat-window.open{opacity:1;transform:translateY(0);pointer-events:auto}
    #soloia-chat-header{height:130px;background-image:url('${HEADER_IMAGE_URL}');background-size:cover;background-position:center;position:relative;display:flex;align-items:flex-end;justify-content:center;color:#fff}
    #soloia-chat-header::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.44))}
    #soloia-chat-header .title{position:relative;z-index:2;padding-bottom:12px;font-weight:700;font-size:18px;text-shadow:0 2px 6px rgba(0,0,0,.45)}
    #soloia-chat-header .avatar{position:absolute;left:12px;bottom:10px;width:44px;height:44px;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.36);z-index:3}
    #soloia-chat-header .avatar img{width:100%;height:100%;object-fit:cover;display:block}
    #soloia-chat-messages{flex:1;padding:12px 12px 8px 12px;overflow:auto;background:#fbfaf9 -webkit-overflow-scrolling:touch}
    .msg-row{display:flex;align-items:flex-start;margin-bottom:10px}
    .msg-row.user{justify-content:flex-end}
    .msg{max-width:78%;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.35}
    .msg.bot{background:#eaf2fb;color:#112233;border-bottom-left-radius:6px}
    .msg.user{background:var(--accent);color:#fff;border-bottom-right-radius:6px}
    .msg-avatar{width:34px;height:34px;border-radius:6px;margin-right:8px;flex-shrink:0;overflow:hidden}
    .msg-avatar img{width:100%;height:100%;object-fit:cover;display:block}
    #soloia-chat-input-area{display:flex;padding:10px;border-top:1px solid #eee;background:#fff}
    #soloia-chat-input{flex:1;border:1px solid #e4e4e4;padding:10px;border-radius:10px;font-size:14px}
    #soloia-chat-send{margin-left:8px;background:var(--accent);color:var(--ivory);border:0;padding:8px 14px;border-radius:10px;cursor:pointer}
    .link-btn{display:inline-block;background:var(--accent);color:var(--ivory);padding:7px 10px;border-radius:8px;margin-top:6px;text-decoration:none;font-size:13px}
    .typing-indicator{display:inline-block;vertical-align:middle;padding:6px 10px;border-radius:10px;background:#fff3;backdrop-filter:blur(2px);font-size:13px;color:#334}
    @media(max-width:480px){#soloia-chat-window{right:8px;bottom:86px;width:94vw;height:78vh}}
  `;
  document.head.appendChild(style);

  // -------------------- STRUCTURE (create minimal nodes) --------------------
  const btn = el("div", { id: "soloia-chat-btn", role: "button", "aria-label": "Ouvrir le chat" },
    htmlSvg()
  );
  document.body.appendChild(btn);

  const win = el("div", { id: "soloia-chat-window", role: "dialog", "aria-hidden": "true" },
    el("div", { id: "soloia-chat-header", class: "header" },
       el("div", { class: "avatar" }, el("img", { src: AVATAR_IMAGE_URL, alt: "Avatar" })),
       el("div", { class: "title", html: "Solo’IA’tico Assistant" })
    ),
    el("div", { id: "soloia-chat-messages", role: "log", "aria-live": "polite" }),
    el("div", { id: "soloia-chat-input-area" },
       el("input", { id: "soloia-chat-input", placeholder: "Écrivez votre message…", "aria-label":"Message" }),
       el("button", { id: "soloia-chat-send", type: "button" }, "Envoyer")
    )
  );
  document.body.appendChild(win);

  const messages = document.getElementById("soloia-chat-messages");
  const input = document.getElementById("soloia-chat-input");
  const send = document.getElementById("soloia-chat-send");

  // -------------------- HELPER UI --------------------
  function createMsgRow({ textHTML, from = "bot", allowHtml = false }) {
    const rowClass = "msg-row " + (from === "user" ? "user" : "bot");
    const row = el("div", { class: rowClass });
    if (from === "bot") {
      const avatar = el("div", { class: "msg-avatar", html: `<img src="${AVATAR_IMAGE_URL}" alt="avatar">` });
      const bubble = el("div", { class: "msg bot" });
      if (allowHtml) bubble.innerHTML = textHTML;
      else bubble.innerHTML = renderBotMessage(textHTML);
      row.appendChild(avatar);
      row.appendChild(bubble);
    } else {
      const bubble = el("div", { class: "msg user", html: safeText(textHTML) });
      row.appendChild(bubble);
    }
    return row;
  }

  function appendRow(row) {
    // reduce layout thrash by batching with requestAnimationFrame
    window.requestAnimationFrame(() => {
      messages.appendChild(row);
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function renderBotMessage(rawText) {
    // render: escape -> linkify -> nl2br
    const escaped = safeText(rawText);
    const withLinks = linkifyButtons(escaped);
    return withLinks.replace(/\n/g, "<br>");
  }

  // -------------------- TYPING INDICATOR --------------------
  let typingNode = null;
  function showTyping() {
    if (typingNode) return;
    typingNode = el("div", { class: "msg-row bot" },
      el("div", { class: "msg-avatar", html: `<img src="${AVATAR_IMAGE_URL}" alt="avatar">` }),
      el("div", { class: "msg bot typing-indicator", html: "Solo’IA’tico rédige…" })
    );
    appendRow(typingNode);
  }
  function hideTyping() {
    if (!typingNode) return;
    typingNode.remove();
    typingNode = null;
  }

  // -------------------- WELCOME (HTML safe) --------------------
  function addWelcomeMessage() {
    const html =
      "👋 Bonjour et bienvenue !<br><br>" +
      "Je suis <b>Solo’IA’tico Assistant</b>.<br>" +
      "Posez-moi vos questions concernant :<br>" +
      "• <b>Suites & Réservation</b><br>" +
      "• <b>Bateau Tintorera</b><br>" +
      "• <b>Reiki & Bien-être</b><br>" +
      "• <b>Que faire à L’Escala</b><br><br>" +
      "Comment puis-je vous aider ?";
    const row = createMsgRow({ textHTML: html, from: "bot", allowHtml: true });
    appendRow(row);
  }

  // -------------------- MESSAGE FLOW --------------------
  function addUserMessage(text) {
    const row = createMsgRow({ textHTML: text, from: "user" });
    appendRow(row);
  }

  function addBotMessage(text) {
    const row = createMsgRow({ textHTML: text, from: "bot", allowHtml: false });
    appendRow(row);
  }

  // -------------------- API CALL (with timeout & error handling) --------------------
  async function callAPI(payload) {
    try {
      const r = await timeoutFetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, FETCH_TIMEOUT_MS);
      if (!r.ok) {
        let errText = "Erreur serveur";
        try { const j = await r.json(); errText = j.error?.message || j.error || errText; } catch(e){}
        throw new Error(errText);
      }
      return await r.json();
    } catch (err) {
      throw err;
    }
  }

  // -------------------- SEND MESSAGE (debounced minimal UI) --------------------
  let sending = false;
  async function sendMessage() {
    if (sending) return;
    const text = input.value.trim();
    if (!text) return;
    sending = true;
    addUserMessage(text);
    input.value = "";
    input.disabled = true;
    send.disabled = true;

    // show typing
    if (!REDUCED_MOTION) showTyping();

    const lang = navigator.language.slice(0, 2) || "fr";
    const start = performance.now();

    try {
      // schedule call during idle if possible to reduce jank
      const payload = { user_message: text, visitor_lang: lang };
      await new Promise(resolve => {
        if ("requestIdleCallback" in window) requestIdleCallback(resolve, { timeout: 250 });
        else setTimeout(resolve, 100);
      });

      const respPromise = callAPI(payload);

      // enforce minimum typing UI delay for UX
      const timerPromise = new Promise(r => setTimeout(r, TYPING_MIN_MS));
      const result = await Promise.race([
        respPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), FETCH_TIMEOUT_MS))
      ]);

      // ensure typing indicator shown at least a bit
      const elapsed = performance.now() - start;
      if (elapsed < TYPING_MIN_MS) await new Promise(r => setTimeout(r, TYPING_MIN_MS - elapsed));

      hideTyping();

      if (result && result.reply) {
        // small artificial delay for realism but under cap
        const realisticDelay = Math.min(TYPING_MAX_MS, 200 + result.reply.length * 6);
        await new Promise(r => setTimeout(r, Math.min(600, realisticDelay)));
        addBotMessage(result.reply);
      } else {
        addBotMessage("Désolé, une erreur est survenue.");
      }
    } catch (err) {
      hideTyping();
      addBotMessage("Erreur de connexion au serveur.");
      console.error("Chat API error:", err);
    } finally {
      sending = false;
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  }

  // -------------------- EVENTS (passive where possible) --------------------
  send.addEventListener("click", sendMessage, { passive: true });
  input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); }, { passive: true });

  // Toggle open/close, accessible
  btn.addEventListener("click", () => {
    const isOpen = win.classList.toggle("open");
    win.setAttribute("aria-hidden", (!isOpen).toString());
    if (isOpen && messages.children.length === 0) {
      // use requestAnimationFrame to avoid layout thrash on open
      requestAnimationFrame(addWelcomeMessage);
    }
  }, { passive: true });

  // keyboard ESC to close
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && win.classList.contains("open")) {
      win.classList.remove("open");
      win.setAttribute("aria-hidden", "true");
    }
  });

  // -------------------- SMALL HELPERS --------------------
  function htmlSvg() {
    return (function () {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("fill","none");
      svg.setAttribute("stroke-width","2");
      svg.setAttribute("stroke-linecap","round");
      svg.setAttribute("stroke-linejoin","round");
      const path = document.createElementNS("http://www.w3.org/2000/svg","path");
      path.setAttribute("d","M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z");
      svg.appendChild(path);
      return svg;
    })();
  }

  // make el(...) able to accept html content via props.html (used above)
  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const k in props) {
      if (k === "class") node.className = props[k];
      else if (k === "html") node.innerHTML = props[k];
      else node.setAttribute(k, props[k]);
    }
    children.forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // expose debug if needed
  window.SoloIaticoChat = {
    open: () => { if (!win.classList.contains("open")) btn.click(); },
    close: () => { if (win.classList.contains("open")) btn.click(); }
  };

  // Accessibility: focus input on open
  const observer = new MutationObserver((mut) => {
    mut.forEach(m => {
      if (m.attributeName === "class") {
        if (win.classList.contains("open")) {
          input.focus();
        }
      }
    });
  });
  observer.observe(win, { attributes: true });

  // done
})();
