// api/chat_rag_v8.5.js
/**
 * Chat RAG V8.5 — Solo Ático
 * - Uses KB (kb/full_kb_v6.json)
 * - Reads gallery from gallery/gallery.json or fallback /mnt/data/gallery.json
 * - If KB has no relevant entry, returns a localized WhatsApp fallback (no hallucination)
 */

import fs from "fs";
import path from "path";

const KB_PATH = path.join(process.cwd(), "kb", "full_kb_v6.json");
const SYSTEM_PROMPT_PATH = path.join(process.cwd(), "kb", "system_prompt_v9.1.txt"); // keep v9.1 prompt or v6 if you prefer
const GALLERY_PATH = path.join(process.cwd(), "gallery", "gallery.json");
const FALLBACK_LOCAL_GALLERY = "/mnt/data/gallery.json";

function safeReadJson(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error("safeReadJson error", p, e);
    return null;
  }
}

function loadKB() {
  const kb = safeReadJson(KB_PATH);
  return kb || [];
}

function loadGallery() {
  let g = safeReadJson(GALLERY_PATH);
  if (!g) g = safeReadJson(FALLBACK_LOCAL_GALLERY);
  return g || { galleries: [] };
}

function retrieveRelevantEntries(kb, lang, query, topK = 4) {
  if (!kb || kb.length === 0) return [];
  const q = (query || "").toLowerCase().split(/\W+/).filter(Boolean);
  const candidates = kb.filter(entry => entry.lang === lang);
  const scored = candidates.map(entry => {
    const text = `${entry.title || ""} ${entry.summary || ""} ${entry.raw || ""}`.toLowerCase();
    let score = 0;
    for (const w of q) if (text.includes(w)) score += 1;
    return { entry, score };
  });
  scored.sort((a,b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, topK).map(s => s.entry);
}

function findGalleryForQuery(galleryObj, query) {
  if (!query) return null;
  const q = query.toLowerCase();
  for (const g of galleryObj.galleries || []) {
    const keys = [(g.album||""), (g.suite||""), (g.base_url||"")].map(s=>String(s).toLowerCase());
    for (const k of keys) {
      if (!k) continue;
      const parts = k.split(/\W+/).filter(Boolean);
      for (const p of parts) if (p && q.includes(p)) return g;
    }
  }
  // mapping fallback
  const mapping = {
    "neus":"neus","bourlardes":"bourlardes","bourlarde":"bourlardes",
    "blue":"blue patio","blue patio":"blue patio","tintorera":"tintorera","bateau":"tintorera",
    "piscine":"piscine-rooftop","rooftop":"piscine-rooftop","reiki":"reiki",
    "logo":"logos","logos":"logos","vue":"vue-port-environnement","port":"vue-port-environnement"
  };
  for (const k in mapping) if (q.includes(k)) {
    const name = mapping[k];
    const found = (galleryObj.galleries||[]).find(g => ((g.album||"").toLowerCase().includes(name) || (g.suite||"").toLowerCase().includes(name)));
    if (found) return found;
  }
  return null;
}

function localizedWhatsAppFallback(lang) {
  const map = {
    fr: "Bonne question ! Je vous propose de contacter Laurent ou Sophia en cliquant sur le bouton WhatsApp ci-dessous.",
    es: "¡Buena pregunta! Le propongo contactar con Laurent o Sophia haciendo clic en el botón de WhatsApp a continuación.",
    en: "Good question! I suggest contacting Laurent or Sophia by clicking the WhatsApp button below.",
    nl: "Goede vraag! Ik stel voor contact op te nemen met Laurent of Sophia via de WhatsApp-knop hieronder.",
    cat: "Bona pregunta! Et proposo contactar amb en Laurent o la Sophia clicant el botó de WhatsApp a continuació."
  };
  return map[lang] || map['fr'];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { user_message, visitor_lang } = req.body || {};
    if (!user_message) return res.status(400).json({ error: "Missing user_message" });
    const lang = (visitor_lang || "fr").slice(0,2).toLowerCase();

    const kb = loadKB();
    const galleryObj = loadGallery();

    // attempt gallery match first (fast)
    const matchedGallery = findGalleryForQuery(galleryObj, user_message);

    // KB retrieval
    const relevant = retrieveRelevantEntries(kb, lang, user_message, 4);

    // If no KB results -> return localized WhatsApp fallback (no hallucination)
    if (!relevant || relevant.length === 0) {
      const reply = localizedWhatsAppFallback(lang);
      const out = { reply };
      if (matchedGallery) {
        const base = (matchedGallery.base_url||"").replace(/\/$/,"");
        out.images = (matchedGallery.images||[]).map(img => img.startsWith("http") ? img : `${base}/${img}`);
        out.album = matchedGallery.album || matchedGallery.suite || null;
        out.album_base = base || null;
      } else {
        out.whatsapp = "https://wa.me/34621128303";
      }
      return res.status(200).json(out);
    }

    // Build context for RAG
    const contextText = relevant.map(r => `Source: ${r.title} — ${r.url}\nSummary: ${r.summary}`).join("\n\n");

    const system_prompt = fs.existsSync(SYSTEM_PROMPT_PATH) ? fs.readFileSync(SYSTEM_PROMPT_PATH, "utf8") : "";

    const messages = [
      { role: "system", content: system_prompt },
      { role: "system", content: `Context (knowledge base):\n\n${contextText}` },
      { role: "user", content: `[lang=${lang}] ${user_message}` }
    ];

    if (!process.env.OPENAI_API_KEY) {
      // If no API key, return safe fallback with KB summary
      const reply = relevant.map(r => `${r.title}: ${r.summary}`).join("\n\n");
      const out = { reply };
      if (matchedGallery) {
        const base = (matchedGallery.base_url||"").replace(/\/$/,"");
        out.images = (matchedGallery.images||[]).map(img => img.startsWith("http") ? img : `${base}/${img}`);
        out.album = matchedGallery.album || matchedGallery.suite || null;
        out.album_base = base || null;
      }
      return res.status(200).json(out);
    }

    // Call OpenAI
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.MODEL || "gpt-3.5-turbo",
        messages,
        temperature: 0.18,
        max_tokens: 500
      })
    });

    const data = await resp.json();
    if (data.error) return res.status(502).json({ error: data.error });

    const reply = data?.choices?.[0]?.message?.content || "Désolé, une erreur est survenue.";
    const out = { reply };

    if (matchedGallery) {
      const base = (matchedGallery.base_url||"").replace(/\/$/,"");
      out.images = (matchedGallery.images||[]).map(img => img.startsWith("http") ? img : `${base}/${img}`);
      out.album = matchedGallery.album || matchedGallery.suite || null;
      out.album_base = base || null;
    }

    return res.status(200).json(out);

  } catch (err) {
    console.error("chat_rag_v8.5 error:", err);
    return res.status(500).json({ error: err.message });
  }
}
/* chatbot-luxe-v8.5.js
   Based on user's chatbot-luxe-v8.4.js (file received at: /mnt/data/chatbot-luxe-v8.4.js)
   Restores avatar, typing, bubble styles, adds compact image carousel + WhatsApp CTA bottom.
*/

(function () {
  const HEADER_IMAGE_URL = "https://soloatico.es/header.jpg";
  const AVATAR_IMAGE_URL = "https://soloatico.es/avatar.png";
  const API_URL = "https://soloatico-chatbot.vercel.app/api/chat_rag_v8.5";
  const WHATSAPP_LINK = "https://wa.me/34621128303";

  const TYPING_SPEED_MS = 22;
  const FETCH_TIMEOUT_MS = 12000;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Styles (copying V8.4 look + compact carousel)
  const style = document.createElement("style");
  style.innerHTML = `
    :root { --dark:#0b1c3f; --ivory:#f2e9d8; --accent:#0b1c3f; }
    #soloia-chat-btn{ position:fixed; bottom:22px; right:22px; width:64px; height:64px; background:var(--dark); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 6px 22px rgba(11,28,63,0.45); z-index:9999999; }
    #soloia-chat-btn svg{ width:34px; height:34px; stroke:var(--ivory); }
    #soloia-chat-window{ position:fixed; bottom:100px; right:22px; width:380px; max-width:94vw; height:560px; max-height:80vh; background:#fff; border-radius:18px; box-shadow:0 12px 40px rgba(0,0,0,0.42); overflow:hidden; display:flex; flex-direction:column; transform:translateY(30px); opacity:0; pointer-events:none; transition:all .28s ease; z-index:9999998; }
    #soloia-chat-window.open{ transform:translateY(0); opacity:1; pointer-events:auto; }
    #soloia-chat-header{ height:160px; background-image:url('${HEADER_IMAGE_URL}'); background-size:cover; background-position:center; position:relative; display:flex; align-items:flex-end; justify-content:center; }
    #soloia-chat-header::after{ content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45)); }
    #soloia-chat-header .avatar{ position:absolute; left:14px; bottom:12px; width:48px; height:48px; border-radius:10px; overflow:hidden; z-index:2; }
    #soloia-chat-header .avatar img{ width:100%; height:100%; object-fit:cover; }
    #soloia-chat-header .title{ position:relative; z-index:2; font-size:20px; font-weight:700; color:#fff; padding-bottom:14px; text-shadow:0 2px 6px rgba(0,0,0,0.35);}
    #soloia-chat-messages{ flex:1; padding:14px; overflow-y:auto; background:#fbfaf9; }
    .msg-row{ display:flex; margin-bottom:12px; }
    .msg-row.user{ justify-content:flex-end; }
    .msg{ max-width:78%; padding:10px 14px; border-radius:12px; font-size:14px; line-height:1.42; }
    .msg.bot{ background:#eaf2fb; color:#152033; border-bottom-left-radius:6px; }
    .msg.user{ background:var(--dark); color:#fff; border-bottom-right-radius:6px; }
    .msg-avatar{ width:36px; height:36px; border-radius:8px; overflow:hidden; margin-right:10px; }
    .link-btn{ display:inline-block; background:var(--accent); color:var(--ivory); padding:8px 12px; border-radius:8px; margin-top:8px; text-decoration:none; font-size:13px; }

    /* compact carousel */
    .carousel-wrap{ margin-top:8px; width:100%; overflow:hidden; padding:6px 0; }
    .carousel-track{ display:flex; gap:8px; transition:transform .32s ease; }
    .carousel-item{ width:110px; height:78px; flex:0 0 auto; border-radius:8px; overflow:hidden; box-shadow:0 8px 18px rgba(0,0,0,0.12); }
    .carousel-item img{ width:100%; height:100%; object-fit:cover; display:block; }

    .carousel-controls{ display:flex; justify-content:center; gap:8px; margin-top:6px; }
    .carousel-btn{ background:var(--accent); color:var(--ivory); border:none; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:12px; }

    #soloia-chat-input-area{ display:flex; padding:10px; border-top:1px solid #eee; background:#fff; gap:8px; }
    #soloia-chat-input{ flex:1; border:1px solid #ddd; border-radius:10px; padding:10px; }
    #soloia-chat-send{ background:var(--accent); color:var(--ivory); padding:8px 14px; border-radius:10px; border:none; cursor:pointer; }

    /* whatsapp CTA bottom */
    #soloia-whatsapp-cta{ position:fixed; right:22px; bottom:18px; z-index:9999997; display:flex; gap:10px; align-items:center; background:linear-gradient(90deg,#25D366,#128C7E); color:#fff; padding:10px 14px; border-radius:999px; box-shadow:0 12px 30px rgba(0,0,0,0.2); cursor:pointer; text-decoration:none; font-weight:600; }
    #soloia-whatsapp-cta img{ width:20px; height:20px; margin-right:6px; }

    @media (max-width:480px){
      #soloia-chat-window{ right:10px; left:10px; width:calc(100% - 20px); bottom:90px; height:72vh; }
      .carousel-item{ width:90px; height:64px; }
    }
  `;
  document.head.appendChild(style);

  // Build DOM
  const btn = document.createElement("div");
  btn.id = "soloia-chat-btn";
  btn.innerHTML = `<svg fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  document.body.appendChild(btn);

  const win = document.createElement("div");
  win.id = "soloia-chat-window";
  win.innerHTML = `
    <div id="soloia-chat-header">
      <div class="avatar"><img src="${AVATAR_IMAGE_URL}" alt="avatar"></div>
      <div class="title">Solo’IA’tico Assistant</div>
    </div>
    <div id="soloia-chat-messages"></div>
    <div id="soloia-chat-input-area">
      <input id="soloia-chat-input" placeholder="Écrivez votre message…"/>
      <button id="soloia-chat-send">Envoyer</button>
    </div>
  `;
  document.body.appendChild(win);

  // WhatsApp CTA bottom
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

  // Helpers
  function escapeHtml(s){ if(!s) return ""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function linkifyButtons(text){ return text.replace(/(https?:\/\/[^\s]+)/g, url => `<a class="link-btn" href="${url}" target="_blank" rel="noopener noreferrer">Voir</a>`); }

  function addRow(text, sender="bot", html=false) {
    const row = document.createElement("div");
    row.className = "msg-row " + (sender==="user" ? "user": "bot");
    if (sender !== "user") {
      const avatar = document.createElement("div");
      avatar.className = "msg-avatar";
      avatar.innerHTML = `<img src="${AVATAR_IMAGE_URL}" alt="avatar">`;
      const bubble = document.createElement("div");
      bubble.className = "msg bot";
      bubble.innerHTML = html ? text : linkifyButtons(escapeHtml(text)).replace(/\n/g,"<br>");
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
    return row;
  }

  // typing effect
  async function typeWriter(text) {
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
      span.innerHTML = linkifyButtons(escapeHtml(text)).replace(/\n/g,"<br>");
      return;
    }
    let i = 0;
    while (i < text.length) {
      i += Math.max(1, Math.floor(text.length / 40));
      span.textContent = text.slice(0, i);
      await new Promise(r => setTimeout(r, TYPING_SPEED_MS));
      messages.scrollTop = messages.scrollHeight;
    }
    span.innerHTML = linkifyButtons(escapeHtml(text)).replace(/\n/g,"<br>");
  }

  // render compact carousel
  function renderCarousel(images, baseUrl) {
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
      const w = (track.children[0] ? track.children[0].clientWidth + 8 : 118);
      track.style.transform = `translateX(-${idx * w}px)`;
    }
    prev.addEventListener("click", ()=>{ idx = Math.max(0, idx-1); update(); });
    next.addEventListener("click", ()=>{ idx = Math.min(track.children.length-1, idx+1); update(); });
    // touch
    let startX = 0;
    track.addEventListener("touchstart", e => startX = e.touches[0].clientX);
    track.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - startX; if (dx>30) idx = Math.max(0, idx-1); else if (dx<-30) idx = Math.min(track.children.length-1, idx+1); update(); });

    setTimeout(update, 300);
    return wrap;
  }

  // API call
  async function askServer(text) {
    addRow(text, "user");
    // typing indicator (small)
    const typingRow = addRow("...", "bot");
    const typingBubble = typingRow.querySelector(".msg");
    typingBubble.innerHTML = `<span class="typing">...</span>`;

    try {
      const lang = (navigator.language || "fr").slice(0,2).toLowerCase();
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ user_message: text, visitor_lang: lang })
      });
      const j = await resp.json();
      // remove typing row
      typingRow.remove();

      if (j.reply) {
        await typeWriter(j.reply);
      } else {
        await typeWriter("Je suis désolé, une erreur est survenue.");
      }

      if (j.images && j.images.length) {
        const lastBubbleRow = document.createElement("div");
        lastBubbleRow.className = "msg-row bot";
        const av = document.createElement("div");
        av.className = "msg-avatar";
        av.innerHTML = `<img src="${AVATAR_IMAGE_URL}" alt="avatar">`;
        const bubble = document.createElement("div");
        bubble.className = "msg bot";
        const carousel = renderCarousel(j.images, j.album_base || "");
        if (carousel) bubble.appendChild(carousel);
        lastBubbleRow.appendChild(av);
        lastBubbleRow.appendChild(bubble);
        messages.appendChild(lastBubbleRow);
        messages.scrollTop = messages.scrollHeight;
      }

      // if API returned whatsapp direct link
      if (j.whatsapp) {
        const r = document.createElement("div");
        r.className = "msg-row bot";
        const av2 = document.createElement("div");
        av2.className = "msg-avatar";
        av2.innerHTML = `<img src="${AVATAR_IMAGE_URL}" alt="avatar">`;
        const bubble2 = document.createElement("div");
        bubble2.className = "msg bot";
        bubble2.innerHTML = `<a class="link-btn" href="${j.whatsapp}" target="_blank">Contacter sur WhatsApp</a>`;
        r.appendChild(av2);
        r.appendChild(bubble2);
        messages.appendChild(r);
        messages.scrollTop = messages.scrollHeight;
      }

    } catch (err) {
      console.error(err);
      try { messages.querySelector(".typing")?.parentElement?.parentElement?.remove(); } catch(e){}
      await typeWriter("Erreur de connexion au serveur. Vous pouvez contacter Laurent ou Sophia via le bouton WhatsApp en bas.");
    }
  }

  send.addEventListener("click", ()=> {
    const t = input.value.trim(); if (!t) return; input.value = ""; askServer(t);
  });
  input.addEventListener("keypress", e => { if (e.key === "Enter") { const t = input.value.trim(); if (!t) return; input.value = ""; askServer(t); } });

  btn.addEventListener("click", ()=> {
    const opened = win.classList.toggle("open");
    if (opened && messages.children.length === 0) {
      typeWriter("Bonjour 👋\nJe suis Solo’IA’tico Assistant. Comment puis-je vous aider aujourd'hui ?");
    }
  });

  // expose simple controls
  window.SoloIaticoChat = {
    open: ()=> { if (!win.classList.contains("open")) btn.click(); },
    close: ()=> { if (win.classList.contains("open")) btn.click(); }
  };

})();
