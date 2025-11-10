import express from "express";
import cors from "cors";

const app = express();

// ✅ Allow frontend requests
app.use(cors());
app.use(express.json());

// ✅ Root route (for quick testing)
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ MindFusion backend is live!" });
});

// ✅ Chat route
app.post("/api/chat", async (req, res) => {
  try {
    const { question, lang } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Simulated unified response
    const answer = `Unified AI response for: "${question}" (${lang || "en"})`;

    res.status(200).json({
      answer,
      sources: ["ChatGPT", "Claude", "Gemini"],
      confidence: 0.87,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Export default for Vercel Serverless Function
export default app;


