// ✅ CORRECTED BACKEND CODE
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

    console.log("📥 Received:", { question, lang });
    console.log("🔑 API Keys present:", {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
    });

    // Call all 3 AIs in parallel with error handling
    const [openaiResult, claudeResult, geminiResult] = await Promise.allSettled([
      // --- 1️⃣ OpenAI (ChatGPT) ---
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
      }).then(r => r.json()),

      // --- 2️⃣ Anthropic (Claude) ---
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",  // ⚠️ CRITICAL: Required header!
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          messages: [{ role: "user", content: question }],
        }),
      }).then(r => r.json()),

      // --- 3️⃣ Google Gemini ---
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: question }] }],
          }),
        }
      ).then(r => r.json()),
    ]);

    // Extract responses with proper error handling
    const responses = {
      chatgpt: { text: null, confidence: 0 },
      claude: { text: null, confidence: 0 },
      gemini: { text: null, confidence: 0 },
    };

    // Parse ChatGPT response
    if (openaiResult.status === "fulfilled") {
      const data = openaiResult.value;
      if (data.choices && data.choices[0]?.message?.content) {
        responses.chatgpt.text = data.choices[0].message.content;
        responses.chatgpt.confidence = 85;
        console.log("✅ ChatGPT responded:", responses.chatgpt.text.substring(0, 50) + "...");
      } else {
        console.error("❌ ChatGPT error:", data.error || "No content");
      }
    } else {
      console.error("❌ ChatGPT failed:", openaiResult.reason);
    }

    // Parse Claude response
    if (claudeResult.status === "fulfilled") {
      const data = claudeResult.value;
      if (data.content && data.content[0]?.text) {
        responses.claude.text = data.content[0].text;
        responses.claude.confidence = 88;
        console.log("✅ Claude responded:", responses.claude.text.substring(0, 50) + "...");
      } else {
        console.error("❌ Claude error:", data.error || "No content");
      }
    } else {
      console.error("❌ Claude failed:", claudeResult.reason);
    }

    // Parse Gemini response
    if (geminiResult.status === "fulfilled") {
      const data = geminiResult.value;
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        responses.gemini.text = data.candidates[0].content.parts[0].text;
        responses.gemini.confidence = 90;
        console.log("✅ Gemini responded:", responses.gemini.text.substring(0, 50) + "...");
      } else {
        console.error("❌ Gemini error:", data.error || "No content");
      }
    } else {
      console.error("❌ Gemini failed:", geminiResult.reason);
    }

    // Get successful responses
    const successfulResponses = Object.values(responses).filter(r => r.text !== null);

    if (successfulResponses.length === 0) {
      console.error("❌ ALL AIs FAILED");
      return res.status(500).json({ 
        error: "All AI providers failed to respond",
        responses 
      });
    }

    // Create unified answer from first successful response
    const unifiedText = successfulResponses[0].text;
    const avgConfidence = Math.round(
      successfulResponses.reduce((sum, r) => sum + r.confidence, 0) / successfulResponses.length
    );

    console.log("📊 Results:", {
      chatgpt: !!responses.chatgpt.text,
      claude: !!responses.claude.text,
      gemini: !!responses.gemini.text,
      unified_confidence: avgConfidence,
    });

    // Return in format expected by frontend
    res.status(200).json({
      answer: unifiedText,
      confidence: avgConfidence,  // 0-100 scale!
      responses: responses,
      unified: {
        text: unifiedText,
        confidence: avgConfidence,
      },
    });

  } catch (error) {
    console.error("🔴 Error in /api/chat:", error);
    res.status(500).json({ 
      error: error.message || "Internal Server Error",
      details: error.stack,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🔑 Checking API keys...");
  console.log("  - OpenAI:", process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Missing");
  console.log("  - Anthropic:", process.env.ANTHROPIC_API_KEY ? "✅ Set" : "❌ Missing");
  console.log("  - Google:", process.env.GOOGLE_API_KEY ? "✅ Set" : "❌ Missing");
});

export default app;
