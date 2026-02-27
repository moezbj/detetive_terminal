
import type { LeaderboardEntry } from './types';

export const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { name: 'Detective Holmes', cases_solved: [], points: 12500, badges: ['Gold Gavel', 'Master Mind', 'Night Owl'] },
  { name: 'Poirot\'s Ghost', cases_solved: [], points: 11200, badges: ['The Grey Cell', 'Logic King'] }
];

export const BADGE_DEFINITIONS = [
  { name: 'Rookie Detective', description: 'Solve your first case.', icon: 'fa-shield-halved', color: 'text-blue-400' },
  { name: 'Swift Justice', description: 'Solve a case in under 10 messages.', icon: 'fa-bolt', color: 'text-yellow-400' },
  { name: 'Master Mind', description: 'Solve an Expert level case.', icon: 'fa-brain', color: 'text-purple-400' },
  { name: 'Elite Investigator', description: 'Solve 5 different mysteries.', icon: 'fa-scale-balanced', color: 'text-red-500' }
];
