import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Needed for larger image payloads
  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.post("/api/generate-video", async (req, res) => {
    try {
      const { prompt, imageBytes, mimeType, aspectRatio } = req.body;
      
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'A beautiful animation of this image',
        image: {
          imageBytes: imageBytes,
          mimeType: mimeType || 'image/jpeg',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio || '16:9'
        }
      });
      res.json({ operationName: operation.name });
    } catch (e: any) {
      console.error(e);
      let errorMsg = String(e);
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
        errorMsg = "API Quota Exceeded: Your current Gemini API key does not have enough quota to generate videos. Please note that Veo video generation requires a pay-as-you-go billing account.";
      } else if (e.message) {
        errorMsg = e.message;
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  app.post("/api/video-status", async (req, res) => {
    try {
      const { operationName } = req.body;
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ done: updated.done });
    } catch (e: any) {
      console.error(e);
      let errorMsg = String(e);
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
        errorMsg = "API Quota Exceeded: Your current Gemini API key does not have enough quota to generate videos. Please note that Veo video generation requires a pay-as-you-go billing account.";
      } else if (e.message) {
        errorMsg = e.message;
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  app.get("/api/video-download", async (req, res) => {
    try {
      const { operationName } = req.query;
      const op = new GenerateVideosOperation();
      op.name = operationName as string;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!uri) {
        return res.status(400).json({ error: "Video not ready or URI not found" });
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY as string },
      });
      
      res.setHeader('Content-Type', 'video/mp4');
      videoRes.body!.pipeTo(
        new WritableStream({
          write(chunk) { res.write(chunk); },
          close() { res.end(); },
        })
      );
    } catch (e: any) {
      console.error(e);
      let errorMsg = String(e);
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
        errorMsg = "API Quota Exceeded: Your current Gemini API key does not have enough quota to generate videos. Please note that Veo video generation requires a pay-as-you-go billing account.";
      } else if (e.message) {
        errorMsg = e.message;
      }
      if (!res.headersSent) {
        res.status(500).json({ error: errorMsg });
      } else {
        res.end();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
