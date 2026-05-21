import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, history, responseSchema } = req.body;
      let contents = [];
      
      if (history && history.length > 0) {
        contents = [...history, { role: "user", parts: [{ text: prompt }] }];
      } else {
        contents = [{ role: "user", parts: [{ text: prompt }] }];
      }

      const config: any = {
        model: "gemini-3.5-flash",
      };

      if (systemInstruction) {
        config.config = {
          ...config.config,
          systemInstruction,
        };
      }

      if (responseSchema) {
        config.config = {
          ...config.config,
          responseMimeType: "application/json",
          responseSchema,
        };
      }

      const response = await ai.models.generateContent({
        ...config,
        contents,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
