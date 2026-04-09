import {
  buildProfileRecordFromState,
  inflateProfileRecord,
  isCompatibleSaveVersion,
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

const decodeSave = (encodedData: string) => {
  try {
    const reversed = encodedData.split("").reverse().join("");
    const jsonString = decodeURIComponent(escape(atob(reversed)));
    return JSON.parse(jsonString);
  } catch (_error) {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }
  try {
    const { user } = await requireUser(req);
    const body = await req.json();
    const encodedSave = String(body?.encodedSave || "");

    if (!encodedSave) {
      return errorResponse("MISSING_LEGACY_SAVE");
    }

    const existing = await fetchProfileRecord(user.id);
    if (existing?.save_meta?.importedFromLocal) {
      return errorResponse("LOCAL_IMPORT_ALREADY_CONSUMED", 409);
    }

    const decoded = decodeSave(encodedSave);
    if (!decoded || !isCompatibleSaveVersion(decoded.save?.version)) {
      return errorResponse("INVALID_LEGACY_SAVE");
    }

    const normalized = normalizePlayerProfile(decoded);
    const nextRecord = buildProfileRecordFromState(normalized, {
      importedFromLocal: true,
    });
    nextRecord.save_meta.importedFromLocal = true;

    const profile = await upsertProfileRecord(user.id, nextRecord);

    return json({
      profile,
      snapshot: inflateProfileRecord(profile),
    });
  } catch (error) {
    return errorResponse(error.message || "LOCAL_IMPORT_FAILED", 400);
  }
});
