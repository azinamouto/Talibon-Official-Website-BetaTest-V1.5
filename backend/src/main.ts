import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { configureApp } from "./configure-app";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(`API listening on port ${port}`);
}
bootstrap();
