import { createClient } from "@supabase/supabase-js";
import type { UserStats } from "./src/types";

// Assuming these are injected via environment or handled by the platform
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl! && supabaseKey!
    ? createClient(supabaseUrl!, supabaseKey!)
    : createClient("https://h", "dededeed");

export async function saveProfile(
  userId: string,
  name: string,
  stats: UserStats,
  isPremium: boolean,
) {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    name: name,
    cases_solved: stats.casesSolved,
    total_points: stats.totalPoints,
    rank: stats.rank,
    is_premium: isPremium,
    full_stats: stats, // JSONB column
    updated_at: new Date(),
  });
  return { error };
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}

export async function getRealtimeLeaderboard() {
  const { data } = await supabase
    .from("profiles")
    .select("name, cases_solved, total_points, full_stats")
    .order("total_points", { ascending: false })
    .limit(10);

  if (data) {
    return data.map((d) => ({
      name: d.name,
      casesSolved: d.cases_solved,
      points: d.total_points,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      badges: (d.full_stats as any)?.badges || [],
    }));
  }
  return [];
}
