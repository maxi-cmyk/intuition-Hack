// Clerk-Supabase JWT Integration
// Syncs Clerk user to Supabase and provides authenticated client

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function getAuthenticatedSupabaseClient() {
  const { userId, getToken } = await auth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Get Supabase JWT from Clerk
  const supabaseToken = await getToken({ template: "supabase" });

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
      },
    },
  });

  return { supabase, userId };
}

// Sync Clerk user to caregivers table
export async function syncCaregiverToSupabase() {
  const { supabase, userId } = await getAuthenticatedSupabaseClient();

  const { data: existingCaregiver } = await supabase
    .from("caregivers")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!existingCaregiver) {
    // Create caregiver record
    const { error } = await supabase.from("caregivers").insert({
      clerk_id: userId,
      email: "", // Will be populated from Clerk webhook
    });

    if (error) throw error;
  }

  return { supabase, userId };
}
