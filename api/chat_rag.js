// 20h19 - api/chat_rag.js
import fs from "fs";
import path from "path";

const KB_PATH = path.join(process.cwd(), "kb", "full_kb_v6.json");
let KB = null;

function loadKB() {
  if (KB) return KB;
  const raw = fs.readFileSync(KB_PATH, "utf8");
  KB = JSON.parse(raw);
  return KB;
}

function retrieveRelevantEntries(kb, lang, query, topK = 4) {
  const q = (query || "").toLowerCase().split(/\\W+/).filter(Boolean);
  let candidates = kb.filter(entry => entry.lang === lang);
  if (candidates.length === 0 && lang !== "fr") {
    candidates = kb.filter(entry => entry.lang === "fr");
  }
  const scored = candidates.map(entry => {
    const text = (entry.title + " " + entry.summary + " " + entry.raw).toLowerCase();
    let score = 0;
    for (const w of q) if (text.includes(w)) score += 1;
    return { entry, score };
  });
  scored.sort((a,b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, topK).map(s => s.entry);
};
  });
  scored.sort((a,b) => b.score - a.score);
  return scored.filter(s=>s.score>0).slice(0, topK).map(s => s.entry);
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

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }
    const MODEL = process.env.MODEL || "gpt-3.5-turbo";
    const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || fs.readFileSync(path.join(process.cwd(), "kb", "system_prompt_v6.txt"), "utf8");

    const kb = loadKB();
    const relevant = retrieveRelevantEntries(kb, lang, user_message, 4);

    let contextText = "";
    if (relevant.length > 0) {
      contextText = relevant.map(r => `Source: ${r.title} — ${r.url}\nSummary: ${r.summary}`).join("\n\n");
    } else {
      contextText = "No relevant page found in KB for this query.";
    }

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

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Server error (RAG):", err);
    return res.status(500).json({ error: err.message });
  }
}
