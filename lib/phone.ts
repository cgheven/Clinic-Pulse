// Pakistani mobile numbers reach this database in every shape a person can type:
// 03001234567, 0300-1234567, +92 300 0000000, +923001234567, and all of those
// again with stray spaces. Nothing ever normalised them on the way in, so ~20
// call sites re-derive digits inline in two different flavours — one of which
// (`phone.replace(/\D/g,"")` on its own) leaves the local trunk "0" that the
// WhatsApp API rejects.
//
// Anything that has to MATCH two numbers against each other — RedFlag lookups
// compare a number typed by one hostel against a number typed by another — needs
// a single canonical form, so that lives here: bare E.164 digits, Pakistan's 92
// country code, no "+". Display formatting is deliberately a separate function:
// a canonical value is for comparison, never for showing to a person.

import { isValidPhoneNumber, getExampleNumber, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

const PK_CC = "92";

/** announcements.ts:80 already treats anything under 10 digits as unusable. */
const MIN_DIGITS = 10;

/** E.164 ceiling — longer than this means the field is holding junk, not a number. */
const MAX_DIGITS = 15;

/** Canonical form for storage and comparison: digits only, country code first,
 *  no separators. Returns null for anything too short/long to be a real number,
 *  so callers get one explicit "unusable" case instead of a silent bad match. */
export function normalizePhoneDigits(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // Drops "+", dashes, spaces and parentheses in one pass.
  let d = raw.replace(/\D/g, "");
  if (d.length < MIN_DIGITS) return null;

  // Order matters: "0092…" is an international trunk prefix and must be peeled
  // before the local-trunk rule below would mistake its first 0 for a PK "0300".
  if (d.startsWith("00")) d = d.slice(2);

  if (d.startsWith("0")) {
    d = PK_CC + d.slice(1);
  } else if (!d.startsWith(PK_CC) && d.length === MIN_DIGITS) {
    // "3001234567" — a PK mobile with both the "+92" and the "0" left off.
    d = PK_CC + d;
  }

  if (d.length < MIN_DIGITS || d.length > MAX_DIGITS) return null;
  return d;
}

/** E.164 for a number read in `country`'s dialling plan, or null when it isn't a
 *  valid number there. Accepts "+63948…", "0948…" and "948…" alike. */
function toE164(input: string | null | undefined, country: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const c = (country ?? "").trim().toUpperCase();
  if (!c) return null;
  try {
    const parsed = parsePhoneNumberFromString(raw, c as CountryCode);
    return parsed?.isValid() ? parsed.number : null;
  } catch {
    return null;
  }
}

/**
 * Whether this is a MOBILE line in `country` — the gate a public referral form
 * needs so an anonymous submitter cannot mint arbitrary numbers, each one
 * taking a pending slot and each a live candidate for a false "joined" match.
 *
 * Pakistan keeps its exact legacy rule (92, a leading 3, nine digits) so nothing
 * there moves. Every other country must be a number libphonenumber calls VALID
 * there, which already rules out minted digits, and is then rejected only if the
 * line type is known to be something other than a mobile. The bundled metadata
 * carries types for some countries and not others — GB yes, PH/SA/PK no, where
 * getType() answers undefined — so an unknown type cannot be treated as a
 * refusal or those countries could never submit a referral at all.
 * FIXED_LINE_OR_MOBILE is accepted for the same reason: in the US and Canada the
 * two are not distinguishable from the number.
 */
export function isReferrableMobileFor(
  input: string | null | undefined,
  country: string | null | undefined
): boolean {
  const c = (country ?? "").trim().toUpperCase();
  if (!c || c === "PK") return /^923\d{9}$/.test(normalizePhoneDigits(input) ?? "");
  try {
    const parsed = parsePhoneNumberFromString((input ?? "").trim(), c as CountryCode);
    if (!parsed?.isValid()) return false;
    const type = parsed.getType();
    if (!type) return true;
    return type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE";
  } catch {
    return false;
  }
}

/**
 * The canonical digits a number is MATCHED on, read in `country`'s dialling plan.
 *
 * Same job as normalizePhoneDigits, which this falls back to, but without its
 * hardcoded Pakistani rules: "0948…" in a Philippine branch canonicalises to
 * 639480613972, not 929480613972. For a number already stored as "+CC…" the two
 * agree, which matters because hms_tenants.phone_digits is a GENERATED column
 * built by hms_normalize_phone_digits() in SQL and cannot see a country — for an
 * E.164 phone that function is a plain digit strip, so this produces the same key
 * it does. For Pakistan the two agree on every shape, so nothing there moves.
 */
export function phoneDigitsForCountry(
  input: string | null | undefined,
  country: string | null | undefined
): string | null {
  const e164 = toE164(input, country);
  if (e164) return e164.replace(/\D/g, "");
  return normalizePhoneDigits(input);
}

/**
 * Whether two numbers are the same line, judged in `country`'s dialling plan.
 *
 * For matching a number a RESIDENT types against the one their branch holds —
 * the complaint form's identity check, and anywhere else the two have to agree.
 * normalizePhoneDigits cannot do this job outside Pakistan: it prefixes "92"
 * onto anything that starts with a trunk 0, so a Filipino resident typing
 * "09480613972" became "929480613972" and never matched the "+639480613972" on
 * their own record. Both sides were mangled identically for a PK branch, which
 * is why this only ever showed up abroad.
 *
 * Falls back to the old digit comparison whenever either side isn't a number
 * libphonenumber recognises for that country, so Pakistan — where both sides
 * already agreed — is unchanged.
 */
export function samePhone(
  a: string | null | undefined,
  b: string | null | undefined,
  country: string | null | undefined
): boolean {
  const ea = toE164(a, country);
  const eb = toE164(b, country);
  if (ea && eb) return ea === eb;
  const na = normalizePhoneDigits(a);
  return !!na && na === normalizePhoneDigits(b);
}

/** Redact for logs, audit metadata and anything shown across organizations.
 *  Keeps enough head/tail for a human to recognise their own number without
 *  making the value re-identifiable on its own. */
export function maskPhone(digits: string | null | undefined): string {
  const d = (digits ?? "").replace(/\D/g, "");
  if (!d) return "—";
  if (d.length <= 4) return "*".repeat(d.length);
  const head = Math.min(4, d.length - 3);
  return `${d.slice(0, head)}${"*".repeat(d.length - head - 3)}${d.slice(-3)}`;
}

/** The 11-digit local form the Pakistani police portals expect ("03001234567").
 *  Their Cell# fields mask to exactly 11 digits, so a canonical "92…" value is
 *  filed as a number that isn't the guest's. "" when it isn't a usable number,
 *  which the caller reports as a missing phone rather than filing junk. */
export function pkLocalPhone(input: string | null | undefined): string {
  const d = normalizePhoneDigits(input);
  if (d && d.startsWith(PK_CC) && d.length === 12) return `0${d.slice(PK_CC.length)}`;
  // Anything else — a landline, or a number stored too short to canonicalise — is
  // filed exactly as it was stored. The canonical pass prefixes "92" onto a local
  // number, which this field would keep as a different number entirely.
  return (input ?? "").replace(/\D/g, "");
}

/** A number as a caller wants to read it off a screen and dial. In PK that is the
 *  local 0XXX-XXXXXXX everyone there uses, grouped so eleven digits can be read
 *  without counting; elsewhere the canonical +CC form, because inventing a local
 *  trunk prefix for a country we know nothing about would be a guess. Falls back
 *  to whatever was stored when the value isn't a number we recognise. */
export function phoneForCalling(input: string | null | undefined, country?: string | null): string {
  if (country === "PK") {
    const local = pkLocalPhone(input);
    return /^03\d{9}$/.test(local) ? `${local.slice(0, 4)}-${local.slice(4)}` : local;
  }
  return formatPhoneDisplay(input);
}

/** Light, display-only. Never feed this back into matching or storage — it is
 *  lossy by design and only ever meant for a screen or an email body. */
export function formatPhoneDisplay(input: string | null | undefined): string {
  const d = normalizePhoneDigits(input);
  if (!d) return (input ?? "").trim();
  if (d.startsWith(PK_CC) && d.length === 12) {
    return `+92 ${d.slice(2, 5)} ${d.slice(5)}`;
  }
  return `+${d}`;
}

// ── Per-country validation + examples (libphonenumber-js) ─────────────────────
// Used by the country-code PhoneInput and the signup/add-property forms + server
// backstop. `local` is the NATIONAL number without the trunk 0 — exactly what the
// PhoneInput stores (the +code prefix is separate). Distinct from the PK-canonical
// helpers above, which are for cross-hostel matching/display of PK numbers.

/** True when libphonenumber has metadata for this country (so it CAN validate it).
 *  ISO code must be uppercase for libphonenumber — callers upper-case first. */
function phoneMetaKnown(country: string): boolean {
  try {
    getCountryCallingCode(country as CountryCode);
    return true;
  } catch {
    return false;
  }
}

/** True if `local` is a valid phone number for `country` (ISO alpha-2). Empty → false.
 *  Country code is upper-cased (libphonenumber rejects lowercase). FAILS OPEN — if the
 *  country has no libphonenumber metadata, or libphonenumber can't run, returns true:
 *  validation is a UX aid, never a hard blocker, so a valid number is NEVER rejected
 *  just because its country lacks metadata or arrives mis-cased. */
export function isValidLocalPhone(local: string | null | undefined, country: string): boolean {
  const v = (local ?? "").replace(/\D/g, "");
  if (!v) return false;
  const c = (country ?? "").trim().toUpperCase();
  if (!phoneMetaKnown(c)) return true;
  try {
    return isValidPhoneNumber(v, c as CountryCode);
  } catch {
    return true;
  }
}

/**
 * What was typed into a +code-prefixed field, reduced to the TRUE national number.
 *
 * The field shows "+63" beside the box and stores what is in the box, so whatever
 * it holds is concatenated onto the dial code. Stripping non-digits and a trunk 0
 * was not enough: a resident reading their number off a card types or pastes it in
 * full ("639480613972"), and that was stored as "+63" + "639480613972" —
 * "+63639480613972", a number that does not exist.
 *
 * It passed validation because isValidPhoneNumber(local, country) hands the string
 * to libphonenumber WITH the country as a default, and libphonenumber helpfully
 * strips the country code itself before judging it. So the check said yes about a
 * value the field then stored differently. The parse that validation was already
 * doing is now the thing that produces the stored value, so the two cannot
 * disagree.
 *
 * Falls back to the digits as typed (minus a trunk 0) whenever the input is not yet
 * a complete valid number — a half-typed "63" must not be rewritten under the
 * cursor.
 */
// Whether this country's national numbers genuinely begin with 0 (so it is a
// digit, not a trunk prefix). Read off the country's own example number and
// memoised — this runs on every keystroke.
/**
 * Does a search box query match this phone number?
 *
 * A raw substring test does not survive the stored format changing: a resident
 * held as "+923001234567" is invisible to an owner typing the "0300…" they know,
 * and the same is already true today for every GB number (all stored "+44…")
 * and the PK records that were entered with a country code. Comparing digits —
 * and ignoring a leading trunk zero on either side — makes "0300", "300 1234",
 * "+92 300" and "3001234567" all find the same person.
 *
 * Deliberately a CONTAINS test on digits, not an equality one: this is a search
 * box, where a partial number is the normal input.
 */
export function phoneMatchesQuery(phone: string | null | undefined, query: string): boolean {
  const raw = (phone ?? "");
  if (!raw) return false;
  if (raw.includes(query)) return true;
  const qDigits = query.replace(/\D/g, "").replace(/^0+/, "");
  if (qDigits.length < 3) return false;
  return raw.replace(/\D/g, "").includes(qDigits);
}

/**
 * A REAL example mobile number for a country, formatted the way somebody there
 * would write it — for placeholders and for the import template's sample rows.
 *
 * The template used to build its non-PK samples by pasting the country's
 * dialling code onto a fixed British body: a Philippine owner was shown
 * "+63 7700 900123" and an Indian owner "+91 7700 900123", neither of which is
 * a valid number in those countries. The sample rows exist to teach the format,
 * so a wrong one teaches the wrong format — and the import now keys duplicates
 * off a number being valid for the branch's country, so a copied bad sample
 * degrades the duplicate check too. Even the GB sample was in Ofcom's reserved
 * drama range (07700 900xxx), which libphonenumber correctly rejects.
 *
 * libphonenumber ships a verified example per country; this returns it in
 * national format, which is how an owner's own spreadsheet will have it.
 * Returns null for a country it has no example for, and the caller falls back.
 */
export function exampleMobileFor(
  country: string | null | undefined,
  format: "national" | "international" = "national",
): string | null {
  const c = (country ?? "").trim().toUpperCase();
  if (!c) return null;
  try {
    const ex = getExampleNumber(c as CountryCode, examples);
    if (!ex) return null;
    return format === "international" ? ex.number : ex.formatNational();
  } catch {
    return null;
  }
}

/**
 * The number as it should be STORED: E.164, country code included, "+" kept.
 *
 * One standard for every country, Pakistan included. Production had drifted
 * into two shapes for PK alone -- 424 residents as "+92…" and 687 as "03…" --
 * which is a number that reads differently depending on who entered it, and a
 * WhatsApp or reminder path that has to guess. Outside PK the app already
 * stored E.164 exclusively, so this makes PK match everyone else rather than
 * the other way round.
 *
 * Returns null when libphonenumber does not recognise the number for that
 * country; the caller keeps whatever the person actually typed rather than
 * discarding it, because a number we cannot parse is still the only way to
 * reach that resident.
 */
export function toInternationalPhone(
  input: string | null | undefined,
  country: string | null | undefined,
): string | null {
  return toE164(input, country);
}

const LEADING_ZERO_COUNTRIES = new Map<string, boolean>();
function keepsLeadingZero(country: string): boolean {
  const cached = LEADING_ZERO_COUNTRIES.get(country);
  if (cached !== undefined) return cached;
  let keeps = false;
  try {
    const ex = getExampleNumber(country as CountryCode, examples);
    keeps = !!ex && String(ex.nationalNumber).startsWith("0");
  } catch {
    keeps = false;
  }
  LEADING_ZERO_COUNTRIES.set(country, keeps);
  return keeps;
}

export function toNationalDigits(input: string | null | undefined, country: string): string {
  const digits = (input ?? "").replace(/\D/g, "").slice(0, 20);
  if (!digits) return "";
  const c = (country ?? "").trim().toUpperCase();
  let dial = "";
  try { dial = getCountryCallingCode(c as CountryCode); } catch { /* unknown country */ }
  try {
    const parsed = parsePhoneNumberFromString(digits, c as CountryCode);
    const national = parsed ? String(parsed.nationalNumber) : "";
    if (
      parsed?.isValid() &&
      // Matched on the DIAL CODE, not the ISO country: +1 is Canada and the US
      // and a dozen Caribbean islands, +44 is Britain and Jersey. Requiring
      // parsed.country === c left every shared code unfixed — a US number
      // pasted into a Canadian field still stored "+1" + "1212…".
      String(parsed.countryCallingCode) === dial &&
      // NEVER longer than what was typed. libphonenumber expands a short local
      // entry to a full national number in territories with a fixed area code
      // (Trinidad, Jersey, Cayman and 14 others): half way through typing a
      // real number, "8682911" came back as "8688682911" and was written into
      // the box under the cursor, so the rest was typed onto a doubled area
      // code. Reducing a number can only ever shorten it; growing one is always
      // the guess, never the correction.
      national.length <= digits.length
    ) {
      return national;
    }
  } catch {
    /* fall through to the literal reading */
  }
  // A leading 0 is a trunk prefix almost everywhere and must come off, or the
  // country code is prefixed onto it. In Benin, Congo, Cote d'Ivoire and Gabon
  // it is part of the number itself, and stripping it stored a different line —
  // so the country's own example number decides.
  return (keepsLeadingZero(c) ? digits : digits.replace(/^0+/, "")).slice(0, 15);
}

/** A country-specific example national number with the trunk 0 stripped, to match
 *  the +code-prefixed local field (e.g. PK → "301 2345678"). "" if unavailable. */
export function phoneExample(country: string): string {
  const c = (country ?? "").trim().toUpperCase();
  try {
    const ex = getExampleNumber(c as CountryCode, examples);
    return ex ? ex.formatNational().replace(/^0/, "").trim() : "";
  } catch {
    return "";
  }
}
