import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPER_ADMIN_EMAIL = "fabioferrigno1@hotmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerEmail = String(callerData.user.email ?? "").trim().toLowerCase();
    if (callerEmail !== SUPER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Only the Super Admin can delete users." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "Missing user_id or email." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (email === SUPER_ADMIN_EMAIL || userId === callerData.user.id) {
      return new Response(JSON.stringify({ error: "Protected account cannot be deleted." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete app data first. Missing tables are ignored to keep the function compatible.
    const deletions = [
      adminClient.from("authorized_admins").delete().eq("email", email),
      adminClient.from("match_events").delete().eq("user_id", userId),
      adminClient.from("top_scorer_predictions").delete().eq("user_id", userId),
      adminClient.from("bonus_predictions").delete().eq("user_id", userId),
      adminClient.from("predictions").delete().eq("user_id", userId),
      adminClient.from("league_members").delete().eq("user_id", userId),
      adminClient.from("profiles").delete().eq("id", userId),
    ];

    const deletionResults = await Promise.allSettled(deletions);
    const blockingError = deletionResults.find((result) => result.status === "fulfilled" && result.value.error && !String(result.value.error.message || "").toLowerCase().includes("does not exist"));

    if (blockingError && blockingError.status === "fulfilled") {
      return new Response(JSON.stringify({ error: blockingError.value.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      return new Response(JSON.stringify({ error: deleteAuthError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message ?? "Unexpected error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
