import policy from '../../data/catalog-workout-policy.json';

const CATALOG_ONLY = new Set<string>(policy.catalogOnlySlugs);

/** Catalog visibility and hamenoa game support are independent decisions. */
export function isCatalogOnly(slug: string): boolean {
  return CATALOG_ONLY.has(slug);
}
