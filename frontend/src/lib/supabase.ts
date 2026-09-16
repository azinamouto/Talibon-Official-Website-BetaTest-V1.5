import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables safely via Vite import.meta.env
const CANONICAL_SUPABASE_URL = 'https://iuzupzknnuimfyzcdtxl.supabase.co';
const CANONICAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1enVwemtubnVpbWZ5emNkdHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NTU5ODIsImV4cCI6MjEwMTMzMTk4Mn0.Sr02wKEyu5Ikoia3j8XSgh1kuLv6hTYCwzmQdo6de8k';

const rawUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : undefined);
const rawKey = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || (import.meta.env && import.meta.env.VITE_SUPABASE_PUBLIC_KEY) || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined);

// Extract project ID from URL if possible
const extractProjectId = (url: string | undefined): string => {
  if (!url) return "unknown";
  try {
    const trimmed = url.trim();
    if (trimmed.includes("supabase.co")) {
      const match = trimmed.match(/https?:\/\/([^.]+)\.supabase\.co/);
      if (match && match[1]) return match[1];
    }
  } catch (e) {
    // Ignore error
  }
  return "custom-or-unknown";
};

// Clean and sanitize URL
const sanitizeUrl = (url: string | undefined): string => {
  if (!url) {
    return 'https://iuzupzknnuimfyzcdtxl.supabase.co';
  }
  
  let trimmed = url.trim();
  
  // Remove trailing slashes
  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  
  // Strip /rest/v1 if present
  if (trimmed.endsWith('/rest/v1')) {
    trimmed = trimmed.slice(0, -8);
  }
  
  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  
  if (
    !trimmed || 
    trimmed.includes('placeholder-project') || 
    trimmed.includes('localhost') || 
    trimmed.includes('127.0.0.1')
  ) {
    return 'https://iuzupzknnuimfyzcdtxl.supabase.co';
  }
  
  return trimmed;
};

const supabaseUrl = sanitizeUrl(rawUrl);
const supabaseAnonKey = (rawKey && rawKey.trim() !== '') ? rawKey.trim() : CANONICAL_SUPABASE_ANON_KEY;

if (!rawKey) {
  console.info(`[Supabase Info] VITE_SUPABASE_ANON_KEY not set in env, using canonical project anon key.`);
}

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Enhanced Diagnostics logger
export function logSupabaseDiagnostics(context: string, errorDetail?: any): void {
  const currentProjectId = extractProjectId(supabaseUrl);
  const maskKey = (key: string | undefined): string => {
    if (!key) return "MISSING";
    if (key.length <= 10) return "***";
    return `${key.substring(0, 5)}...${key.substring(key.length - 5)}`;
  };

  console.group(`%c[Supabase Diagnostics - ${context}]`, "color: #3ecf8e; font-weight: bold;");
  console.log("Current Supabase URL :", supabaseUrl);
  console.log("Environment Keys Exist:", {
    urlExist: !!rawUrl,
    keyExist: !!rawKey,
    isConfigured: isSupabaseConfigured
  });
  console.log("Current Project ID   :", currentProjectId);
  console.log("API Key Masked       :", maskKey(supabaseAnonKey));
  
  let isClientInit = false;
  try {
    isClientInit = typeof supabase !== 'undefined' && !!supabase;
  } catch (e) {
    // Ignore error in TDZ
  }
  console.log("Is Client Initialized:", isClientInit);
  
  if (errorDetail) {
    console.error("Diagnostic Error Info:", errorDetail);
  }
  console.groupEnd();
}

// Perform initial log
logSupabaseDiagnostics("Initialization Check");

