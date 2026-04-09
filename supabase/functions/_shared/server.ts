import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("APP_SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("APP_SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey =
  Deno.env.get("APP_SUPABASE_SERVICE_ROLE_KEY") ?? "";

export const createAdminClient = () =>
  createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

export const createUserClient = (authHeader: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });

export const errorResponse = (message: string, status = 400) =>
  json({ error: message }, status);

export const corsResponse = () =>
  new Response("ok", {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });

export const requireUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("AUTH_REQUIRED");
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  return { user, authHeader };
};

export const fetchProfileRecord = async (userId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("player_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertProfileRecord = async (userId: string, profile: Record<string, unknown>) => {
  const admin = createAdminClient();
  const payload = {
    user_id: userId,
    ...profile,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("player_profiles")
    .upsert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
};
