"use client";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { dirOf, translator, type Locale, type T, type Units } from "./index";

interface LocaleValue {
  locale: Locale;
  units: Units;
  timeZone: string;
  t: T;
}

const Ctx = createContext<LocaleValue>({ locale: "he", units: "kg", timeZone: "Asia/Jerusalem", t: translator("he") });

/** Provides locale/units/zone to existing client screens; keeps <html lang/dir> in sync. */
export function LocaleProvider({ locale, units, timeZone, children }: { locale: Locale; units: Units; timeZone: string; children: ReactNode }) {
  const value = useMemo(() => ({ locale, units, timeZone, t: translator(locale) }), [locale, units, timeZone]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirOf(locale);
  }, [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleValue {
  return useContext(Ctx);
}

/** Persist display choices for server-rendered screens (not sensitive; not httpOnly). */
export function writeDisplayCookies(values: { locale: Locale; units: Units; timeZone: string }): void {
  const year = 60 * 60 * 24 * 365;
  document.cookie = `hm-locale=${values.locale}; path=/; max-age=${year}; samesite=lax`;
  document.cookie = `hm-units=${values.units}; path=/; max-age=${year}; samesite=lax`;
  document.cookie = `hm-tz=${encodeURIComponent(values.timeZone)}; path=/; max-age=${year}; samesite=lax`;
}
