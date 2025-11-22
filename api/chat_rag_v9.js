// api/chat_rag_v9.js
import fs from "fs";
import path from "path";

const KB_PATH = path.join(process.cwd(), "kb", "full_kb_v6.json");
const SYSTEM_PROMPT_PATH = path.join(process.cwd(), "kb", "system_prompt_v9.txt");
// Default gallery location in repo; will fall back to local uploaded copy if present
const GALLERY_PATH = path.join(process.cwd(), "gallery", "gallery.json");
const FALLBACK_LOCAL_GALLERY = "/mnt/data/gallery.json";

let KB = null;
function loadKB() {
  if (KB) return KB;
  if (!fs.existsSync(KB_PATH)) return [];
  const raw = fs.readFileSync(KB_PATH, "utf8");
  KB = JSON.parse(raw);
  return KB;
}

let GALLERY = null;
function loadGallery() {
  if (GALLERY) return GALLERY;
  let raw = null;
  if (fs.existsSync(GALLERY_PATH)) raw = fs.readFileSync(GALLERY_PATH, "utf8");
  else if (fs.existsSync(FALLBACK_LOCAL_GALLERY)) raw = fs.readFileSync(FALLBACK_LOCAL_GALLERY, "utf8");
  if (!raw) {
    GALLERY = { galleries: [] };
    return GALLERY;
  }
  try {
    GALLERY = JSON.parse(raw);
  } catch (e) {
    console.error("Invalid gallery.json:", e);
    GALLERY = { galleries: [] };
  }
  return GALLERY;
}

function retrieveRelevantEntries(kb, lang, query, topK = 4) {
  if (!kb || kb.length === 0) return [];
  const q = (query || "").toLowerCase().split(/\W+/).filter(Boolean);
  const candidates = kb.filter(entry => entry.lang === lang);
  const scored = candidates.map(entry => {
    const text = (entry.title + " " + entry.summary + " " + entry.raw).toLowerCase();
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

  for (const g of galleryObj.galleries || []) {
    const candidates = [
      (g.album || "").toLowerCase(),
      (g.suite || "").toLowerCase(),
      (g.base_url || "").toLowerCase()
    ].filter(Boolean);
    for (const c of candidates) {
      if (c && q.includes(c.split(/\W+/)[0])) return g;
    }
  }

  // lightweight keyword mapping
  const mapping = {
    "neus": "neus",
    "bourlardes": "bourlardes",
    "blue": "blue patio",
    "tintorera": "tintorera",
    "bateau": "tintorera",
    "piscine": "piscine-rooftop",
    "rooftop": "piscine-rooftop",
    "reiki": "reiki",
    "logo": "logos",
    "vue": "vue-port-environnement",
    "port": "vue-port-environnement",
    "enviro": "vue-port-environnement"
  };
  for (const k of Object.keys(mapping)) {
    if (q.includes(k)) {
      const name = mapping[k];
      return (galleryObj.galleries || []).find(g => {
        return (g.album && g.album.toLowerCase().includes(name)) ||
               (g.suite && g.suite.toLowerCase().includes(name));
      }) || null;
    }
  }
  return null;
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

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const MODEL = process.env.MODEL || "gpt-3.5-turbo";
    const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || (fs.existsSync(SYSTEM_PROMPT_PATH) ? fs.readFileSync(SYSTEM_PROMPT_PATH, "utf8") : "");

    const kb = loadKB();
    const relevant = retrieveRelevantEntries(kb, lang, user_message, 4);

    let contextText = "";
    if (relevant.length > 0) {
      contextText = relevant.map(r => `Source: ${r.title} — ${r.url}\nSummary: ${r.summary}`).join("\n\n");
    } else {
      contextText = "No relevant page found in KB for this query.";
    }

    const galleryObj = loadGallery();
    const matchedGallery = findGalleryForQuery(galleryObj, user_message);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `Context (knowledge base):\n\n${contextText}` },
      { role: "user", content: `[lang=${lang}] ${user_message}` }
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.2
      })
    });

    const data = await resp.json();
    if (data.error) return res.status(502).json({ error: data.error });

    const reply = data?.choices?.[0]?.message?.content || null;
    if (!reply) return res.status(502).json({ error: "No reply from OpenAI" });

    const out = { reply };

    if (matchedGallery) {
      const base = (matchedGallery.base_url || "").replace(/\/$/, "");
      const images = (matchedGallery.images || []).map(img => img.startsWith("http") ? img : `${base}/${img}`);
      out.images = images;
      out.album = matchedGallery.album || matchedGallery.suite || null;
      out.album_base = base || null;
    }

    return res.status(200).json(out);

  } catch (err) {
    console.error("Server error (RAG V9):", err);
    return res.status(500).json({ error: err.message });
  }
}
