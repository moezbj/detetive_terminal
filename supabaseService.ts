import { createClient } from "@supabase/supabase-js";
import type { CrimeCase } from "./src/types";
import type { CaseProgress, UserStats } from "./src/types";

// Assuming these are injected via environment or handled by the platform
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key are required!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveProfile(
  userId: string,
  name: string,
  isPremium: boolean,
) {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    name: name,
    is_premium: isPremium,
    updated_at: new Date(),
  });
  return { error };
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return { data, error };
}

function getDefaultUserStats(): UserStats {
  return {
    id: "",
    cases_solved: [],
    total_points: 1000,
    badges: [],
    rank: "Detective Trainee",
    cases_played: [],
    case_progress: {},
    lastDailyIntelClaim: new Date().toISOString(),
  };
}

export async function getUserStats(userId: string) {
  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user stats:", error);
    return { data: getDefaultUserStats(), error };
  }

  if (!data) {
    return { data: getDefaultUserStats(), error: null };
  }

  const userStats: UserStats = {
    id: data.id,
    cases_solved: data.cases_solved,
    total_points: data.total_points,
    badges: data.badges,
    rank: data.rank,
    cases_played: data.cases_played,
    case_progress: data.case_progress,
    lastDailyIntelClaim: data.lastDailyIntelClaim,
  };

  return { data: userStats, error: null };
}

export async function payForCase(
  userId: string,
  prevData: UserStats,
  statsId: string,
  caseId: string,
  total_points: number,
): Promise<UserStats | string> {
  const lastCases = Array.isArray(prevData.cases_played)
    ? prevData.cases_played
    : [];
  const { error, data } = await supabase
    .from("user_stats")
    .upsert({
      ...prevData,
      id: statsId,
      user_id: userId,
      cases_played: [...lastCases, caseId],
      total_points: total_points,
    })
    .select()
    .single();
  if (error) {
    return `Error updating user stats:, ${error}`;
  }
  return data;
}
export async function caseSolve(
  userId: string,
  prevData: UserStats,
  statsId: string,
  caseId: string,
): Promise<UserStats | string> {
  const lastCases = Array.isArray(prevData.cases_solved)
    ? prevData.cases_solved
    : [];
  const { error, data } = await supabase
    .from("user_stats")
    .upsert({
      id: statsId,
      user_id: userId,
      cases_solved: [...lastCases, caseId],
    })
    .select()
    .single();

  if (error) {
    return `Error updating user stats:, ${error}`;
  }
  const { error: progressError } = await supabase
    .from("case_progress")
    .upsert(
      {
        user_id: userId,
        case_id: caseId,
        is_completed: true,
      },
      {
        onConflict: "user_id,case_id",
      },
    )
    .select()
    .single();
  if (progressError) {
    return `Error updating case isCompleted:, ${progressError}`;
  }
  return data;
}
export async function dailyClaim(
  userId: string,
  prevData: UserStats,
  statsId: string,
  total_points: number,
): Promise<{ success: boolean; error: string; data: UserStats | null }> {
  const today = new Date().toISOString();

  const { error, data } = await supabase
    .from("user_stats")
    .upsert({
      ...prevData,
      id: statsId,
      user_id: userId,
      total_points: total_points,
      lastDailyIntelClaim: today,
    })
    .select()
    .single();
  if (error) {
    return { success: false, error: error.message, data: null };
  }
  return { success: true, error: "", data: data };
}

export async function getCases(): Promise<CrimeCase[]> {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching cases:", error);
    return [];
  }
  if (data) {
    return data.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      teaser: c.teaser,
      difficulty: c.difficulty,
      backgroundImage: c.background_image,
      victim: c.victim,
      description: c.description,
      suspects: c.suspects,
      clues: c.clues,
      timeline: c.timeline,
      killerId: c.killer_id,
      solutionSecret: c.solution_secret,
      accessLevel: c.access_level,
    }));
  }
  return [];
}

export async function getCaseProgress(
  caseId: string,
): Promise<CaseProgress | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("case_progress")
    .select("*")
    .eq("case_id", caseId)
    .single();

  if (error || !data)
    return {
      discovered_clue_ids: [],
      interrogatedSuspectIds: [],
      isCompleted: false,
      unreadClueIds: [],
      unlockedHintIds: [],
    };

  return {
    discovered_clue_ids: data.discovered_clue_ids,
    interrogatedSuspectIds: data.interrogated_suspect_ids,
    unlockedHintIds: data.unlocked_hint_ids,
    isCompleted: data.is_completed,
  };
}

export async function createCase(newCase: CrimeCase) {
  const { error } = await supabase.from("cases").insert({
    id: newCase.id,
    title: newCase.title,
    subtitle: newCase.subtitle,
    teaser: newCase.teaser,
    difficulty: newCase.difficulty,
    background_image: newCase.backgroundImage,
    victim: newCase.victim,
    description: newCase.description,
    suspects: newCase.suspects,
    clues: newCase.clues,
    timeline: newCase.timeline,
    killer_id: newCase.killerId,
    solution_secret: newCase.solutionSecret,
    access_level: newCase.accessLevel,
  });
  return { error };
}

export async function saveCaseProgress(
  userId: string,
  caseId: string,
  progress: CaseProgress,
) {
  if (!supabase || userId === "local_user")
    return { error: { message: "Cloud sync unavailable" } };
  const { error, data } = await supabase.from("case_progress").upsert(
    {
      user_id: userId,
      case_id: caseId,
      discovered_clue_ids: progress.discovered_clue_ids,
      interrogated_suspect_ids: progress.interrogatedSuspectIds,
      unlocked_hint_ids: progress.unlockedHintIds,
      is_completed: progress.isCompleted,
      updated_at: new Date(),
    },
    {
      onConflict: "user_id,case_id",
    },
  );
  return { error, data };
}

export async function getRealtimeLeaderboard() {
  const { data } = await supabase
    .from("profiles")
    .select("name, cases_solved, total_points, stats")
    .order("total_points", { ascending: false })
    .limit(10);

  if (data) {
    return data.map((d) => ({
      name: d.name,
      cases_solved: d.cases_solved,
      points: d.total_points,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      badges: (d.stats as any)?.badges || [],
    }));
  }
  return [];
}
