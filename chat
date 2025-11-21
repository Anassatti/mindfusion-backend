// FILE: api/chat.js
// Vercel Serverless Function – Multi-AI Chat (ChatGPT + Claude + Gemini)

// No need for express or node-fetch – Vercel/Node 18 has global fetch.

export default async function handler(req, res) {
  // --- Basic CORS (allow your frontend / Base44 preview) ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    // Preflight
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, lang } = req.body || {};

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    console.log("📥 /api/chat received:", { question, lang });
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

      // 🟣 Claude (Anthropic) – FIXED BODY SHAPE FOR v1/messages
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229", // or "claude-3-sonnet-20241022" / "claude-3-sonnet-latest"
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: question }, // ✅ required structure
              ],
            },
          ],
        }),
      }).then((r) => r.json()),

      // 🟡 Gemini (Google Generative Language)
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

    // --- Prepare response container ---
    const responses = {
      chatgpt: { text: null, confidence: 0 },
      claude: { text: null, confidence: 0 },
      gemini: { text: null, confidence: 0 },
    };

    // ---------- 🟢 ChatGPT ----------
    if (openaiResult.status === "fulfilled") {
      const data = openaiResult.value;
      if (data?.choices?.[0]?.message?.content) {
        responses.chatgpt.text = data.choices[0].message.content;
        responses.chatgpt.confidence = 85;
        console.log(
          "✅ ChatGPT responded:",
          responses.chatgpt.text.slice(0, 120) + "..."
        );
      } else {
        console.error("❌ ChatGPT error:", data.error || "No content");
      }
    } else {
      console.error("❌ ChatGPT failed:", openaiResult.reason);
    }

    // ---------- 🟣 Claude ----------
    if (claudeResult.status === "fulfilled") {
      const data = claudeResult.value;
      console.log("🟣 Claude raw:", JSON.stringify(data).slice(0, 200));

      // Anthropic v1/messages text lives in data.content[0].text
      const claudeText =
        data?.content?.[0]?.text || data?.output_text || null;

      if (claudeText) {
        responses.claude.text = claudeText;
        responses.claude.confidence = 88;
        console.log("✅ Claude responded:", claudeText.slice(0, 120) + "...");
      } else {
        console.error("❌ Claude error:", data.error || "No content");
      }
    } else {
      console.error("❌ Claude failed:", claudeResult.reason);
    }

    // ---------- 🟡 Gemini ----------
    if (geminiResult.status === "fulfilled") {
      const data = geminiResult.value;
      console.log("🟡 Gemini raw:", JSON.stringify(data).slice(0, 200));

      const geminiText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.output_text ||
        null;

      if (geminiText) {
        responses.gemini.text = geminiText;
        responses.gemini.confidence = 90;
        console.log("✅ Gemini responded:", geminiText.slice(0, 120) + "...");
      } else {
        console.error("❌ Gemini error:", data.error || "No content");
      }
    } else {
      console.error("❌ Gemini failed:", geminiResult.reason);
    }

    // --- Fallback placeholders for models that failed ---
    Object.keys(responses).forEach((modelKey) => {
      const model = responses[modelKey];
      if (!model.text) {
        model.text = `No response from ${modelKey}`;
        model.confidence = 0;
      }
    });

    // --- Aggregate / unified response ---
    const successful = Object.values(responses).filter(
      (r) => r.text && !r.text.startsWith("No response from")
    );

    if (successful.length === 0) {
      console.error("❌ ALL AI MODELS FAILED");
      return res.status(500).json({
        error: "All AI models failed to respond",
        responses,
      });
    }

    const unifiedText = successful.map((r) => r.text).join("\n\n");
    const avgConfidence = Math.round(
      successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length
    );

    console.log("📊 Aggregated results:", {
      chatgpt_ok: !responses.chatgpt.text.startsWith("No response"),
      claude_ok: !responses.claude.text.startsWith("No response"),
      gemini_ok: !responses.gemini.text.startsWith("No response"),
      unified_confidence: avgConfidence,
    });

    // --- Return response to frontend ---
    return res.status(200).json({
      answer: unifiedText,
      confidence: avgConfidence,
      responses,
      unified: { text: unifiedText, confidence: avgConfidence },
      modelsAvailable: successful.length,
      totalModels: 3,
    });
  } catch (error) {
    console.error("🔴 Error in /api/chat:", error);
    return res.status(500).json({
      error: error?.message || "Internal Server Error",
    });
  }
}
