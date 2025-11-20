export default async function handler(req, res) {
  // Allow CORS (important)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user_message, visitor_lang } = req.body || {};

    if (!user_message) {
      return res.status(400).json({ error: "Missing user_message" });
    }

    // Verify API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY in environment variables");
      return res.status(500).json({ error: "Server misconfiguration: missing API key" });
    }

    const SYSTEM_PROMPT =
      process.env.SYSTEM_PROMPT ||
      "You are Solo Ático Assistant. Respond kindly and professionally.";

    const MODEL = process.env.MODEL || "gpt-3.5-turbo";

    // Build messages
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `[lang=${visitor_lang || "fr"}] ${user_message}`,
      },
    ];

    // Call OpenAI
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: 400,
          temperature: 0.6,
        }),
      }
    );

    const data = await openaiResponse.json();

    // If OpenAI returned an error
    if (data.error) {
      console.error("❌ OpenAI API Error:", data.error);
      return res.status(502).json({ error: data.error });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error("❌ No response from OpenAI");
      return res.status(502).json({ error: "No reply from OpenAI" });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ Unexpected server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
