import {
  applyRuneRefund,
  buildProfileRecordFromState,
  inflateProfileRecord,
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
    const current = await fetchProfileRecord(user.id);
    if (!current) {
      return errorResponse("PROFILE_NOT_FOUND", 404);
    }

    const nextProfile = applyRuneRefund(inflateProfileRecord(current));
    const nextRecord = buildProfileRecordFromState(nextProfile, current.save_meta || {});
    nextRecord.save_meta.importedFromLocal = !!current.save_meta?.importedFromLocal;
    const updated = await upsertProfileRecord(user.id, nextRecord);

    return json({
      profile: updated,
      snapshot: nextProfile,
    });
  } catch (error) {
    return errorResponse(error.message || "REFUND_FAILED", 400);
  }
});
