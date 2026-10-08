/** Reviewed catalog vocabulary only; these units do not extend the hamenoa workout contract. */
export type LoadUnit = 'bodyweight' | 'kg-total' | 'kg-per-hand' | 'assistance-kg' | 'band-level';

/** Catalog contract, separate from personal selections and historical SetLogs. */
export interface ExerciseExecution {
  revision: number;
  phase: 'main' | 'mobility' | 'stretch';
  reviewRequired: boolean;
  executionMode: 'simultaneous' | 'single-side' | 'alternating' | 'asymmetric';
  repCountBasis: 'per-side' | 'total' | 'paired-cycle' | 'none';
  timeCountBasis: 'per-side' | 'total';
  unilateral: boolean;
  loadChoice: 'none' | 'game-and-inventory';
  loadUnit: LoadUnit | 'multiple-components';
  components: { id: string; unit: LoadUnit; count: number; role: string; selection: string; includesBar?: boolean; notes?: string }[];
  implementsCount: number;
  weightIncludesBar: boolean | null;
  band: { family: string; count: number; role: 'resistance' | 'assistance'; anchor: string; levelSelection: string; notes: string } | null;
  bench: { kind: string; selection: 'fixed' | 'equipment-setting'; degrees: number | null; minDegrees?: number; maxDegrees?: number; notes: string } | null;
  pulleyHeight: string;
  machineSeatSetting: string;
  grip: string;
  supportAndSetup: string;
  doseUnit: 'reps' | 'sec';
  allowedDoseUnits: ('reps' | 'sec')[];
  tempoChoice: 'game';
  configurationNotes: string;
  scalarLoadSupported: boolean;
  evidence: { sourceId: string | null; taggingFile: string; instructionsHash: string; sourceImages: string[]; method: string };
}

