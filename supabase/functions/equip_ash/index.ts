import {
  buildProfileRecordFromState,
  inflateProfileRecord,
  toggleEquippedAsh,
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
    const ashId = String(body?.ashId || "");

    if (!ashId) {
      return errorResponse("INVALID_ASH_REQUEST");
    }

    const current = await fetchProfileRecord(user.id);
    if (!current) {
      return errorResponse("PROFILE_NOT_FOUND", 404);
    }

    const profile = inflateProfileRecord(current);
    if (!profile.ashesOfWarOwned.includes(ashId)) {
      return errorResponse("ASH_NOT_OWNED", 403);
    }

    const nextProfile = toggleEquippedAsh(profile, ashId);
    const nextRecord = buildProfileRecordFromState(nextProfile, current.save_meta || {});
    nextRecord.save_meta.importedFromLocal = !!current.save_meta?.importedFromLocal;
    const updated = await upsertProfileRecord(user.id, nextRecord);

    return json({
      profile: updated,
      snapshot: nextProfile,
    });
  } catch (error) {
    return errorResponse(error.message || "EQUIP_ASH_FAILED", 400);
  }
});
