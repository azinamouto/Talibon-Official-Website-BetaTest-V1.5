import axios from "axios";
import { validateEnvironment } from "./lib/envValidator";
import * as dotenv from "dotenv";
dotenv.config({ path: new URL('../.env', import.meta.url) });

const sanitizeUrl = (url: string): string => {
  let trimmed = url.trim();
  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  if (trimmed.endsWith('/rest/v1')) {
    trimmed = trimmed.slice(0, -8);
  }
  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
};

async function run() {
  const rawUrl = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!validateEnvironment(process.env).isValid || !rawUrl || !key) {
    console.error("Invalid public Supabase configuration.");
    process.exitCode = 1;
    return;
  }

  const url = sanitizeUrl(rawUrl);

  try {
    const response = await axios({
      method: "GET",
      timeout: 15000,
      url: `${url}/rest/v1/`,
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Accept": "application/openapi+json"
      }
    });

    const rpcs = Object.keys(response.data.paths || {}).filter(p => p.startsWith("/rpc/"));
    console.log("Available RPCs in Supabase database:", rpcs);
  } catch (err: any) {
    console.error("OpenAPI request failed.");
    process.exitCode = 1;
  }
}

run();
