import { createClient } from "@supabase/supabase-js";
import type { UserStats, CrimeCase } from "./src/types";

// Assuming these are injected via environment or handled by the platform
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key are required!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveProfile(userId: string, name: string, stats: UserStats, isPremium: boolean) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: name,
      cases_solved: stats.casesSolved,
      total_points: stats.totalPoints,
      rank: stats.rank,
      is_premium: isPremium,
      full_stats: stats,
      updated_at: new Date()
    });
  return { error };
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

export async function getCases(): Promise<CrimeCase[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching cases:', error);
    return [];
  }

  if (data) {
    return data.map(c => ({
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
      accessLevel: c.access_level
    }));
  }
  return [];
}

export async function createCase(newCase: CrimeCase) {
  const { error } = await supabase
    .from('cases')
    .insert({
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
      access_level: newCase.accessLevel
    });
  return { error };
}

export async function getRealtimeLeaderboard() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, error } = await supabase
    .from('profiles')
    .select('name, cases_solved, total_points, full_stats')
    .order('total_points', { ascending: false })
    .limit(10);
  
  if (data) {
    return data.map(d => ({
      name: d.name,
      casesSolved: d.cases_solved,
      points: d.total_points,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      badges: (d.full_stats as any)?.badges || []
    }));
  }
  return [];
}