import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config({ override: true });
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger, ValidationPipe } from "@nestjs/common";
import * as express from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");
  const PORT = 3000;

  // Payload size limits DoS protection
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === "production"
    })
  );

  // In local/standalone runtime, serve the SPA (Vite in dev, static dist in prod)
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.url && (req.url.startsWith("/api") || req.url.startsWith("/api/"))) {
        return next();
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const path = await import("path");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.url && (req.url.startsWith("/api") || req.url.startsWith("/api/"))) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Enable CORS with safe configurations
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin SPA)
      if (!origin) return callback(null, true);

      const rawAllowed = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
        : [];

      // Check explicit allowed origins or development / Cloud Run preview origins
      if (
        rawAllowed.includes(origin) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("run.app") ||
        origin.includes("ai.studio") ||
        origin.includes("vercel.app") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
  });

  await app.listen(PORT, "0.0.0.0");
  logger.log(`Server running on http://localhost:${PORT}`);
}

bootstrap();
