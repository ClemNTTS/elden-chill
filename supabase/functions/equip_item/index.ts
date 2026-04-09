import {
  buildProfileRecordFromState,
  inflateProfileRecord,
  toggleEquipment,
} from "../../../shared/player-profile.js";
import {
  corsResponse,
  errorResponse,
  fetchProfileRecord,
  json,
  requireUser,
  upsertProfileRecord,
} from "../_shared/server.ts";

const validSlots = new Set(["weapon", "armor", "accessory"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }
  try {
    const { user } = await requireUser(req);
    const body = await req.json();
    const itemId = String(body?.itemId || "");
    const slotKey = String(body?.slotKey || "");

    if (!itemId || !validSlots.has(slotKey)) {
      return errorResponse("INVALID_EQUIP_REQUEST");
    }

    const current = await fetchProfileRecord(user.id);
    if (!current) {
      return errorResponse("PROFILE_NOT_FOUND", 404);
    }

    const profile = inflateProfileRecord(current);
    const ownedItem = profile.inventory.find((item) => item?.id === itemId);
    if (!ownedItem) {
      return errorResponse("ITEM_NOT_OWNED", 403);
    }

    const nextProfile = toggleEquipment(profile, slotKey, itemId);
    const nextRecord = buildProfileRecordFromState(nextProfile, current.save_meta || {});
    nextRecord.save_meta.importedFromLocal = !!current.save_meta?.importedFromLocal;
    const updated = await upsertProfileRecord(user.id, nextRecord);

    return json({
      profile: updated,
      snapshot: nextProfile,
    });
  } catch (error) {
    return errorResponse(error.message || "EQUIP_ITEM_FAILED", 400);
  }
});
