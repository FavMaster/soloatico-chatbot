// chat_rag ULTRA PRO v2 - strict language control, RAG FR base

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

function normalize(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[̀-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/ñ/g, "n")
    .toLowerCase();
}

const synonymGroups = {
  pool: ["piscine", "piscina", "pool", "zwembad", "solarium", "terrasse", "terrassa", "rooftop"],
  breakfast: ["petit dejeuner", "breakfast", "desayuno", "ontbijt"],
  boat: ["bateau", "barco", "llaut", "boat", "vaartuig"],
  suite: ["suite", "habitacion", "room", "kamer"],
  beach: ["plage", "playa", "beach", "strand"]
};

function stem(word) {
  return normalize(word).slice(0, 5);
}

function detectLangFromTextServer(text) {
  const t = normalize(text);
  const stopwords = {
    fr: ["le","la","les","et","est","vous","bonjour","merci","quand","ou","comment"],
    en: ["the","and","is","you","hello","please","thanks","what","where","when","how"],
    es: ["el","la","y","es","usted","hola","gracias","cuando","donde","como"],
    it: ["il","la","e","è","ciao","grazie","quando","dove","come"],
    de: ["der","die","und","ist","hallo","bitte","danke"],
    nl: ["de","het","en","hallo","dank","wanneer","waar"],
    ca: ["el","la","els","les","i","hola","gracies","quan","on","com"]
  };
  const scores = {};
  for (const l in stopwords) scores[l] = 0;
  const tokens = t.split(/\W+/).filter(Boolean);
  for (const tok of tokens) {
    for (const l in stopwords) {
      if (stopwords[l].includes(tok)) scores[l]++;
    }
  }
  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0] || "fr";
}

function retrieveRelevantEntries(kb, query, topK = 4) {
  const q = normalize(query).split(/\W+/).filter(Boolean);
  const userRoots = q.map(stem);

  const scored = kb.map(entry => {
    const text = normalize(entry.title + " " + entry.summary + " " + entry.raw);
    let score = 0;

    for (const w of q) if (text.includes(w)) score += 2;
    for (const r of userRoots) if (text.includes(r)) score += 3;

    for (const key in synonymGroups) {
      for (const syn of synonymGroups[key]) {
        if (text.includes(normalize(syn))) score += 5;
      }
    }

    return { entry, score };
  });

  scored.sort((a,b)=>b.score - a.score);
  return scored.filter(s => s.score > 1).slice(0, topK).map(s => s.entry);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { user_message, visitor_lang } = req.body || {};
    if (!user_message) return res.status(400).json({ error:"Missing user_message" });

    let lang = "fr";
    if (visitor_lang && typeof visitor_lang === "string") {
      const c = visitor_lang.slice(0,2).toLowerCase();
      if (["fr","en","es","it","de","nl","ca"].includes(c)) lang = c;
    } else {
      lang = detectLangFromTextServer(user_message);
    }

    if (!process.env.OPENAI_API_KEY)
      return res.status(500).json({ error:"Missing OPENAI_API_KEY" });

    const MODEL = process.env.MODEL || "gpt-3.5-turbo";
    const SYSTEM_PROMPT =
      fs.readFileSync(path.join(process.cwd(), "kb", "system_prompt_v6.txt"), "utf8");

    const kb = loadKB();
    const relevant = retrieveRelevantEntries(kb, user_message, 4);

    if (relevant.length === 0) {
      return res.status(200).json({
        reply:"Bonne question ! Contactez directement Sophia ou Laurent via le bouton WhatsApp ci-dessous :) Merci !"
      });
    }

    const contextText = relevant
      .map(r=>`Source: ${r.title} — ${r.url}\nSummary: ${r.summary}`)
      .join("\n\n");

    const langSystem = `IMPORTANT : Tu dois répondre strictement en langue '${lang}'. 
Peu importe la langue de la KB (FR) ou la langue de l’utilisateur,
la réponse finale doit être rédigée UNIQUEMENT en '${lang}'. 
Ne jamais utiliser une autre langue.`

    const messages = [
      { role:"system", content: SYSTEM_PROMPT },
      { role:"system", content: langSystem },
      { role:"system", content:`Context (knowledge base):\n\n${contextText}` },
      { role:"user", content:user_message }
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`
      },
      body:JSON.stringify({
        model:MODEL,
        messages,
        max_tokens:500,
        temperature:0.2
      })
    });

    const data = await resp.json();
    if (data.error) return res.status(502).json({ error:data.error });

    const reply = data?.choices?.[0]?.message?.content || null;
    if (!reply)
      return res.status(200).json({
        reply:"Bonne question ! Contactez directement Sophia ou Laurent via le bouton WhatsApp ci-dessous :) Merci !"
      });

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({
      reply:"Bonne question ! Contactez directement Sophia ou Laurent via le bouton WhatsApp ci-dessous :) Merci !"
    });
  }
}
