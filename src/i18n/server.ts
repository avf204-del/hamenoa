import { cookies } from "next/headers";
import { DEFAULT_TIME_ZONE, isLocale, isUnits, LOCALE_COOKIE, TZ_COOKIE, UNITS_COOKIE, type Locale, type Units } from "./index";

/** Display choices for server components. Missing/invalid → Hebrew, kg, Israel. */
export async function displayPrefs(): Promise<{ locale: Locale; units: Units; timeZone: string }> {
  const jar = await cookies();
  const locale = jar.get(LOCALE_COOKIE)?.value;
  const units = jar.get(UNITS_COOKIE)?.value;
  let timeZone = DEFAULT_TIME_ZONE;
  const rawTz = jar.get(TZ_COOKIE)?.value;
  if (rawTz) {
    try {
      const tz = decodeURIComponent(rawTz);
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      timeZone = tz;
    } catch {
      /* invalid zone → default */
    }
  }
  return { locale: isLocale(locale) ? locale : "he", units: isUnits(units) ? units : "kg", timeZone };
}
