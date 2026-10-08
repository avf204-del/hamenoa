// The games the engine knows. Adding a game means adding a rule file and one
// line here; no screen changes.

import type { GameId, GameRule, Score } from "@/core/contract";
import { G18 } from "@/core/games/g18";

const RULES: Record<GameId, GameRule> = { G18 };

export function ruleFor(game: GameId): GameRule {
  return RULES[game];
}

export function allRules(): GameRule[] {
  return Object.values(RULES);
}

/** Negative when `a` is the better score, positive when `b` is, zero on a tie. */
export function compareScores(a: Score, b: Score): number {
  const length = Math.max(a.rank.length, b.rank.length);
  for (let i = 0; i < length; i++) {
    const difference = (b.rank[i] ?? 0) - (a.rank[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
