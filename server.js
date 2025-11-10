import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// ✅ Enable JSON parsing
app.use(express.json());

// ✅ Enable CORS for all origins (Base44 frontend)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.get("/", (req, res) => {
  res.send("MindFusion backend is live 🚀");
});

app.post("/api/chat", async (req, res) => {
  try {
    const { question, lang } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

    // Example: Call OpenAI (you can also include Anthropic + Gemini)
    const unifiedAnswer = `This is a simulated unified answer for: "${question}" (${lang})`;

    res.json({
      answer: unifiedAnswer,
      sources: ["ChatGPT", "Claude", "Gemini"],
      confidence: 0.85,
    });
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Export for Vercel
app.listen(3000, () => console.log("MindFusion backend running on port 3000"));
export default app;

