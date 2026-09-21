import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";
import { Express, Request, Response } from "express";
import { ExpressAdapter } from "@nestjs/platform-express";

let serverPromise: Promise<Express> | null = null;

async function bootstrapServer(): Promise<Express> {
  console.log("[VERCEL_API] Cold start: Initializing NestJS serverless application on Vercel...");
  const adapter = new ExpressAdapter();
  const expressApp: Express = adapter.getInstance();

  const app = await NestFactory.create(AppModule, adapter, {
    bodyParser: false,
    logger: process.env.NODE_ENV === "production" ? ["error", "warn", "log"] : ["log", "debug", "error", "warn"]
  });

  configureApp(app);

  await app.init();
  console.log("[VERCEL_API] NestJS serverless initialization completed successfully.");
  return expressApp;
}

export default async function handler(req: Request, res: Response) {
  // Ensure the request URL maintains the /api prefix expected by NestJS controllers
  if (req.url && !req.url.startsWith("/api") && !req.url.startsWith("/api/")) {
    req.url = req.url.startsWith("/") ? `/api${req.url}` : `/api/${req.url}`;
  }

  serverPromise ??= bootstrapServer().catch(error => {
    serverPromise = null;
    throw error;
  });
  const server = await serverPromise;
  return server(req, res);
}
