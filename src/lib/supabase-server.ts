import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Checks if the required Supabase environment variables are configured.
 */
export function isSupabaseConfigured(): boolean {
    return !!(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey));
}

/**
 * Checks if privileged admin access (service role) is configured.
 */
export function isSupabaseAdminConfigured(): boolean {
    return !!(supabaseUrl && supabaseServiceRoleKey);
}

/**
 * Privileged Supabase client with service_role permissions for server-side database writes,
 * reading protected submissions, running notification jobs and audit logging.
 */
export const supabaseAdmin: SupabaseClient | null =
    supabaseUrl && supabaseServiceRoleKey
        ? createClient(supabaseUrl, supabaseServiceRoleKey, {
              auth: {
                  persistSession: false,
                  autoRefreshToken: false,
              },
          })
        : null;

/**
 * Public Supabase client with anonymous permissions.
 */
export const supabasePublic: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey, {
              auth: {
                  persistSession: false,
                  autoRefreshToken: false,
              },
          })
        : null;

/**
 * Default server client: prefers service role, falls back to anon key if service role is absent.
 */
export const supabaseServer: SupabaseClient | null =
    supabaseAdmin || supabasePublic;
