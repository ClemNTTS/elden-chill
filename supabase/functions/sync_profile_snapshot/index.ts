import {
  buildProfileRecordFromState,
  inflateProfileRecord,
  normalizePlayerProfile,
} from "../../../shared/player-profile.js";
import {
  corsResponse,
  errorResponse,
  fetchProfileRecord,
  json,
  requireUser,
  upsertProfileRecord,
} from "../_shared/server.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }
  try {
    const { user } = await requireUser(req);
    const body = await req.json();
    const sourceProfile = body?.profile;
    const current = await fetchProfileRecord(user.id);

    const inflated = normalizePlayerProfile({
      runes: sourceProfile?.runes,
      stats: sourceProfile?.stats,
      inventory: sourceProfile?.inventory,
      equipped: sourceProfile?.equipped,
      world: sourceProfile?.world,
      preparation: sourceProfile?.preparation,
      journal: sourceProfile?.journal,
      codex: sourceProfile?.codex,
      save: {
        ...(sourceProfile?.save_meta || {}),
        ...(sourceProfile?.extra_state?.save || {}),
        version: sourceProfile?.version,
      },
      ...(sourceProfile?.extra_state || {}),
    });

    const nextRecord = buildProfileRecordFromState(
      inflated,
      current?.save_meta || {},
    );
    nextRecord.save_meta.importedFromLocal = !!current?.save_meta?.importedFromLocal;

    const profile = await upsertProfileRecord(user.id, nextRecord);

    return json({
      profile,
      snapshot: inflateProfileRecord(profile),
    });
  } catch (error) {
    return errorResponse(error.message || "PROFILE_SYNC_FAILED", 400);
  }
});
