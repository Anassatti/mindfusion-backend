import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// --- Middleware ---
app.use(
  cors({
    origin: "*", // you can later restrict to your Base44 domain
    methods: ["POST", "GET"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// --- Health Check ---
app.get("/", (req, res) => {
  res.json({
    message: "✅ MindFusion backend is live with real AI integrations!",
  });
});

// --- Chat Endpoint ---
app.post("/api/chat", async (req, res) => {
  try {
    const { question, lang } = req.body;
    if (!question)
      return res.status(400).json({ error: "Question is required" });

    console.log("📥 Received:", { question, lang });
    console.log("🔑 API Keys present:", {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
    });

    // --- Run all 3 APIs in parallel ---
    const [openaiResult, claudeResult, geminiResult] = await Promise.allSettled([
      // 🟢 ChatGPT (OpenAI)
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: question }],
          max_tokens: 500,
        }),
      }).then((r) => r.json()),

      // 🟣 Claude (Anthropic)
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229", // ✅ fixed model
          max_tokens: 500,
          messages: [{ role: "user", content: question }],
        }),
      }).then((r) => r.json()),

      // 🟡 Gemini (Google)
      fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: question }] }],
          }),
        }
      ).then((r) => r.json()),
    ]);

    // --- Parse results ---
    const responses = {
      chatgpt: { text: null, confidence: 0 },
      claude: { text: null, confidence: 0 },
      gemini: { text: null, confidence: 0 },
    };

    // 🟢 ChatGPT
    if (openaiResult.status === "fulfilled") {
      const data = openaiResult.value;
      if (data.choices?.[0]?.message?.content) {
        responses.chatgpt.text = data.choices[0].message.content;
        responses.chatgpt.confidence = 85;
        console.log(
          "✅ ChatGPT responded:",
          responses.chatgpt.text.substring(0, 100) + "..."
        );
      } else console.error("❌ ChatGPT error:", data.error || "No content");
    } else console.error("❌ ChatGPT failed:", openaiResult.reason);

    // 🟣 Claude
    if (claudeResult.status === "fulfilled") {
      const data = claudeResult.value;
      console.log("🟣 Claude raw:", JSON.stringify(data).substring(0, 200));
      if (data.content?.[0]?.text || data.output_text) {
        responses.claude.text = data.content?.[0]?.text || data.output_text;
        responses.claude.confidence = 88;
        console.log(
          "✅ Claude responded:",
          responses.claude.text.substring(0, 100) + "..."
        );
      } else console.error("❌ Claude error:", data.error || "No content");
    } else console.error("❌ Claude failed:", claudeResult.reason);

    // 🟡 Gemini
    if (geminiResult.status === "fulfilled") {
      const data = geminiResult.value;
      console.log("🟡 Gemini raw:", JSON.stringify(data).substring(0, 200));
      if (
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        data.output_text
      ) {
        responses.gemini.text =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          data.output_text;
        responses.gemini.confidence = 90;
        console.log(
          "✅ Gemini responded:",
          responses.gemini.text.substring(0, 100) + "..."
        );
      } else console.error("❌ Gemini error:", data.error || "No content");
    } else console.error("❌ Gemini failed:", geminiResult.reason);

    // --- Fallback placeholders ---
    Object.keys(responses).forEach((model) => {
      if (!responses[model].text) {
        responses[model].text = `No response from ${model}`;
        responses[model].confidence = 0;
      }
    });

    // --- Unified Answer ---
    const successfulResponses = Object.values(responses).filter((r) => r.text);
    if (successfulResponses.length === 0) {
      console.error("❌ ALL AI MODELS FAILED");
      return res.status(500).json({
        error: "All AI models failed to respond",
        responses,
      });
    }

    const unifiedText = successfulResponses.map((r) => r.text).join("\n\n");
    const avgConfidence = Math.round(
      successfulResponses.reduce((s, r) => s + r.confidence, 0) /
        successfulResponses.length
    );

    console.log("📊 Results:", {
      chatgpt: !!responses.chatgpt.text,
      claude: !!responses.claude.text,
      gemini: !!responses.gemini.text,
      unified_confidence: avgConfidence,
    });

    // --- Return Response to Frontend ---
    res.status(200).json({
      answer: unifiedText,
      confidence: avgConfidence,
      responses,
      unified: { text: unifiedText, confidence: avgConfidence },
    });
  } catch (error) {
    console.error("🔴 Error in /api/chat:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error",
      details: error.stack,
    });
  }
});

// --- Server (for local debug mode) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🔑 Checking API keys...");
  console.log(
    "  - OpenAI:",
    process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Missing"
  );
  console.log(
    "  - Anthropic:",
    process.env.ANTHROPIC_API_KEY ? "✅ Set" : "❌ Missing"
  );
  console.log(
    "  - Google:",
    process.env.GOOGLE_API_KEY ? "✅ Set" : "❌ Missing"
  );
});

export default app;
