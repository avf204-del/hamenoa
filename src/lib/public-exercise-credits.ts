import yoga from "../../data/sources/gandolfi-2023-office-yoga/manifest.json";
import improvment from "../../data/sources/batson-2016-improvment/manifest.json";
import dance from "../../data/sources/louis-2022-elements-of-dance/manifest.json";
import capoeira from "../../data/sources/minghelli-2023-capoeira/manifest.json";
import { parseProvenanceManifest } from "../../scripts/exercise-provenance";

// Explicit accepted sources: never publish pending archives by scanning sources/.
// Static JSON imports also retain attribution in deployed server bundles.
export const PUBLIC_EXERCISE_CREDITS = [yoga, improvment, dance, capoeira].map((raw) => ({
  id: raw.id,
  ...parseProvenanceManifest(raw.id, raw),
}));
