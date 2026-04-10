import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { gameState } from "./state.js";
import {
  buildCloudProfilePayload,
  getLegacySaveCandidate,
  hasLegacyImportBeenConsumed,
  hydrateProfileState,
  markLegacyImportConsumed,
} from "./save.js";
import {
  applyOfflineTimeProgress,
  applyRuneRefund,
  applyStatUpgrade,
  createEmptyProfileRecord,
  buildProfileRecordFromState,
  inflateProfileRecord,
  normalizePlayerProfile,
  toggleEquipment,
  toggleEquippedAsh,
  updatePreparationSelection,
} from "./shared/player-profile.js";

const runtimeConfig = (() => {
  const config = window.__ELDEN_CHILL_CONFIG__ || {};
  const supabaseUrl = config.supabaseUrl || config.SUPABASE_URL || "";
  let projectRef = "";

  try {
    projectRef = new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch (_error) {}

  return {
    supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey || config.SUPABASE_ANON_KEY || "",
    projectRef,
  };
})();

let supabaseClient = null;
let authListenerRegistered = false;
let authStateHandlers = [];
let lastProfileRecord = null;
let syncTimer = null;
let syncPromise = null;
let currentSession = null;

const authLog = (...args) => {
  console.info("[cloud-auth]", ...args);
};

const getStoredSession = () => {
  const key = runtimeConfig.projectRef
    ? `sb-${runtimeConfig.projectRef}-auth-token`
    : null;

  if (!key) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token || !parsed?.user) return null;
    authLog("localStorage session detected", parsed.user.id);
    return parsed;
  } catch (_error) {
    return null;
  }
};

const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  if (!runtimeConfig.supabaseUrl || !runtimeConfig.supabaseAnonKey) return null;

  supabaseClient = createClient(
    runtimeConfig.supabaseUrl,
    runtimeConfig.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );

  return supabaseClient;
};

export const isCloudConfigured = () => !!getSupabase();

const emitAuthState = (state) => {
  authStateHandlers.forEach((handler) => handler(state));
};

export const initAuth = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    authLog("initAuth skipped: supabase not configured");
    return { session: null, user: null, configured: false };
  }

  authLog("initAuth start");

  if (!authListenerRegistered) {
    supabase.auth.onAuthStateChange(async (event, session) => {
      currentSession = session || null;
      authLog("onAuthStateChange", event, session?.user?.id || "no-user");
      emitAuthState({
        configured: true,
        session,
        user: session?.user || null,
      });
    });
    authListenerRegistered = true;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const storedSession = getStoredSession();
  currentSession = session || storedSession || null;
  authLog(
    "initAuth resolved",
    session ? "getSession" : storedSession ? "localStorage" : "none",
    currentSession?.user?.id || "no-user",
  );

  return {
    configured: true,
    session: currentSession,
    user: currentSession?.user || null,
  };
};

export const onAuthStateChange = (handler) => {
  authStateHandlers.push(handler);
  return () => {
    authStateHandlers = authStateHandlers.filter((entry) => entry !== handler);
  };
};

export const signInWithMagicLink = async (email) => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) throw error;
};

export const signInWithGoogle = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) throw error;
};

export const signOut = async () => {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
  currentSession = null;
};

const requireSession = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  if (currentSession) {
    authLog("requireSession cache hit", currentSession.user?.id || "no-user");
    return currentSession;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const storedSession = getStoredSession();
  currentSession = session || storedSession || null;
  authLog(
    "requireSession resolved",
    session ? "getSession" : storedSession ? "localStorage" : "none",
    currentSession?.user?.id || "no-user",
  );

  if (!currentSession) {
    throw new Error("AUTH_REQUIRED");
  }
  return currentSession;
};

const invoke = async (name, body = {}) => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const context = error.context;
    if (context) {
      try {
        const cloned = context.clone ? context.clone() : context;
        const payload = await cloned.json();
        throw new Error(payload?.error || JSON.stringify(payload));
      } catch (_jsonError) {
        try {
          const cloned = context.clone ? context.clone() : context;
          const text = await cloned.text();
          throw new Error(text || error.message);
        } catch (_textError) {
          throw error;
        }
      }
    }
    throw error;
  }
  return data;
};

const applyRecord = (record) => {
  lastProfileRecord = record;
  const inflated = inflateProfileRecord(record);
  hydrateProfileState(inflated);
  return inflated;
};

const fetchCurrentProfileRecord = async () => {
  const session = await requireSession();
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("player_profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return { session, record: data };
  }

  const seed = {
    user_id: session.user.id,
    ...createEmptyProfileRecord(),
  };

  const { data: created, error: insertError } = await supabase
    .from("player_profiles")
    .upsert(seed)
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return { session, record: created };
};

const persistProfileMutation = async (session, current, nextProfile) => {
  const supabase = getSupabase();
  const nextRecord = buildProfileRecordFromState(nextProfile, current.save_meta || {});
  nextRecord.save_meta.importedFromLocal = !!current.save_meta?.importedFromLocal;

  const { data, error } = await supabase
    .from("player_profiles")
    .upsert({
      user_id: session.user.id,
      ...nextRecord,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return applyRecord(data);
};

const performDirectMutation = async (name, payload = {}) => {
  const { session, record } = await fetchCurrentProfileRecord();
  const profile = inflateProfileRecord(record);

  switch (name) {
    case "equip_item":
      return persistProfileMutation(
        session,
        record,
        toggleEquipment(profile, payload.slotKey, payload.itemId),
      );
    case "equip_ash":
      return persistProfileMutation(
        session,
        record,
        toggleEquippedAsh(profile, payload.ashId),
      );
    case "update_preparation":
      return persistProfileMutation(
        session,
        record,
        updatePreparationSelection(profile, {
          blessingId: payload.blessingId,
          consumableId: payload.consumableId,
        }),
      );
    case "upgrade_stat":
      return persistProfileMutation(
        session,
        record,
        applyStatUpgrade(profile, payload.statName, payload.count),
      );
    case "refund_runes":
      return persistProfileMutation(session, record, applyRuneRefund(profile));
    default:
      throw new Error(`UNSUPPORTED_DIRECT_MUTATION:${name}`);
  }
};

export const bootstrapPlayerProfile = async () => {
  const session = await requireSession();
  const supabase = getSupabase();
  authLog("bootstrapPlayerProfile select start", session.user.id);

  const { data: existing, error: selectError } = await supabase
    .from("player_profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (selectError) {
    authLog("bootstrapPlayerProfile select failed", selectError.message);
    throw selectError;
  }

  if (existing) {
    authLog("bootstrapPlayerProfile existing profile", session.user.id);
    return applyRecord(existing);
  }

  const seed = {
    user_id: session.user.id,
    ...createEmptyProfileRecord(),
  };

  const { data: created, error: insertError } = await supabase
    .from("player_profiles")
    .upsert(seed)
    .select("*")
    .single();

  if (insertError) {
    authLog("bootstrapPlayerProfile upsert failed", insertError.message);
    throw insertError;
  }

  authLog("bootstrapPlayerProfile created profile", session.user.id);
  return applyRecord(created);
};

export const maybeImportLegacySave = async () => {
  if (hasLegacyImportBeenConsumed()) return null;
  const legacy = getLegacySaveCandidate();
  if (!legacy) return null;

  try {
    const session = await requireSession();
    const supabase = getSupabase();
    const payload = buildProfileRecordFromState(
      normalizePlayerProfile(legacy.decoded),
      {
        importedFromLocal: true,
      },
    );
    payload.save_meta.importedFromLocal = true;

    const { data, error } = await supabase
      .from("player_profiles")
      .upsert({
        user_id: session.user.id,
        ...payload,
      })
      .select("*")
      .single();

    if (error) throw error;

    markLegacyImportConsumed();
    return applyRecord(data);
  } catch (error) {
    console.warn("Import local ignore :", error);
    return null;
  }
};

export const applyServerOfflineProgress = async () => {
  if (!isCloudConfigured()) return null;
  const session = await requireSession();
  const supabase = getSupabase();
  authLog("applyServerOfflineProgress start", session.user.id);

  try {
    const fallback = applyOfflineTimeProgress(gameState);
    const payload = buildProfileRecordFromState(
      fallback,
      lastProfileRecord?.save_meta || {},
    );

    const { data, error } = await supabase
      .from("player_profiles")
      .upsert({
        user_id: session.user.id,
        ...payload,
      })
      .select("*")
      .single();

    if (error) throw error;
    authLog("applyServerOfflineProgress success", session.user.id);
    return applyRecord(data);
  } catch (error) {
    authLog("applyServerOfflineProgress failed", error.message || error);
    console.warn("Offline progress server indisponible, fallback local.", error);
    const fallback = applyOfflineTimeProgress(gameState);
    hydrateProfileState(fallback);
    return fallback;
  }
};

export const loadAuthoritativeProfile = async () => {
  const imported = await maybeImportLegacySave();
  if (imported) return imported;
  return bootstrapPlayerProfile();
};

export const performMutation = async (name, payload = {}) => {
  try {
    return await performDirectMutation(name, payload);
  } catch (error) {
    authLog("performDirectMutation failed", name, error?.message || error);
    if (!String(error?.message || "").startsWith("UNSUPPORTED_DIRECT_MUTATION:")) {
      throw error;
    }
  }

  await requireSession();
  const response = await invoke(name, payload);
  return applyRecord(response.profile);
};

const flushSnapshotSync = async (reason = "autosave") => {
  if (!isCloudConfigured()) return null;
  const session = await requireSession();
  const supabase = getSupabase();
  authLog("flushSnapshotSync start", reason, session.user.id);
  const payload = buildProfileRecordFromState(
    buildCloudProfilePayload(),
    lastProfileRecord?.save_meta || {},
  );
  const record = {
    user_id: session.user.id,
    ...payload,
  };

  const { data, error } = await supabase
    .from("player_profiles")
    .upsert(record)
    .select("*")
    .single();

  if (error) {
    authLog("flushSnapshotSync failed", reason, error.message || error);
    throw error;
  }

  authLog("flushSnapshotSync success", reason, session.user.id);
  return applyRecord(data);
};

export const scheduleProfileSync = (reason = "autosave") => {
  if (!isCloudConfigured()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncPromise = flushSnapshotSync(reason).catch((error) => {
      console.warn("Sync profil differee echouee :", error);
      return null;
    });
  }, 300);
};

export const flushPendingProfileSync = async (reason = "flush") => {
  if (!isCloudConfigured()) return null;
  clearTimeout(syncTimer);
  syncTimer = null;
  return flushSnapshotSync(reason);
};

window.__eldenChillScheduleSync = scheduleProfileSync;
