import {
  applyStatUpgrade,
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
    const statName = String(body?.statName || "");
    const count = Math.max(1, Math.floor(Number(body?.count) || 1));

    const current = await fetchProfileRecord(user.id);
    if (!current) {
      return errorResponse("PROFILE_NOT_FOUND", 404);
    }

    const profile = applyStatUpgrade(inflateProfileRecord(current), statName, count);
    const nextRecord = buildProfileRecordFromState(profile, current.save_meta || {});
    nextRecord.save_meta.importedFromLocal = !!current.save_meta?.importedFromLocal;

    const updated = await upsertProfileRecord(user.id, nextRecord);
    return json({
      profile: updated,
      snapshot: normalizePlayerProfile(profile),
    });
  } catch (error) {
    const message = error.message || "UPGRADE_FAILED";
    const status = message.startsWith("PROFILE_") ? 404 : 400;
    return errorResponse(message, status);
  }
});
