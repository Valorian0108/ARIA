import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { initAgentState, startAgentLoop } from "./agent/loop";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve frontend static files in production
if (process.env.NODE_ENV === "production") {
  // Running as: node artifacts/api-server/dist/index.mjs (from repo root)
  // __dirname = <repo-root>/artifacts/api-server/dist
  // web build output = <repo-root>/artifacts/web/dist/public
  const staticDir = path.resolve(__dirname, "../../../artifacts/web/dist/public");
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.sendFile(path.join(staticDir, "index.html"));
    });
    logger.info({ staticDir }, "Serving frontend static files");
  } else {
    logger.warn({ staticDir }, "Frontend static files not found — did the web build run?");
  }
}

// Bootstrap agent on startup
void (async () => {
  try {
    await initAgentState();
    startAgentLoop();
  } catch (err) {
    logger.error({ err }, "Failed to start agent loop");
  }
})();

export default app;

