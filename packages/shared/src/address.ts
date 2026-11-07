/**
 * Fictional address policy for The Small Web.
 *
 * - Case-insensitive (stored lowercase)
 * - Leading/trailing whitespace stripped
 * - URL fragments (#...) discarded
 * - Query strings (?) discarded
 * - Optional single path segment allowed: host.zz/path
 * - Host must look like a fictional TLD hostname (labels + final .zz)
 * - No schemes (http://), no ports, no IPs
 */

export type AddressValidationResult =
  | { ok: true; address: string }
  | { ok: false; error: string };

const ADDRESS_RE =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.zz(?:\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)?$/;

export function normalizeAddress(raw: string): AddressValidationResult {
  if (typeof raw !== "string") {
    return { ok: false, error: "Address must be a string" };
  }

  let value = raw.trim().toLowerCase();

  if (!value) {
    return { ok: false, error: "Address is required" };
  }

  // Reject real URL schemes and protocol-relative URLs.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
    return { ok: false, error: "Addresses must not include a URL scheme" };
  }

  // Drop fragment and query — they are not part of the site identity.
  const hashIndex = value.indexOf("#");
  if (hashIndex >= 0) value = value.slice(0, hashIndex);
  const queryIndex = value.indexOf("?");
  if (queryIndex >= 0) value = value.slice(0, queryIndex);

  value = value.trim().replace(/\/+$/, "");

  if (!value) {
    return { ok: false, error: "Address is required" };
  }

  if (value.length > 128) {
    return { ok: false, error: "Address is too long" };
  }

  if (!ADDRESS_RE.test(value)) {
    return {
      ok: false,
      error:
        "Address must look like host.zz or host.zz/path using letters, digits, and hyphens",
    };
  }

  return { ok: true, address: value };
}

export function isValidAddress(raw: string): boolean {
  return normalizeAddress(raw).ok;
}
