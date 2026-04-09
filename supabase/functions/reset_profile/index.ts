import {
  createEmptyProfileRecord,
  inflateProfileRecord,
} from "../../../shared/player-profile.js";
import {
  corsResponse,
  errorResponse,
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
    const profile = await upsertProfileRecord(user.id, createEmptyProfileRecord());
    return json({
      profile,
      snapshot: inflateProfileRecord(profile),
    });
  } catch (error) {
    return errorResponse(error.message || "RESET_PROFILE_FAILED", 400);
  }
});
