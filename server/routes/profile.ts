import express from "express";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin";

interface ProfileSyncBody {
  profileId: string;
  authUserId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

export const profileRouter = express.Router();

profileRouter.post("/sync", async (req, res, next) => {
  const { profileId, authUserId, email, firstName, lastName, company } =
    req.body as ProfileSyncBody;

  if (!profileId || !authUserId) {
    res.status(400).json({ error: "profileId and authUserId are required" });
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: profileId || authUserId,
          auth_user_id: authUserId,
          email: email ?? `${authUserId}@placeholder.maigon`,
          first_name: firstName ?? "",
          last_name: lastName ?? "",
          company: company ?? "",
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message || error });
      return;
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});
