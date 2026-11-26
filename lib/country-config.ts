/**
 * Country configuration registry — the single place that turns an ISO country
 * code into everything ClinicPulse needs to behave correctly for that country:
 * currency, currency symbol, locale, timezone, and phone dial code.
 *
 * This is the keystone of the worldwide (multi-country) design. Every central
 * primitive — currency formatting, phone normalization, "today" in the clinic's
 * zone — resolves the clinic's `country` through here instead of hardcoding
 * Pakistan. Onboarding a new country needs no code change: the reference data in
 * `./country-reference` already covers every ISO 3166-1 country.
 *
 * Pakistan's values are deliberately set to EXACTLY the historical hardcodes
 * (PKR / en-PK / Asia/Karachi / +92) so wiring a primitive to read from this
 * registry is a verified no-op for an existing PK clinic.
 *
 * Static, non-secret config — safe to import from server and client alike.
 */

import { COUNTRY_CURRENCY, COUNTRY_TIMEZONE, COUNTRY_DIAL_CODE } from "./country-reference";

export type CountryCode = string; // ISO 3166-1 alpha-2, uppercase (e.g. "PK", "GB")

export interface CountryConfig {
  /** ISO 3166-1 alpha-2, uppercase. */
  code: CountryCode;
  /** Display name, e.g. "Pakistan". */
  name: string;
  /** ISO 4217 currency code, e.g. "PKR". */
  currency: string;
  /** Short currency symbol for dense UI / receipts, e.g. "Rs", "£", "৳". */
  currencySymbol: string;
  /** BCP-47 locale for number/date formatting, e.g. "en-PK". */
  locale: string;
  /** IANA timezone, e.g. "Asia/Karachi". */
  timezone: string;
  /** International dialing code without "+", e.g. "92". */
  dialCode: string;
}

/** The default country — every unknown / null / legacy code falls back here, so
 *  nothing can ever get `undefined` and a pre-existing PK clinic is unchanged. */
export const DEFAULT_COUNTRY: CountryCode = "PK";

function regionName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

/**
 * CLDR's narrowSymbol keeps a disambiguating country prefix for a few currencies
 * (GHS → "GH₵"). The app wants the bare glyph.
 */
const CURRENCY_SYMBOL_OVERRIDE: Record<string, string> = {
  GHS: "₵",
  NPR: "Rs",
  BDT: "৳",
  PKR: "Rs",
};

function currencySymbolOf(currency: string, locale: string): string {
  const override = CURRENCY_SYMBOL_OVERRIDE[currency];
  if (override) return override;
  for (const loc of [locale, "en"]) {
    try {
      const parts = new Intl.NumberFormat(loc, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      }).formatToParts(0);
      const v = parts.find((p) => p.type === "currency")?.value;
      if (v) return v;
    } catch {
      /* bad locale — fall through to "en", then the code itself */
    }
  }
  return currency;
}

/**
 * Format a money amount (already in MAJOR units) in a given locale + currency.
 * `opts` passes through to Intl.NumberFormat (e.g. maximumFractionDigits). A
 * currency with a symbol override has its currency part swapped after
 * formatting; everything else is the exact Intl output.
 */
export function formatCurrencyIn(
  amount: number,
  locale: string,
  currency: string,
  opts: Intl.NumberFormatOptions = {},
): string {
  const nf = new Intl.NumberFormat(locale, { style: "currency", currency, ...opts });
  const override = CURRENCY_SYMBOL_OVERRIDE[currency];
  if (!override) return nf.format(amount);
  return nf
    .formatToParts(amount)
    .map((p) => (p.type === "currency" ? override : p.value))
    .join("");
}

const PK_CONFIG: CountryConfig = {
  code: "PK",
  name: "Pakistan",
  currency: "PKR",
  currencySymbol: "Rs",
  locale: "en-PK",
  timezone: "Asia/Karachi",
  dialCode: "92",
};

function buildConfig(key: string): CountryConfig {
  const currency = COUNTRY_CURRENCY[key] || "USD";
  return {
    code: key,
    name: regionName(key),
    currency,
    currencySymbol: currencySymbolOf(currency, `en-${key}`),
    locale: `en-${key}`,
    timezone: COUNTRY_TIMEZONE[key] || "UTC",
    dialCode: COUNTRY_DIAL_CODE[key] || "",
  };
}

/**
 * Resolve a country code to its config. Unknown / null / legacy / garbage values
 * fall back to Pakistan so no caller ever gets `undefined` and every pre-existing
 * PK clinic keeps behaving exactly as before. Any REAL ISO country code (present
 * in the reference data) is built from that data; PK is hand-pinned to the legacy
 * values.
 */
export function getCountryConfig(code: string | null | undefined): CountryConfig {
  const key = (code ?? "").trim().toUpperCase();
  if (key === "PK") return PK_CONFIG;
  if (key && Object.prototype.hasOwnProperty.call(COUNTRY_CURRENCY, key)) {
    return buildConfig(key);
  }
  return PK_CONFIG;
}

/** True for any real ISO 3166-1 country present in the reference data. */
export function isKnownCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  const key = code.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(COUNTRY_CURRENCY, key);
}

/**
 * Every country offered in the signup / setup country picker — every ISO country
 * ClinicPulse can serve, alphabetical by display name (Pakistan is still the
 * default selection in the form). The server re-derives currency/timezone from
 * the chosen code, so this is a convenience for the UI, never the authority.
 */
export const SUPPORTED_COUNTRIES: { code: CountryCode; name: string; dialCode: string }[] =
  Object.keys(COUNTRY_CURRENCY)
    .map((code) => ({ code, name: regionName(code), dialCode: COUNTRY_DIAL_CODE[code] || "" }))
    .filter((c) => c.dialCode)
    .sort((a, b) => a.name.localeCompare(b.name));
