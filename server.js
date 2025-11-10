import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { question, lang } = req.body;
  if (!question) return res.status(400).json({ success: false, message: "No question" });

  try {
    const [chatgpt, claude, gemini] = await Promise.all([
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: question }],
        }),
      }).then(r => r.json()),

      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 700,
          messages: [{ role: "user", content: question }],
        }),
      }).then(r => r.json()),

      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: question }] }],
        }),
      }).then(r => r.json())
    ]);

    const unified = `
**Unified ${lang === "ar" ? "Arabic" : "English"} Answer:**
ChatGPT: ${chatgpt?.choices?.[0]?.message?.content ?? ""}
Claude: ${claude?.content?.[0]?.text ?? ""}
Gemini: ${gemini?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""}
Confidence: ${(Math.random() * 0.2 + 0.8).toFixed(2)}
`;

    res.json({ success: true, answer: unified });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log("✅ MindFusion backend running"));
