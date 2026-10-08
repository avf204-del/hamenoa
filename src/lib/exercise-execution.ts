import { createHash } from 'node:crypto';
import catalog from '../../data/exercise-execution.json';
import type { ExerciseExecution } from '@/catalog/execution';

const EXECUTIONS = catalog.exercises as unknown as Record<string, ExerciseExecution>;

/** Server-side snapshot, independent of the workout core and external apps. */
export function exerciseExecution(slug: string): ExerciseExecution | undefined {
  return EXECUTIONS[slug];
}

export function executionMatchesInstructions(execution: ExerciseExecution, instructions: string): boolean {
  return createHash('sha256').update(instructions.trim()).digest('hex') === execution.evidence.instructionsHash;
}
