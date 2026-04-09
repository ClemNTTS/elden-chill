import {
  createEmptyProfileRecord,
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
    let profile = await fetchProfileRecord(user.id);

    if (!profile) {
      profile = await upsertProfileRecord(user.id, createEmptyProfileRecord());
    }

    return json({
      profile,
      snapshot: inflateProfileRecord(profile),
    });
  } catch (error) {
    return errorResponse(error.message || "BOOTSTRAP_FAILED", 401);
  }
});
