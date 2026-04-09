import {
  buildProfileRecordFromState,
  inflateProfileRecord,
  updatePreparationSelection,
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
    const current = await fetchProfileRecord(user.id);
    if (!current) {
      return errorResponse("PROFILE_NOT_FOUND", 404);
    }

    const profile = inflateProfileRecord(current);
    const blessingId =
      body?.blessingId === null || body?.blessingId === undefined
        ? body?.blessingId
        : String(body?.blessingId);
    const consumableId =
      body?.consumableId === null || body?.consumableId === undefined
        ? body?.consumableId
        : String(body?.consumableId);

    if (
      blessingId != null &&
      !profile.preparation.unlockedBlessings.includes(blessingId)
    ) {
      return errorResponse("BLESSING_NOT_UNLOCKED", 403);
    }

    if (
      consumableId != null &&
      !profile.preparation.unlockedConsumables.includes(consumableId)
    ) {
      return errorResponse("CONSUMABLE_NOT_UNLOCKED", 403);
    }

    const nextProfile = updatePreparationSelection(profile, {
      blessingId,
      consumableId,
    });
    const nextRecord = buildProfileRecordFromState(nextProfile, current.save_meta || {});
    nextRecord.save_meta.importedFromLocal = !!current.save_meta?.importedFromLocal;
    const updated = await upsertProfileRecord(user.id, nextRecord);

    return json({
      profile: updated,
      snapshot: nextProfile,
    });
  } catch (error) {
    return errorResponse(error.message || "UPDATE_PREPARATION_FAILED", 400);
  }
});
