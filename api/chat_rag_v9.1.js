// api/chat_rag_v9.1.js
/**
 * Chat RAG V9.1 — Solo Ático
 * - Uses KB (kb/full_kb_v6.json)
 * - Reads gallery from gallery/gallery.json or fallback to uploaded file /mnt/data/gallery.json
 * - If KB has no relevant entry, returns a localized WhatsApp fallback directly (no OpenAI call)
 */

import fs from "fs";
import path from "path";

const KB_PATH = path.join(process.cwd(), "kb", "full_kb_v6.json");
const SYSTEM_PROMPT_PATH = path.join(process.cwd(), "kb", "system_prompt_v9.1.txt");
const GALLERY_PATH = path.join(process.cwd(), "gallery", "gallery.json");
const FALLBACK_LOCAL_GALLERY = "/mnt/data/gallery.json"; // local upload fallback

let KB = null;
let GALLERY = null;

function loadKB() {
  if (KB) return KB;
  try {
    if (!fs.existsSync(KB_PATH)) {
      KB = [];
      return KB;
    }
    KB = JSON.parse(fs.readFileSync(KB_PATH, "utf8"));
    return KB;
  } catch (e) {
    console.error("loadKB error:", e);
    KB = [];
    return KB;
  }
}

function loadGallery() {
  if (GALLERY) return GALLERY;
  try {
    let raw = null;
    if (fs.existsSync(GALLERY_PATH)) raw = fs.readFileSync(GALLERY_PATH, "utf8");
    else if (fs.existsSync(FALLBACK_LOCAL_GALLERY)) raw = fs.readFileSync(FALLBACK_LOCAL_GALLERY, "utf8");
    if (!raw) {
      GALLERY = { galleries: [] };
      return GALLERY;
    }
    GALLERY = JSON.parse(raw);
    return GALLERY;
  } catch (e) {
    console.error("loadGallery error:", e);
    GALLERY = { galleries: [] };
    return GALLERY;
  }
}

function retrieveRelevantEntries(kb, lang, query, topK = 4) {
  if (!kb || kb.length === 0) return [];
  const q = (query || "").toLowerCase().split(/\W+/).filter(Boolean);
  const candidates = kb.filter(entry => entry.lang === lang);
  const scored = candidates.map(entry => {
    const text = ((entry.title || "") + " " + (entry.summary || "") + " " + (entry.raw || "")).toLowerCase();
    let score = 0;
    for (const w of q) if (text.includes(w)) score += 1;
    return { entry, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, topK).map(s => s.entry);
}

function findGalleryForQuery(galleryObj, query) {
  if (!query) return null;
  const q = query.toLowerCase();

  // direct album/suite match
  for (const g of galleryObj.galleries || []) {
    const keys = [
      (g.album || "").toLowerCase(),
      (g.suite || "").toLowerCase(),
      (g.base_url || "").toLowerCase()
    ].filter(Boolean);
    for (const k of keys) {
      // match on words
      const parts = k.split(/\W+/).filter(Boolean);
      if (parts.length === 0) continue;
      for (const p of parts) {
        if (p && q.includes(p)) return g;
      }
    }
  }

  // mapping fallback
  const mapping = {
    "neus": "neus",
    "bourlardes": "bourlardes",
    "bourlarde": "bourlardes",
    "blue": "blue patio",
    "blue patio": "blue patio",
    "tintorera": "tintorera",
    "bateau": "tintorera",
    "piscine": "piscine-rooftop",
    "rooftop": "piscine-rooftop",
    "reiki": "reiki",
    "logo": "logos",
    "logos": "logos",
    "vue": "vue-port-environnement",
    "port": "vue-port-environnement",
    "environnement": "vue-port-environnement",
    "what to do": "vue-port-environnement",
    "que faire": "vue-port-environnement"
  };

  for (const k of Object.keys(mapping)) {
    if (q.includes(k)) {
      const name = mapping[k];
      const found = (galleryObj.galleries || []).find(g => {
        return (g.album && g.album.toLowerCase().includes(name)) ||
               (g.suite && g.suite.toLowerCase().includes(name));
      });
      if (found) return found;
    }
  }
  return null;
}

function localizedWhatsAppFallback(lang) {
  // default French fallback
  const map = {
    fr: "Bonne question ! Je vous propose de contacter Laurent ou Sophia en cliquant sur le bouton WhatsApp ci-dessous.",
    es: "¡Buena pregunta! Le propongo contactar con Laurent o Sophia haciendo clic en el botón de WhatsApp a continuación.",
    en: "Good question! I suggest contacting Laurent or Sophia by clicking the WhatsApp button below.",
    nl: "Goede vraag! Ik stel voor contact op te nemen met Laurent of Sophia via de WhatsApp-knop hieronder.",
    cat: "Bona pregunta! Et proposo contactar amb en Laurent o la Sophia clicant el botó de WhatsApp a continuació."
  };
  return map[lang] || map["fr"];
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
    const lang = (visitor_lang || "fr").slice(0, 2).toLowerCase();

    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      // still allow images fallback, but no OpenAI
      console.warn("OPENAI_API_KEY missing.");
    }

    const kb = loadKB();
    const galleryObj = loadGallery();

    // Try to find gallery first (fast)
    const matchedGallery = findGalleryForQuery(galleryObj, user_message);

    // Try KB retrieval
    const relevant = retrieveRelevantEntries(kb, lang, user_message, 4);

    // If no KB findings -> return localized WhatsApp fallback (as requested)
    if (!relevant || relevant.length === 0) {
      const reply = localizedWhatsAppFallback(lang);
      const out = { reply };
      if (matchedGallery) {
        const base = (matchedGallery.base_url || "").replace(/\/$/, "");
        out.images = (matchedGallery.images || []).map(img => (img.startsWith("http") ? img : `${base}/${img}`));
        out.album = matchedGallery.album || matchedGallery.suite || null;
        out.album_base = base || null;
      } else {
        // include WhatsApp link for client convenience
        out.whatsapp = "https://wa.me/34621128303";
      }
      return res.status(200).json(out);
    }

    // Build RAG context
    let contextText = relevant.map(r => `Source: ${r.title} — ${r.url}\nSummary: ${r.summary}`).join("\n\n");

    // Load system prompt
    let system_prompt = "";
    if (fs.existsSync(SYSTEM_PROMPT_PATH)) {
      system_prompt = fs.readFileSync(SYSTEM_PROMPT_PATH, "utf8");
    }

    // Build messages
    const messages = [
      { role: "system", content: system_prompt },
      { role: "system", content: `Context (knowledge base):\n\n${contextText}` },
      { role: "user", content: `[lang=${lang}] ${user_message}` }
    ];

    // Call OpenAI
    const MODEL = process.env.MODEL || "gpt-3.5-turbo";
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.15,
        max_tokens: 500
      })
    });

    const data = await resp.json();
    if (data.error) return res.status(502).json({ error: data.error });

    const reply = data?.choices?.[0]?.message?.content || "Désolé, une erreur est survenue.";

    const out = { reply };

    if (matchedGallery) {
      const base = (matchedGallery.base_url || "").replace(/\/$/, "");
      out.images = (matchedGallery.images || []).map(img => (img.startsWith("http") ? img : `${base}/${img}`));
      out.album = matchedGallery.album || matchedGallery.suite || null;
      out.album_base = base || null;
    }

    return res.status(200).json(out);

  } catch (err) {
    console.error("chat_rag_v9.1 error:", err);
    return res.status(500).json({ error: err.message });
  }
}
