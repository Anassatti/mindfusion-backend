import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "✅ MindFusion backend is live with real AI!" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { question, lang } = req.body;
    if (!question) return res.status(400).json({ error: "Question is required" });

    // --- 1️⃣ OpenAI (ChatGPT) ---
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: question }],
      }),
    });
    const openaiData = await openaiResp.json();
    const openaiAnswer = openaiData.choices?.[0]?.message?.content || "No response from OpenAI.";

    // --- 2️⃣ Anthropic (Claude) ---
    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 200,
        messages: [{ role: "user", content: question }],
      }),
    });
    const claudeData = await claudeResp.json();
    const claudeAnswer =
      claudeData.content?.[0]?.text || "No response from Claude.";

    // --- 3️⃣ Google Gemini ---
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: question }] }],
        }),
      }
    );
    const geminiData = await geminiResp.json();
    const geminiAnswer =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini.";

    // --- 🧠 Combine Results ---
    const unifiedAnswer = `
**OpenAI:** ${openaiAnswer}

**Claude:** ${claudeAnswer}

**Gemini:** ${geminiAnswer}
`;

    res.status(200).json({
      answer: unifiedAnswer,
      sources: ["ChatGPT", "Claude", "Gemini"],
      confidence: 0.93,
    });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

export default app;
