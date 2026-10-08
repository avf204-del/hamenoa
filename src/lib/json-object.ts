/** JSON primitives and arrays must not enter object-shaped API contracts. */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Numeric form strings are accepted; objects, empty values and booleans are not numbers. */
export function jsonNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}
