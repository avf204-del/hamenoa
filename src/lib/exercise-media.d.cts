export interface ExerciseMediaFrame {
  file: string;
  captionHe: string;
  altHe: string;
}
export interface ExerciseMediaManifest {
  schemaVersion: 1;
  exercises: Record<string, { frames: ExerciseMediaFrame[] }>;
  warmup: Record<string, { frames: ExerciseMediaFrame[] }>;
}
export function readMediaManifest(root?: string): ExerciseMediaManifest;
export function discoverFrameFiles(directory: string, group: string, id: string): string[];
export function mediaFrames(group: string, id: string, options?: {
  root?: string;
  manifest?: ExerciseMediaManifest;
}): ExerciseMediaFrame[];
export function validateKey(group: string, id: string): void;
export function validateFile(file: string, group: string, id: string): string;
