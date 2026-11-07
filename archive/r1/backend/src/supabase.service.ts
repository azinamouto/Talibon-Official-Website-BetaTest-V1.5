import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '').replace(/\/+$/, '');
}

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    const rawUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const hasUrl = !!rawUrl && rawUrl.length > 5;
    const hasServiceRoleKey = !!supabaseKey && supabaseKey.length > 5;

    console.log(
      `[SUPABASE_SERVER] Initialization check: SUPABASE_URL: ${hasUrl ? "PRESENT" : "MISSING"}, SUPABASE_SERVICE_ROLE_KEY: ${hasServiceRoleKey ? "PRESENT" : "MISSING"}`
    );

    if (!rawUrl || !supabaseKey) {
      throw new Error("Missing backend Supabase configuration.");
    }

    const supabaseUrl = normalizeSupabaseUrl(rawUrl);

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } catch (error) {
      throw new Error("Invalid backend Supabase configuration.");
    }
  }

  createAuthClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new InternalServerErrorException('Authentication is not configured.');
    return createClient(normalizeSupabaseUrl(url), key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  getClient() {
    if (!this.supabase) {
      throw new InternalServerErrorException(
        "Supabase server-side configuration is incomplete. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables."
      );
    }
    return this.supabase;
  }
}
